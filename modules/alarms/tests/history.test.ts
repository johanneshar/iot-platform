import type { AlarmData } from '@iot/interface-schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AlarmHistory } from '../backend/history';

const raised = (alarmId: string, cls: AlarmData['class'] = 'fault'): AlarmData => ({
  alarmId,
  event: 'raised',
  class: cls,
  textKey: 'alarm.test',
  text: { de: `Text ${alarmId}` },
  user: null,
});
const cleared = (alarmId: string): AlarmData => ({ ...raised(alarmId), event: 'cleared' });

const NOW = new Date('2026-10-22T12:00:00Z');
const at = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString();

describe('Alarmverlauf', () => {
  let history: AlarmHistory;
  beforeEach(() => {
    history = new AlarmHistory(':memory:');
  });
  afterEach(() => {
    history.close();
  });

  it('verfolgt kommt, quittiert und geht je Auftreten', () => {
    history.record('filler', raised('FILL-WGT-0003'), at(2));
    history.record('filler', raised('FILL-WGT-0003'), at(1.5)); // doppelt gemeldet
    history.record(
      'filler',
      { ...raised('FILL-WGT-0003'), event: 'acknowledged', user: 'bediener' },
      at(1.2),
    );
    history.record('filler', cleared('FILL-WGT-0003'), at(1));
    history.record('filler', raised('FILL-WGT-0003'), at(0.5));
    const list = history.list(1, NOW);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ raisedAt: at(0.5), clearedAt: null });
    expect(list[1]).toMatchObject({
      raisedAt: at(2),
      clearedAt: at(1),
      acknowledgedAt: at(1.2),
      acknowledgedBy: 'bediener',
      text: { de: 'Text FILL-WGT-0003' },
    });
  });

  it('ignoriert „geht“ ohne „kommt“', () => {
    history.record('filler', cleared('X-1'), at(1));
    expect(history.list(1, NOW)).toEqual([]);
  });

  it('zeigt anstehende Alarme auch außerhalb des Zeitraums', () => {
    history.record('filler', raised('OLD-1'), at(48));
    history.record('filler', raised('OLD-2'), at(47));
    history.record('filler', cleared('OLD-2'), at(46));
    expect(history.list(1, NOW).map((a) => a.alarmId)).toEqual(['OLD-1']);
  });

  it('summiert die Störungsdauer im Zeitraum (E-33)', () => {
    // 2 × 30 min innerhalb, eine Störung ragt 1 h in den Zeitraum, eine steht noch an (seit 10 min)
    history.record('filler', raised('A-1'), at(5));
    history.record('filler', cleared('A-1'), at(4.5));
    history.record('filler', raised('A-1'), at(3));
    history.record('filler', cleared('A-1'), at(2.5));
    history.record('washer', raised('B-1'), at(7 * 24 + 1));
    history.record('washer', cleared('B-1'), at(7 * 24 - 1));
    history.record('capper', raised('C-1'), at(10 / 60));
    history.record('capper', raised('W-1', 'warning'), at(3));
    history.record('capper', raised('Z-1'), at(1));
    history.record('capper', cleared('Z-1'), at(1));
    expect(history.topFaults(7, NOW)).toEqual([
      { alarmId: 'A-1', machineId: 'filler', text: { de: 'Text A-1' }, minutes: 60, count: 2 },
      { alarmId: 'B-1', machineId: 'washer', text: { de: 'Text B-1' }, minutes: 60, count: 1 },
      { alarmId: 'C-1', machineId: 'capper', text: { de: 'Text C-1' }, minutes: 10, count: 1 },
    ]);
  });

  it('löscht abgeschlossene Alarme nach der Aufbewahrungszeit (E-34)', () => {
    history.record('filler', raised('A-1'), at(24 * 91));
    history.record('filler', cleared('A-1'), at(24 * 91 - 1));
    history.record('filler', raised('A-2'), at(24 * 92));
    history.record('filler', raised('A-3'), at(24 * 10));
    history.record('filler', cleared('A-3'), at(24 * 9));
    expect(history.purge(90, NOW)).toBe(1);
    expect(history.list(90, NOW).map((a) => a.alarmId)).toEqual(['A-3', 'A-2']);
  });
});
