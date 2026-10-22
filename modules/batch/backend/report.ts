import { counterStep } from '@iot/module-sdk/data';
import type { LineConfig } from '@iot/module-sdk/server';
import { createHash } from 'node:crypto';
import type {
  AuditRef,
  BatchReport,
  MachineCounts,
  ReportMachine,
  ValueStats,
} from '../shared/batch';
import { GAP_MS, type BatchStore } from './store';

const iso = (ms: number) => new Date(ms).toISOString();

/** Mengen einer Maschine im Batch aus ihren Zählerständen (plausibel geprüft, counterStep). */
export function countsOf(store: BatchStore, batchId: string, machineId: string): MachineCounts {
  const rows = store.counterRows(batchId, machineId);
  const nominal = store.identityOf(machineId)?.nominalRate ?? null;
  let good = 0;
  let total = 0;
  let implausible = 0;
  rows.forEach((b, i) => {
    const a = rows[i - 1];
    if (!a) return;
    const step = counterStep(a, b, nominal);
    if (step.step === 'implausible') implausible += 1;
    good += step.good;
    total += step.total;
  });
  return { machineId, good, bad: total - good, total, implausible };
}

function valueStats(store: BatchStore, batchId: string, machineId: string): ValueStats[] {
  const rows = store.valueRows(batchId, machineId);
  return (store.metaOf(machineId)?.values ?? [])
    .filter((def) => def.gxp)
    .map((def) => {
      const own = rows.filter((r) => r.key === def.key);
      const values = own.map((r) => r.value);
      const min = def.min ?? null;
      const max = def.max ?? null;
      return {
        key: def.key,
        name: def.name,
        unit: def.unit,
        min,
        max,
        count: own.length,
        low: values.length ? Math.min(...values) : null,
        high: values.length ? Math.max(...values) : null,
        avg: values.length ? values.reduce((s, v) => s + v, 0) / values.length : null,
        outOfLimits: values.filter((v) => (min !== null && v < min) || (max !== null && v > max))
          .length,
        uncertain: own.filter((r) => r.quality === 'uncertain').length,
        bad: own.filter((r) => r.quality === 'bad').length,
        first: own[0] ? iso(own[0].ts) : null,
        last: own.at(-1) ? iso(own.at(-1)?.ts ?? 0) : null,
      };
    });
}

/**
 * Bericht nach Batchende und Linienräumung (ADR-011): alle Maschinen des Batches mit Mengen, GxP-Werten,
 * Alarmen und Datenlücken. Wird eingefroren; der Hash bindet die Signaturen an genau diesen Inhalt.
 */
export function buildReport(
  store: BatchStore,
  batchId: string,
  line: LineConfig,
  clearance: AuditRef,
  now = new Date(),
): BatchReport {
  const batch = store.get(batchId);
  if (!batch?.endedAt) throw new Error(`Batch ${batchId} ist nicht beendet`);
  const machines: ReportMachine[] = batch.machines.map((machineId) => {
    const identity = store.identityOf(machineId);
    const window = store.machineWindow(batchId, machineId);
    const gaps = store
      .gapRows(batchId, machineId)
      .map((g) => ({ from: iso(g.from), to: iso(g.to) }));
    // Lücke bis zum Ende: letzte Nachricht deutlich vor dem Batchende
    const last = store.lastMessage(machineId);
    if (window.endedAt !== null && last !== null && window.endedAt - last > GAP_MS) {
      gaps.push({ from: iso(last), to: iso(window.endedAt) });
    }
    return {
      machineId,
      name: identity?.type ?? machineId,
      source: identity?.source ?? null,
      counts: countsOf(store, batchId, machineId),
      events: store.events(batchId, machineId).map((e) => ({ event: e.event, ts: iso(e.ts) })),
      values: valueStats(store, batchId, machineId),
      alarms: store.alarmRows(batchId, machineId).map((a) => ({
        alarmId: a.alarmId,
        class: a.class,
        text: a.text,
        raisedAt: iso(a.raisedAt),
        clearedAt: a.clearedAt === null ? null : iso(a.clearedAt),
      })),
      gaps,
    };
  });
  return {
    format: 'iot-batch-report/1',
    batchId,
    line: { id: line.id, name: line.name, timeZone: line.timeZone },
    productName: batch.productName,
    targetQuantity: batch.targetQuantity,
    recipe: batch.recipe,
    formatParts: batch.formatParts,
    startedAt: batch.startedAt,
    endedAt: batch.endedAt,
    lineRelease: batch.lineRelease,
    clearance,
    machines,
    generatedAt: now.toISOString(),
  };
}

/** JSON mit sortierten Schlüsseln – gleicher Inhalt, gleicher Text, gleicher Hash. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Hash des Berichts, wie er signiert wird: `sha256:<hex>`. */
export const reportHash = (report: BatchReport): string =>
  `sha256:${createHash('sha256').update(canonical(report)).digest('hex')}`;
