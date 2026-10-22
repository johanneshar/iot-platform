import {
  BATCH_PAUSE_MS,
  BATCH_RUN_MS,
  buildLines,
  RUN_PHASE_MS,
  STOP_PHASE_MS,
  type SimLine,
  type SimMachine,
} from './config';
import {
  activeAlarmsMessage,
  alarmEvent,
  batchEvent,
  countersFor,
  type CounterBase,
  local,
  stateChange,
  startupMessages,
  valuesMessage,
  type Outgoing,
} from './messages';

export type Publish = (outgoing: Outgoing) => void;

export interface SimulatorOptions {
  /** Takt der Zähler (Spezifikation: Vorschlag 5 s) */
  countersIntervalMs?: number;
  /** Takt der Prozesswerte */
  valuesIntervalMs?: number;
  /** Zustandswechsel stehender Maschinen (O-24); aus = Schnappschuss wie im Mockup */
  cycle?: boolean;
  /** Batch-Zyklus (M6); aus = nur der Batch aus dem Mockup */
  batchCycle?: boolean;
  /** Laufzeit und Pause im Batch-Zyklus (Standard: BATCH_RUN_MS, BATCH_PAUSE_MS) */
  batchRunMs?: number;
  batchPauseMs?: number;
  /** Uhr – in Tests ersetzbar */
  now?: () => Date;
}

interface Runtime {
  machine: SimMachine;
  state: SimMachine['state'];
  reason: string | null;
  /** produzierte Stück seit Start (Kommazahl, gerundet wird beim Senden) */
  produced: number;
  lastTick: number;
  phaseStart: number;
  /** Zählerstand nach dem letzten Reset; ohne Angabe die Stände aus dem Mockup */
  counterBase?: CounterBase;
}

interface LineBatch {
  line: SimLine;
  batchId: string;
  startedAt: Date;
  targetQuantity: number;
  running: boolean;
  /** Beginn der aktuellen Phase (Lauf oder Pause) */
  since: number;
}

/** Nächste Batchnummer: letzte Zahl um eins erhöht (B-2026-1042 → B-2026-1043). */
export const nextBatchId = (id: string) =>
  id.replace(/(\d+)(?!.*\d)/, (n) => String(Number(n) + 1).padStart(n.length, '0'));

/** Erzeugt die Daten der Beispiellinien (Mockup und Flexfill) und gibt sie über `publish` aus. */
export class Simulator {
  readonly lines: SimLine[] = buildLines();
  private timers: ReturnType<typeof setInterval>[] = [];
  private runtimes: Runtime[] = [];
  private batches: LineBatch[] = [];
  /** anstehende Alarme mit Zeitpunkt des Kommens */
  private readonly active = new Map<
    string,
    { machine: SimMachine; alarm: SimMachine['alarms'][number]; at: Date }
  >();

  constructor(
    private readonly publish: Publish,
    private readonly options: SimulatorOptions = {},
  ) {}

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  private get machines() {
    return this.lines.flatMap((line) => line.machines);
  }

  start(): void {
    const now = this.now();
    this.runtimes = this.machines.map((machine) => ({
      machine,
      state: machine.state,
      reason: machine.reason,
      produced: 0,
      lastTick: now.getTime(),
      phaseStart: now.getTime(),
    }));
    for (const machine of this.machines) {
      startupMessages(machine, now).forEach(this.publish);
      for (const alarm of machine.alarms.filter((a) => a.active)) {
        this.active.set(`${machine.id}/${alarm.alarmId}`, {
          machine,
          alarm,
          at: local(alarm.time, now),
        });
      }
    }

    this.timers.push(
      setInterval(() => {
        this.tickCounters();
      }, this.options.countersIntervalMs ?? 5_000),
      setInterval(() => {
        this.tickValues();
      }, this.options.valuesIntervalMs ?? 10_000),
    );
    if (this.options.batchCycle ?? true) {
      this.batches = this.lines
        .map((line) => ({ line, batch: line.machines.find((m) => m.batch)?.batch }))
        .filter((x) => x.batch !== undefined)
        .map(({ line, batch }) => ({
          line,
          batchId: batch?.id ?? '',
          startedAt: local(batch?.start ?? '00:00', now),
          targetQuantity: batch?.targetQuantity ?? 0,
          running: true,
          since: now.getTime(),
        }));
      this.timers.push(
        setInterval(() => {
          this.tickBatches();
        }, 1_000),
      );
    }
    if (this.options.cycle ?? true) {
      this.timers.push(
        setInterval(() => {
          this.tickCycle();
        }, 1_000),
      );
    }
  }

  private rate(runtime: Runtime): number {
    if (runtime.state !== 'Execute') return 0;
    return runtime.machine.cycle ? runtime.machine.cycle.runRate : runtime.machine.rate;
  }

  /** Produktion bis jetzt fortschreiben – mit der Leistung des aktuellen Zustands. */
  private advance(runtime: Runtime, at: number): void {
    runtime.produced += (this.rate(runtime) * (at - runtime.lastTick)) / 60_000;
    runtime.lastTick = at;
  }

  tickCounters(): void {
    const now = this.now();
    for (const runtime of this.runtimes) {
      this.advance(runtime, now.getTime());
      this.publish(countersFor(runtime.machine, runtime.produced, now, runtime.counterBase));
    }
  }

  tickValues(): void {
    const now = this.now();
    for (const machine of this.machines) {
      const message = valuesMessage(machine, now);
      if (message) this.publish(message);
    }
  }

  /** Stehende Maschinen: 1 min Zustand aus dem Mockup, 9 min Execute (O-24). */
  tickCycle(): void {
    const now = this.now();
    for (const runtime of this.runtimes) {
      const { machine } = runtime;
      if (!machine.cycle) continue;
      const running = runtime.state === 'Execute';
      const phase = running ? RUN_PHASE_MS : STOP_PHASE_MS;
      if (now.getTime() - runtime.phaseStart < phase) continue;

      this.advance(runtime, now.getTime());
      runtime.phaseStart = now.getTime();
      runtime.state = running ? machine.state : 'Execute';
      runtime.reason = running ? machine.reason : null;
      this.publish(stateChange(machine, runtime.state, runtime.reason, now));
      // Der Alarm zum Stillstand kommt und geht mit ihm
      for (const alarm of machine.alarms.filter((a) => a.active)) {
        this.publish(alarmEvent(machine, alarm, running ? 'raised' : 'cleared', now));
        const key = `${machine.id}/${alarm.alarmId}`;
        if (running) this.active.set(key, { machine, alarm, at: now });
        else this.active.delete(key);
      }
      if (machine.alarms.some((a) => a.active)) {
        const own = [...this.active.values()].filter((a) => a.machine === machine);
        this.publish(activeAlarmsMessage(machine, own, now));
      }
    }
  }

  /** Batch-Zyklus (M6): Ende nach BATCH_RUN_MS, neuer Batch nach BATCH_PAUSE_MS mit Zählerreset. */
  tickBatches(): void {
    const now = this.now();
    for (const b of this.batches) {
      const elapsed = now.getTime() - b.since;
      const machines = b.line.machines.filter((m) => m.batch);
      if (b.running && elapsed >= (this.options.batchRunMs ?? BATCH_RUN_MS)) {
        for (const m of machines) {
          const out = batchEvent(m, 'ended', b, now);
          if (out) this.publish(out);
        }
        b.running = false;
        b.since = now.getTime();
      } else if (!b.running && elapsed >= (this.options.batchPauseMs ?? BATCH_PAUSE_MS)) {
        b.batchId = nextBatchId(b.batchId);
        b.startedAt = now;
        // Annahme: Sollmenge = was die Linie in einem Batch-Lauf schafft (Leistung der ersten Maschine)
        const first = machines[0];
        const rate = first ? (first.cycle?.runRate ?? first.rate) : 0;
        b.targetQuantity =
          Math.round((rate * (this.options.batchRunMs ?? BATCH_RUN_MS)) / 60_000 / 100) * 100 ||
          100;
        b.running = true;
        b.since = now.getTime();
        for (const runtime of this.runtimes.filter((r) => machines.includes(r.machine))) {
          // Zähler der Maschine beginnen mit dem neuen Batch bei null
          this.advance(runtime, now.getTime());
          runtime.produced = 0;
          runtime.counterBase = { good: 0, bad: 0, resetAt: now };
          this.publish(countersFor(runtime.machine, 0, now, runtime.counterBase));
        }
        for (const m of machines) {
          const out = batchEvent(m, 'started', b, now);
          if (out) this.publish(out);
        }
      }
    }
  }

  stop(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }
}
