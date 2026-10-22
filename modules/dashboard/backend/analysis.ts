import { counterStep, type PackMLState } from '@iot/module-sdk/data';
import type {
  AlarmStat,
  Bucket,
  MachineAnalysis,
  StateSegment,
  Stop,
  ValueSeries,
} from '../shared/analysis';
import type { MachineHistory } from './history-store';

export interface AnalysisInput {
  machineId: string;
  period: string;
  from: number;
  to: number;
  /** geplante Produktionszeit aus dem Schichtmodell */
  planned: readonly { start: number; end: number }[];
  buckets: readonly { start: number; end: number }[];
  history: MachineHistory;
}

/** Höchstens so viele Punkte je Prozesswert-Verlauf */
const MAX_POINTS = 60;
/** Ein Alarm gehört zum Stillstand, wenn er bis so lange vor dessen Beginn kam */
const ALARM_LEAD_MS = 60_000;
const MAX_STOPS = 50;

const iso = (ms: number) => new Date(ms).toISOString();
const overlap = (a0: number, a1: number, b0: number, b1: number) =>
  Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

interface Segment {
  state: PackMLState;
  reason: string | null;
  start: number;
  end: number;
}

/** Zustandsabschnitte im Zeitraum aus dem letzten Wechsel davor und den Wechseln darin. */
export function segmentsOf(history: MachineHistory, from: number, to: number): Segment[] {
  const result: Segment[] = [];
  history.states.forEach((s, i) => {
    const next = history.states[i + 1];
    const start = Math.max(from, s.ts);
    const end = Math.min(to, next ? next.ts : to);
    if (end > start) result.push({ state: s.state, reason: s.reason, start, end });
  });
  return result;
}

const executeIn = (segments: readonly Segment[], start: number, end: number) =>
  segments
    .filter((s) => s.state === 'Execute')
    .reduce((sum, s) => sum + overlap(s.start, s.end, start, end), 0);

/** Auswertung einer Maschine im Zeitraum (E-27, Detailseite M5a). */
export function analyse(input: AnalysisInput): MachineAnalysis {
  const { from, to, history } = input;
  const segments = segmentsOf(history, from, to);
  const nominal = history.identity?.nominalRate ?? null;

  // Mengen je Abschnitt aus den Zählerständen
  const produced = input.buckets.map(() => ({ good: 0, total: 0 }));
  let good = 0;
  let total = 0;
  let implausible = 0;
  history.counters.forEach((b, i) => {
    const a = history.counters[i - 1];
    if (!a || b.ts < from) return;
    const d = counterStep(a, b, nominal);
    if (d.step === 'implausible') implausible += 1;
    good += d.good;
    total += d.total;
    const k = input.buckets.findIndex((x) => b.ts >= x.start && b.ts <= x.end);
    const slot = produced[k];
    if (slot) {
      slot.good += d.good;
      slot.total += d.total;
    }
  });

  // Kennzahlen nur über die Zeit, für die Zählerstände vorliegen (z. B. erst seit dem Start des Moduls)
  const firstCounter = history.counters[0];
  const observedFrom = firstCounter ? Math.max(from, firstCounter.ts) : to;
  const planned = input.planned
    .map((p) => ({ start: Math.max(p.start, observedFrom), end: p.end }))
    .filter((p) => p.end > p.start);
  const plannedMs = planned.reduce((sum, p) => sum + (p.end - p.start), 0);
  const executeMs = planned.reduce((sum, p) => sum + executeIn(segments, p.start, p.end), 0);
  const availability = plannedMs > 0 ? executeMs / plannedMs : null;
  const performance = nominal && executeMs > 0 ? total / (nominal * (executeMs / 60_000)) : null;
  const quality = total > 0 ? good / total : null;
  const oee =
    availability === 0
      ? 0
      : availability !== null && performance !== null && quality !== null
        ? availability * performance * quality
        : null;

  const stateTotals: Partial<Record<PackMLState, number>> = {};
  for (const s of segments) stateTotals[s.state] = (stateTotals[s.state] ?? 0) + s.end - s.start;

  const stops: Stop[] = segments
    .filter((s) => s.state !== 'Execute')
    .map((s) => {
      const candidates = history.alarms.filter(
        (a) => a.raisedAt >= s.start - ALARM_LEAD_MS && a.raisedAt < s.end && a.class !== 'info',
      );
      const alarm = candidates.find((a) => a.class === 'fault') ?? candidates[0];
      return {
        state: s.state,
        reason: s.reason,
        start: iso(s.start),
        end: iso(s.end),
        durationMs: s.end - s.start,
        alarm: alarm ? { alarmId: alarm.alarmId, text: alarm.text } : null,
      };
    })
    .sort((a, b) => b.start.localeCompare(a.start))
    .slice(0, MAX_STOPS);

  const buckets: Bucket[] = input.buckets.map((x, k) => {
    const p = produced[k] ?? { good: 0, total: 0 };
    const run = executeIn(segments, Math.max(x.start, observedFrom), x.end);
    return {
      start: iso(x.start),
      end: iso(x.end),
      rate: run > 0 ? p.total / (run / 60_000) : null,
      rejectShare: p.total > 0 ? (p.total - p.good) / p.total : null,
      total: p.total,
    };
  });

  // Prozesswerte: nur Schlüssel aus dem Wertekatalog (Spezifikation: meta)
  const pointMs = Math.max(60_000, Math.ceil((to - from) / MAX_POINTS / 60_000) * 60_000);
  const values: ValueSeries[] = (history.meta?.values ?? []).map((def) => {
    const rows = history.values.filter((v) => v.key === def.key);
    const groups = new Map<number, { sum: number; n: number }>();
    for (const r of rows) {
      const slot = Math.floor(r.minute / pointMs) * pointMs;
      const g = groups.get(slot) ?? { sum: 0, n: 0 };
      g.sum += r.sum;
      g.n += r.n;
      groups.set(slot, g);
    }
    const sum = rows.reduce((s, r) => s + r.sum, 0);
    const n = rows.reduce((s, r) => s + r.n, 0);
    const last = rows.at(-1);
    return {
      key: def.key,
      name: def.name,
      unit: def.unit,
      gxp: def.gxp,
      min: def.min ?? null,
      max: def.max ?? null,
      last: last ? last.sum / last.n : null,
      avg: n > 0 ? sum / n : null,
      low: rows.length ? Math.min(...rows.map((r) => r.lo)) : null,
      high: rows.length ? Math.max(...rows.map((r) => r.hi)) : null,
      points: [...groups.entries()].map(([ts, g]) => ({ ts: iso(ts), avg: g.sum / g.n })),
    };
  });

  const stats = new Map<string, AlarmStat>();
  let faultDowntimeMs = 0;
  for (const a of history.alarms) {
    const duration = overlap(a.raisedAt, a.clearedAt ?? to, from, to);
    if (a.class === 'fault') faultDowntimeMs += duration;
    const stat = stats.get(a.alarmId) ?? {
      alarmId: a.alarmId,
      text: a.text,
      class: a.class,
      count: 0,
      durationMs: 0,
    };
    stat.count += 1;
    stat.durationMs += duration;
    stats.set(a.alarmId, stat);
  }

  return {
    machineId: input.machineId,
    period: input.period,
    from: iso(from),
    to: iso(to),
    observedFrom: iso(observedFrom),
    implausibleCounters: implausible,
    kpis: {
      availability,
      performance,
      quality,
      oee,
      good,
      bad: total - good,
      total,
      executeMs,
      plannedMs,
      nominalRate: nominal,
    },
    stateTotals,
    segments: segments.map((s): StateSegment => ({
      state: s.state,
      reason: s.reason,
      start: iso(s.start),
      end: iso(s.end),
    })),
    stops,
    bucketMs: input.buckets[0] ? input.buckets[0].end - input.buckets[0].start : 0,
    buckets,
    values,
    alarms: {
      count: history.alarms.length,
      faults: history.alarms.filter((a) => a.class === 'fault').length,
      faultDowntimeMs,
      top: [...stats.values()]
        .sort((a, b) => b.durationMs - a.durationMs || b.count - a.count)
        .slice(0, 5),
    },
  };
}
