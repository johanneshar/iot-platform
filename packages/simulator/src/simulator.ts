import { buildLines, RUN_PHASE_MS, STOP_PHASE_MS, type SimLine, type SimMachine } from './config';
import {
  alarmEvent,
  countersFor,
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
  /**
   * Anstehende Alarme mit ihrem ursprünglichen Zeitstempel wiederholen (0 = aus). Alarme sind nicht
   * retained; so sieht auch ein später gestarteter Core oder ein Modul, was ansteht (O-25).
   */
  alarmRepeatMs?: number;
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
}

/** Erzeugt die Daten der Beispiellinien (Mockup und Flexfill) und gibt sie über `publish` aus. */
export class Simulator {
  readonly lines: SimLine[] = buildLines();
  private timers: ReturnType<typeof setInterval>[] = [];
  private runtimes: Runtime[] = [];
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
    const repeat = this.options.alarmRepeatMs ?? 30_000;
    if (repeat > 0) {
      this.timers.push(
        setInterval(() => {
          this.tickAlarms();
        }, repeat),
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
      this.publish(countersFor(runtime.machine, runtime.produced, now));
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
    }
  }

  /** Anstehende Alarme erneut melden – gleiche Nachricht, gleicher Zeitstempel der Quelle. */
  tickAlarms(): void {
    for (const { machine, alarm, at } of this.active.values()) {
      this.publish(alarmEvent(machine, alarm, 'raised', at));
    }
  }

  stop(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }
}
