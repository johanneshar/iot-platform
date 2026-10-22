/** Zählerstand mit Zeitpunkt der Quelle (UTC, ms) – kumulativ seit `resetAt` (Spezifikation: counters). */
export interface CounterReading {
  ts: number;
  good: number;
  total: number;
  resetAt: string;
}

export type CounterStep =
  /** normal gezählt */
  | 'count'
  /** Zähler wurde zwischen den Ständen zurückgesetzt: der neue Stand zählt seit dem Reset */
  | 'reset'
  /** neuer Bezugspunkt ohne Menge: Rücksprung ohne neuen Reset, Reset vor dem letzten Stand */
  | 'rebase'
  /** unplausibler Sprung (mehr, als die Maschine schaffen kann): nicht gezählt */
  | 'implausible';

/** Spielraum über der Sollleistung und Mindestmenge, bevor ein Sprung als unplausibel gilt */
const RATE_TOLERANCE = 1.5;
const MIN_ALLOWANCE = 10;

/**
 * Menge zwischen zwei Zählerständen. Rücksprünge und unmögliche Sprünge werden nicht gezählt – sie
 * entstehen z. B. durch einen Neustart der Quelle oder zwei Quellen mit derselben Kennung.
 * `nominalRate`: Sollleistung in Stück pro Minute; ohne Angabe keine Plausibilitätsprüfung.
 */
export function counterStep(
  previous: CounterReading,
  next: CounterReading,
  nominalRate: number | null,
): { good: number; total: number; step: CounterStep } {
  const plausible = (total: number, sinceMs: number) =>
    nominalRate === null ||
    total <= nominalRate * RATE_TOLERANCE * (Math.max(0, sinceMs) / 60_000) + MIN_ALLOWANCE;

  if (next.resetAt !== previous.resetAt) {
    const resetAt = Date.parse(next.resetAt);
    // Reset nach dem letzten Stand: alles seit dem Reset ist neu produziert
    if (resetAt >= previous.ts && plausible(next.total, next.ts - resetAt)) {
      return { good: next.good, total: next.total, step: 'reset' };
    }
    return { good: 0, total: 0, step: 'rebase' };
  }
  const good = next.good - previous.good;
  const total = next.total - previous.total;
  if (total < 0 || good < 0) return { good: 0, total: 0, step: 'implausible' };
  if (!plausible(total, next.ts - previous.ts)) return { good: 0, total: 0, step: 'implausible' };
  return { good, total, step: 'count' };
}
