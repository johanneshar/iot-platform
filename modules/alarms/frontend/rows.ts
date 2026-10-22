import type { LineAlarm } from '@iot/module-sdk';
import type { AlarmClass, AlarmOccurrence } from '../shared/alarm-history';

export type AlarmFilter = 'all' | AlarmClass;

export interface AlarmRow {
  key: string;
  machineId: string;
  alarmId: string;
  class: AlarmClass;
  text: AlarmOccurrence['text'];
  raisedAt: string;
  /** `null` = steht noch an */
  clearedAt: string | null;
  acknowledgedBy: string | null;
  acknowledged: boolean;
}

/**
 * Anstehende Alarme kommen live aus dem Datenkern des Core, gegangene aus dem Verlauf des Moduls. Offene
 * Einträge des Verlaufs ohne Gegenstück im Datenkern werden nicht gezeigt – der Core ist maßgeblich.
 */
export function mergeAlarms(
  active: readonly LineAlarm[],
  history: readonly AlarmOccurrence[],
): AlarmRow[] {
  const rows: AlarmRow[] = active.map((a) => ({
    key: `active-${a.machineId}-${a.alarmId}`,
    machineId: a.machineId,
    alarmId: a.alarmId,
    class: a.class,
    text: a.text ?? null,
    raisedAt: a.raisedAt,
    clearedAt: null,
    acknowledged: a.acknowledged,
    acknowledgedBy: a.acknowledgedBy,
  }));
  for (const h of history) {
    if (h.clearedAt === null) continue;
    rows.push({
      key: `history-${String(h.id)}`,
      machineId: h.machineId,
      alarmId: h.alarmId,
      class: h.class,
      text: h.text,
      raisedAt: h.raisedAt,
      clearedAt: h.clearedAt,
      acknowledged: h.acknowledgedAt !== null,
      acknowledgedBy: h.acknowledgedBy,
    });
  }
  return rows.sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));
}

export const filterAlarms = (rows: readonly AlarmRow[], filter: AlarmFilter): AlarmRow[] =>
  filter === 'all' ? [...rows] : rows.filter((r) => r.class === filter);
