import type { LocalizedText } from '@iot/interface-schema';
import type { LineConfig } from '@iot/module-sdk/server';
import { currentShift, localTimeToUtc } from '@iot/module-sdk/time';
import type { PeriodOption } from '../shared/analysis';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const UNITS = {
  min: { ms: MINUTE, de: ['Minute', 'Minuten'], en: ['minute', 'minutes'] },
  h: { ms: HOUR, de: ['Stunde', 'Stunden'], en: ['hour', 'hours'] },
  d: { ms: DAY, de: ['Tag', 'Tage'], en: ['day', 'days'] },
} as const;

export interface Period extends PeriodOption {
  /** Länge; `null` = laufende Schicht */
  ms: number | null;
}

/**
 * Zeiträume aus der Konfiguration (E-37), z. B. `1h,shift,24h,7d`: `shift` = laufende Schicht, sonst
 * Zahl mit `min`, `h` oder `d`.
 */
export function parsePeriods(spec: string): Period[] {
  const periods = spec
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((id): Period => {
      if (id === 'shift') return { id, ms: null, label: { de: 'Schicht', en: 'Shift' } };
      const match = /^(\d+)(min|h|d)$/.exec(id);
      const n = Number(match?.[1]);
      const unit = match?.[2] as keyof typeof UNITS | undefined;
      if (!unit || !Number.isInteger(n) || n < 1) {
        throw new Error(`Zeitraum „${id}“: erwartet shift oder z. B. 30min, 1h, 7d`);
      }
      const u = UNITS[unit];
      const label: LocalizedText = {
        de: `${String(n)} ${n === 1 ? u.de[0] : u.de[1]}`,
        en: `${String(n)} ${n === 1 ? u.en[0] : u.en[1]}`,
      };
      return { id, ms: n * u.ms, label };
    });
  if (periods.length === 0) throw new Error('Mindestens ein Zeitraum erforderlich');
  return periods;
}

/** Aufbewahrung des Verlaufs: der längste Zeitraum plus ein Tag Reserve. */
export const retentionMs = (periods: readonly Period[]): number =>
  Math.max(...periods.map((p) => p.ms ?? DAY)) + DAY;

/** Zeitraum bis jetzt; die Schicht beginnt mit der laufenden Schicht (ohne Schicht: die letzten 8 h). */
export function windowOf(period: Period, line: LineConfig, now: Date): { from: Date; to: Date } {
  if (period.ms !== null) return { from: new Date(now.getTime() - period.ms), to: now };
  const shift = currentShift(line.shifts, line.timeZone, now);
  return { from: shift?.start ?? new Date(now.getTime() - 8 * HOUR), to: now };
}

/** Abschnitte der Diagramme: bis 2 h je 5 min, bis 2 Tage je Stunde, darüber je Tag (Ortszeit). */
export function bucketsOf(
  from: Date,
  to: Date,
  timeZone: string,
): { start: number; end: number }[] {
  const length = to.getTime() - from.getTime();
  const result: { start: number; end: number }[] = [];
  if (length > 2 * DAY) {
    let start = localTimeToUtc('00:00', timeZone, from).getTime();
    while (start < to.getTime()) {
      const next = localTimeToUtc('00:00', timeZone, new Date(start + DAY + 2 * HOUR)).getTime();
      result.push({ start: Math.max(start, from.getTime()), end: Math.min(next, to.getTime()) });
      start = next;
    }
    return result;
  }
  const size = length <= 2 * HOUR ? 5 * MINUTE : HOUR;
  for (let start = Math.floor(from.getTime() / size) * size; start < to.getTime(); start += size) {
    result.push({
      start: Math.max(start, from.getTime()),
      end: Math.min(start + size, to.getTime()),
    });
  }
  return result;
}
