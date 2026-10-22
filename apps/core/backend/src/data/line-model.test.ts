import { buildLines, startupMessages, type Outgoing } from '@iot/simulator';
import { describe, expect, it } from 'vitest';
import { LineModel } from './line-model.js';

const NOW = new Date('2026-10-21T12:20:00.000Z');
// Beispiel-Schichtmodell wie in config/site.dev.json; 14:20 Uhr Ortszeit liegt in der Spätschicht
const shifts = [
  { start: '06:00', end: '14:00' },
  { start: '14:00', end: '22:00' },
  { start: '22:00', end: '06:00' },
];

function model(now = NOW) {
  return new LineModel({
    lineId: 'l3',
    timeZone: 'Europe/Berlin',
    shifts,
    oeeTarget: 82,
    now: () => now,
  });
}

const feed = (m: LineModel, messages: Outgoing[]) => {
  for (const o of messages) m.apply(o.topic, o.message);
};

describe('Linienmodell', () => {
  const line = buildLines()[0];
  const messages = (line?.machines ?? []).flatMap((machine) => startupMessages(machine, NOW));

  it('übernimmt die Daten des Simulators', () => {
    const m = model();
    feed(m, messages);
    const snapshot = m.snapshot();
    expect(snapshot.machines.map((x) => x.machineId).sort()).toEqual([
      'l3-cap',
      'l3-debag',
      'l3-delid',
      'l3-fill',
      'l3-iso',
      'l3-transfer',
    ]);
    const fill = snapshot.machines.find((x) => x.machineId === 'l3-fill');
    expect(fill?.identity?.nominalRate).toBe(100);
    expect(fill?.values['fillWeightAvg']?.value).toBe(2.01);
    expect(fill?.counters?.good).toBe(18400);
    expect(snapshot.shift?.start).toBe('2026-10-21T12:00:00.000Z');
  });

  it('führt nur anstehende Alarme', () => {
    const m = model();
    feed(m, messages);
    const fill = m.snapshot().machines.find((x) => x.machineId === 'l3-fill');
    expect(fill?.alarms.map((a) => a.alarmId).sort()).toEqual(['FILL-WGT-0003']);
    const isolator = m.snapshot().machines.find((x) => x.machineId === 'l3-iso');
    expect(isolator?.alarms).toEqual([]); // Sammelstörung kam und ging
  });

  it('verwirft Nachrichten, die das Schema nicht bestehen, und zählt sie', () => {
    const m = model();
    const accepted = m.apply('iot/v1/l3/l3-fill/state', {
      schema: 'iot.state/1.0',
      machineId: 'l3-fill',
      data: {},
    });
    expect(accepted).toBe(false);
    expect(m.snapshot().machines[0]?.invalidMessages).toBe(1);
  });

  it('ignoriert andere Linien und fremde Topics', () => {
    const m = model();
    const other = messages[0];
    expect(m.apply('iot/v1/l2/l2-fill/state', other?.message)).toBe(false);
    expect(m.apply('ie/d/j/simatic/v1/plc1', other?.message)).toBe(false);
    expect(m.snapshot().machines).toEqual([]);
  });

  it('macht schlechte Datenqualität sichtbar', () => {
    const m = model();
    const state = messages.find((o) => o.topic === 'iot/v1/l3/l3-debag/state');
    m.apply('iot/v1/l3/l3-debag/state', { ...state?.message, quality: 'bad' });
    expect(m.snapshot().machines[0]?.quality).toBe('bad');
  });

  it('zeichnet Zustandswechsel und Zählerstände der Schicht auf', () => {
    const m = model();
    feed(m, messages);
    const insp = m.snapshot().machines.find((x) => x.machineId === 'l3-cap');
    expect(insp?.history.states.map((s) => s.state)).toEqual(['Suspended']);
    expect(insp?.history.counterBaseline?.good).toBe(18400);
  });

  it('rechnet nach einem Zählerreset mit der bisherigen Menge weiter', () => {
    const m = model();
    feed(m, messages);
    const topic = 'iot/v1/l3/l3-cap/counters';
    const counters = (good: number, bad: number, resetAt: string, ts: string) => ({
      schema: 'iot.counters/1.0',
      machineId: 'l3-cap',
      ts,
      tsEdge: ts,
      quality: 'good',
      data: { good, bad, total: good + bad, resetAt },
    });
    const before = m.snapshot().machines.find((x) => x.machineId === 'l3-cap');
    const start = before?.counters;
    if (!start?.bad) throw new Error('Zähler der Inspektionsmaschine fehlen');
    // 100 Stück nach Beobachtungsbeginn, dann Reset der Steuerung und 20 weitere Stück
    m.apply(
      topic,
      counters(start.good + 90, start.bad + 10, start.resetAt, '2026-10-21T12:21:00.000Z'),
    );
    m.apply(topic, counters(18, 2, '2026-10-21T12:21:30.000Z', '2026-10-21T12:22:00.000Z'));
    const insp = m.snapshot().machines.find((x) => x.machineId === 'l3-cap');
    const base = insp?.history.counterBaseline;
    expect(insp?.counters && base && insp.counters.total - base.total).toBe(120);
    expect(insp?.counters && base && insp.counters.good - base.good).toBe(108);
    const recent = insp?.history.recentCounters ?? [];
    expect((recent.at(-1)?.total ?? 0) - (recent.at(-2)?.total ?? 0)).toBe(20);
  });

  it('eine wiederholte Meldung „kommt“ ändert einen anstehenden Alarm nicht (O-25)', () => {
    const m = model();
    feed(m, messages);
    const before = m.snapshot().machines.find((x) => x.machineId === 'l3-fill')?.alarms;
    const raised = messages.find(
      (o) =>
        o.topic === 'iot/v1/l3/l3-fill/alarms' &&
        (o.message.data as { event: string; alarmId: string }).alarmId === 'FILL-WGT-0003',
    );
    if (!raised) throw new Error('Alarm fehlt');
    m.apply(raised.topic, { ...raised.message, ts: '2026-10-21T12:19:00.000Z' });
    const after = m.snapshot().machines.find((x) => x.machineId === 'l3-fill')?.alarms;
    expect(after).toEqual(before);
  });

  it('übernimmt den Stand der anstehenden Alarme aus activeAlarms (S-09)', () => {
    const m = model();
    const at = '2026-10-21T11:48:00.000Z';
    m.apply('iot/v1/l3/l3-fill/activeAlarms', {
      schema: 'iot.activeAlarms/1.0',
      machineId: 'l3-fill',
      ts: NOW.toISOString(),
      tsEdge: NOW.toISOString(),
      quality: 'good',
      data: {
        alarms: [
          {
            alarmId: 'FILL-WGT-0003',
            class: 'fault',
            textKey: 'alarm.weighcell.tare',
            text: { de: 'Wägezelle 3' },
            raisedAt: at,
            acknowledged: true,
            user: '[Bediener]',
          },
        ],
      },
    });
    expect(m.snapshot().machines.find((x) => x.machineId === 'l3-fill')?.alarms).toEqual([
      expect.objectContaining({
        alarmId: 'FILL-WGT-0003',
        raisedAt: at,
        acknowledgedBy: '[Bediener]',
      }),
    ]);
  });

  it('meldet Änderungen an Abonnenten', () => {
    const m = model();
    let calls = 0;
    m.subscribe(() => {
      calls += 1;
    });
    feed(m, messages.slice(0, 3));
    expect(calls).toBe(3);
  });
});
