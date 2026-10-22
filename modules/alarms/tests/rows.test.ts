import type { LineAlarm } from '@iot/module-sdk';
import { describe, expect, it } from 'vitest';
import { filterAlarms, mergeAlarms } from '../frontend/rows';
import type { AlarmOccurrence } from '../shared/alarm-history';

const active: LineAlarm[] = [
  {
    machineId: 'filler',
    alarmId: 'A-1',
    class: 'fault',
    text: { de: 'A' },
    raisedAt: '2026-10-22T10:00:00Z',
    acknowledged: true,
    acknowledgedBy: 'bediener',
  },
];
const occurrence = (
  id: number,
  clearedAt: string | null,
  cls: AlarmOccurrence['class'] = 'warning',
): AlarmOccurrence => ({
  id,
  machineId: 'washer',
  alarmId: `B-${String(id)}`,
  class: cls,
  text: null,
  raisedAt: `2026-10-22T0${String(id)}:00:00Z`,
  clearedAt,
  acknowledgedAt: null,
  acknowledgedBy: null,
});

describe('Alarmliste', () => {
  it('nimmt Anstehende aus dem Core und Gegangene aus dem Verlauf', () => {
    const rows = mergeAlarms(active, [occurrence(8, '2026-10-22T08:30:00Z'), occurrence(9, null)]);
    expect(rows.map((r) => r.alarmId)).toEqual(['A-1', 'B-8']);
    expect(rows[0]).toMatchObject({
      clearedAt: null,
      acknowledged: true,
      acknowledgedBy: 'bediener',
    });
  });

  it('filtert nach Klasse', () => {
    const rows = mergeAlarms(active, [occurrence(8, '2026-10-22T08:30:00Z')]);
    expect(filterAlarms(rows, 'fault').map((r) => r.alarmId)).toEqual(['A-1']);
    expect(filterAlarms(rows, 'info')).toEqual([]);
    expect(filterAlarms(rows, 'all')).toHaveLength(2);
  });
});
