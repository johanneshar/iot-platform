import {
  currentRate,
  machinesInOrder,
  type LineSnapshot,
  type MachineSnapshot,
} from '@iot/module-sdk';

/** Mindestdauer der Beobachtung, bevor Kennzahlen angezeigt werden */
const MIN_WINDOW_MS = 10_000;

export interface Kpis {
  /** 0–1 */
  availability: number | null;
  performance: number | null;
  quality: number | null;
  oee: number | null;
  /** Ausschussanteil 0–1 */
  rejectShare: number | null;
  /** Gutteile pro Stunde */
  goodPerHour: number | null;
  /** Stück pro Minute in der letzten Minute */
  rate: number | null;
  nominalRate: number | null;
}

const EMPTY: Kpis = {
  availability: null,
  performance: null,
  quality: null,
  oee: null,
  rejectShare: null,
  goodPerHour: null,
  rate: null,
  nominalRate: null,
};

/** Zeit in `Execute` im Zeitraum [from, to] aus dem Zustandsverlauf. */
export function executeMs(machine: MachineSnapshot, from: number, to: number): number {
  const periods = machine.history.states.length
    ? machine.history.states
    : machine.state
      ? [{ state: machine.state.state, since: machine.state.since }]
      : [];
  let total = 0;
  periods.forEach((period, index) => {
    const start = Math.max(from, new Date(period.since).getTime());
    const next = periods[index + 1];
    const end = Math.min(to, next ? new Date(next.since).getTime() : to);
    if (period.state === 'Execute' && end > start) total += end - start;
  });
  return total;
}

/**
 * OEE einer Maschine nach E-27 (ISO 22400 / VDMA 66412) im Beobachtungszeitraum der Schicht:
 * Verfügbarkeit = Zeit in Execute ÷ geplante Zeit, Leistung = Menge ÷ (Sollleistung × Zeit in Execute),
 * Qualität = Gutteile ÷ Menge.
 */
export function machineKpis(machine: MachineSnapshot, now: Date): Kpis {
  const baseline = machine.history.counterBaseline;
  const nominal = machine.identity?.nominalRate ?? null;
  const rate = currentRate(machine, now);
  if (!baseline || !machine.counters || !nominal) return { ...EMPTY, rate, nominalRate: nominal };

  const from = new Date(baseline.ts).getTime();
  const to = now.getTime();
  const plannedMs = to - from;
  if (plannedMs < MIN_WINDOW_MS) return { ...EMPTY, rate, nominalRate: nominal };

  const runMs = executeMs(machine, from, to);
  const total = machine.counters.total - baseline.total;
  const good = machine.counters.good - baseline.good;

  const availability = runMs / plannedMs;
  const performance = runMs > 0 ? total / (nominal * (runMs / 60_000)) : null;
  const quality = total > 0 ? good / total : null;
  const oee =
    availability === 0
      ? 0
      : performance !== null && quality !== null
        ? availability * performance * quality
        : null;

  return {
    availability,
    performance,
    quality,
    oee,
    rejectShare: quality === null ? null : 1 - quality,
    goodPerHour: good / (plannedMs / 3_600_000),
    rate,
    nominalRate: nominal,
  };
}

/** Maschine am Ende der Linie – ihre Gutteile zählen für die Linien-OEE (E-27). */
export function lineEnd(line: LineSnapshot): MachineSnapshot | null {
  return (
    machinesInOrder(line)
      .filter((m) => m.identity)
      .at(-1) ?? null
  );
}

/** Kennzahlen der Linie: Gutteile am Linienende ÷ (Sollleistung der Linie × geplante Zeit). */
export function lineKpis(line: LineSnapshot, now: Date): Kpis {
  const end = lineEnd(line);
  return end ? machineKpis(end, now) : EMPTY;
}
