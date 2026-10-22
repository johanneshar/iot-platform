import type { LineSnapshot, MachineSnapshot, PackMLState } from './types';

/** Aktuelle Leistung in Stück pro Minute aus den Zählerständen der letzten Minute; `null` ohne Daten. */
export function currentRate(machine: MachineSnapshot, now: Date, windowMs = 60_000): number | null {
  const samples = machine.history.recentCounters;
  const last = samples.at(-1);
  if (!last) return null;
  const from = now.getTime() - windowMs;
  const first = samples.find((s) => new Date(s.ts).getTime() >= from) ?? samples[0];
  if (!first || first === last) return null;
  const minutes = (new Date(last.ts).getTime() - new Date(first.ts).getTime()) / 60_000;
  if (minutes <= 0) return null;
  return Math.max(0, (last.total - first.total) / minutes);
}

const STOPPED: readonly PackMLState[] = ['Held', 'Aborted'];

const byPosition = (a: MachineSnapshot, b: MachineSnapshot) =>
  (a.identity?.position ?? Number.MAX_SAFE_INTEGER) -
  (b.identity?.position ?? Number.MAX_SAFE_INTEGER);

/** Maschinen in der Reihenfolge der Linie. */
export function machinesInOrder(line: LineSnapshot): MachineSnapshot[] {
  return [...line.machines].sort(byPosition);
}

/**
 * Engpass nach E-28: eine Maschine in `Held` oder `Aborted`; sonst die produzierende Maschine mit der
 * niedrigsten Leistung im Verhältnis zur Sollleistung.
 */
export function findBottleneck(line: LineSnapshot, now: Date): string | null {
  const ordered = machinesInOrder(line);
  const stopped = ordered.find((m) => m.state && STOPPED.includes(m.state.state));
  if (stopped) return stopped.machineId;

  let best: { id: string; ratio: number } | null = null;
  for (const machine of ordered) {
    if (machine.state?.state !== 'Execute' || !machine.identity) continue;
    const rate = currentRate(machine, now);
    if (rate === null) continue;
    const ratio = rate / machine.identity.nominalRate;
    if (!best || ratio < best.ratio) best = { id: machine.machineId, ratio };
  }
  return best?.id ?? null;
}

/** Zustand der Linie: steht eine Maschine (Held/Aborted), dieser; sonst Execute, wenn eine produziert. */
export function lineState(line: LineSnapshot): PackMLState | null {
  const ordered = machinesInOrder(line);
  const stopped = ordered.find((m) => m.state && STOPPED.includes(m.state.state));
  if (stopped?.state) return stopped.state.state;
  if (ordered.some((m) => m.state?.state === 'Execute')) return 'Execute';
  return ordered[0]?.state?.state ?? null;
}
