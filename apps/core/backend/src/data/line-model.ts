import {
  parseTopic,
  validateMessage,
  type DataByClass,
  type DataClass,
} from '@iot/interface-schema';
import {
  counterStep,
  type CounterSample,
  type DataQuality,
  type LineSnapshot,
  type MachineSnapshot,
} from '@iot/module-sdk/data';
import { currentShift, type ShiftDefinition } from '@iot/module-sdk/time';

const QUALITY_RANK: Record<DataQuality, number> = { good: 0, uncertain: 1, bad: 2 };
/** Zählerstände so lange für die aktuelle Leistung vorhalten */
const RECENT_MS = 3 * 60_000;

export interface LineModelOptions {
  lineId: string;
  timeZone: string;
  shifts: readonly ShiftDefinition[];
  oeeTarget: number | null;
  now?: () => Date;
}

type Listener = () => void;

const toSnapshot = (machine: MachineState): MachineSnapshot => {
  const snapshot: Partial<MachineState> = { ...machine };
  delete snapshot.qualityByClass;
  return snapshot as MachineSnapshot;
};

interface MachineState extends MachineSnapshot {
  qualityByClass: Partial<Record<DataClass, DataQuality>>;
}

/**
 * Kanonisches Linienmodell (Datenkern, E-08): übernimmt nur schemakonforme Nachrichten der eigenen Linie,
 * hält den letzten Stand je Maschine, die anstehenden Alarme und den Verlauf der laufenden Schicht.
 * Der Verlauf liegt im Speicher und beginnt nach einem Neustart neu (O-22).
 */
export class LineModel {
  private readonly machines = new Map<string, MachineState>();
  private readonly listeners = new Set<Listener>();
  private shiftStart: string | null = null;
  private readonly now: () => Date;

  constructor(private readonly options: LineModelOptions) {
    this.now = options.now ?? (() => new Date());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Verarbeitet eine MQTT-Nachricht; liefert `false`, wenn sie verworfen wurde. */
  apply(topic: string, payload: unknown): boolean {
    const parsed = parseTopic(topic);
    if (!parsed || parsed.lineId !== this.options.lineId) return false;
    const machine = this.machine(parsed.machineId);
    const result = validateMessage(parsed.dataClass, payload);
    if (!result.valid) {
      machine.invalidMessages += 1;
      this.emit();
      return false;
    }
    this.rollShift();
    const message = payload as { ts: string; quality: DataQuality; data: unknown };
    machine.lastMessageAt = message.ts;
    machine.qualityByClass[parsed.dataClass] = message.quality;
    machine.quality = Object.values(machine.qualityByClass).reduce<DataQuality>(
      (worst, q) => (QUALITY_RANK[q] > QUALITY_RANK[worst] ? q : worst),
      'good',
    );
    this.update(machine, parsed.dataClass, message.data as never, message.ts);
    this.emit();
    return true;
  }

  snapshot(): LineSnapshot {
    this.rollShift();
    const shift = currentShift(this.options.shifts, this.options.timeZone, this.now());
    return {
      lineId: this.options.lineId,
      shift: shift ? { start: shift.start.toISOString(), end: shift.end.toISOString() } : null,
      oeeTarget: this.options.oeeTarget,
      machines: [...this.machines.values()].map(toSnapshot),
    };
  }

  private machine(machineId: string): MachineState {
    let machine = this.machines.get(machineId);
    if (!machine) {
      machine = {
        machineId,
        identity: null,
        meta: null,
        state: null,
        counters: null,
        values: {},
        alarms: [],
        quality: 'good',
        lastMessageAt: null,
        invalidMessages: 0,
        implausibleCounters: 0,
        history: { states: [], counterBaseline: null, recentCounters: [] },
        qualityByClass: {},
      };
      this.machines.set(machineId, machine);
    }
    return machine;
  }

  /** Neue Schicht: Verlauf beginnt neu, der aktuelle Zustand gilt ab Schichtbeginn. */
  private rollShift(): void {
    const shift = currentShift(this.options.shifts, this.options.timeZone, this.now());
    const start = shift?.start.toISOString() ?? null;
    if (start === this.shiftStart) return;
    this.shiftStart = start;
    for (const m of this.machines.values()) {
      m.history.states = m.state && start ? [{ state: m.state.state, since: start }] : [];
      m.history.counterBaseline = m.counters && start ? this.sample(m.counters, start) : null;
    }
  }

  private sample(c: { good: number; bad?: number; total: number }, ts: string): CounterSample {
    return { ts, good: c.good, total: c.total, ...(c.bad === undefined ? {} : { bad: c.bad }) };
  }

  private update<C extends DataClass>(
    machine: MachineState,
    dataClass: C,
    data: DataByClass[C],
    ts: string,
  ): void {
    switch (dataClass) {
      case 'identity':
        machine.identity = data as DataByClass['identity'];
        break;
      case 'meta':
        machine.meta = data as DataByClass['meta'];
        break;
      case 'state': {
        const state = data as DataByClass['state'];
        // Beginn der Beobachtung frühestens mit Schichtbeginn
        const since = this.shiftStart && ts < this.shiftStart ? this.shiftStart : ts;
        machine.state = { ...state, since: ts };
        const last = machine.history.states.at(-1);
        if (last?.state !== state.state) machine.history.states.push({ state: state.state, since });
        break;
      }
      case 'counters': {
        const counters = data as DataByClass['counters'];
        const previous = machine.counters;
        // Menge seit dem letzten Stand prüfen (counterStep): Reset, Rücksprung oder unplausibler
        // Sprung verschieben Basis und letzte Stände so, dass nur echt Produziertes zählt
        if (previous) {
          const step = counterStep(
            { ...previous, ts: Date.parse(previous.ts) },
            { ...counters, ts: Date.parse(ts) },
            machine.identity?.nominalRate ?? null,
          );
          if (step.step !== 'count') {
            const counted = { good: step.good, total: step.total };
            const shift = (s: CounterSample): CounterSample => ({
              ...s,
              good: s.good + counters.good - previous.good - counted.good,
              total: s.total + counters.total - previous.total - counted.total,
              ...(s.bad === undefined
                ? {}
                : {
                    bad:
                      s.bad +
                      (counters.bad ?? 0) -
                      (previous.bad ?? 0) -
                      (counted.total - counted.good),
                  }),
            });
            const { history } = machine;
            if (history.counterBaseline) history.counterBaseline = shift(history.counterBaseline);
            history.recentCounters = history.recentCounters.map(shift);
            if (step.step === 'implausible') machine.implausibleCounters += 1;
          }
        }
        machine.counters = { ...counters, ts };
        const sample = this.sample(counters, ts);
        machine.history.counterBaseline ??= sample;
        const keepFrom = new Date(ts).getTime() - RECENT_MS;
        machine.history.recentCounters = [
          ...machine.history.recentCounters.filter((s) => new Date(s.ts).getTime() >= keepFrom),
          sample,
        ];
        break;
      }
      case 'values':
        for (const v of (data as DataByClass['values']).values)
          machine.values[v.key] = { value: v.value, ts };
        break;
      case 'alarms': {
        const alarm = data as DataByClass['alarms'];
        const others = machine.alarms.filter((a) => a.alarmId !== alarm.alarmId);
        const existing = machine.alarms.find((a) => a.alarmId === alarm.alarmId);
        if (alarm.event === 'raised' && existing) {
          // Wiederholung eines anstehenden Alarms (O-25): Zeitpunkt und Quittierung bleiben
        } else if (alarm.event === 'raised') {
          machine.alarms = [
            ...others,
            {
              alarmId: alarm.alarmId,
              class: alarm.class,
              ...(alarm.textKey ? { textKey: alarm.textKey } : {}),
              ...(alarm.text ? { text: alarm.text } : {}),
              ...(alarm.subsystem ? { subsystem: alarm.subsystem } : {}),
              raisedAt: ts,
              acknowledged: false,
              acknowledgedBy: null,
            },
          ];
        } else if (alarm.event === 'cleared') {
          machine.alarms = others;
        } else if (existing) {
          machine.alarms = [
            ...others,
            { ...existing, acknowledged: true, acknowledgedBy: alarm.user },
          ];
        }
        break;
      }
      case 'batch':
        // Batch-Ereignisse wertet das Modul Batch-Reporting aus (M6)
        break;
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
