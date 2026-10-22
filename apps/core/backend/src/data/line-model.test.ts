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
    lineId: 'l1',
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
  const l1 = buildLines()[0];
  const messages = (l1?.machines ?? []).flatMap((machine) => startupMessages(machine, NOW));

  it('übernimmt die Daten des Simulators', () => {
    const m = model();
    feed(m, messages);
    const snapshot = m.snapshot();
    expect(snapshot.machines.map((x) => x.machineId).sort()).toEqual([
      'l1-fill',
      'l1-insp',
      'l1-tunnel',
      'l1-wash',
    ]);
    const fill = snapshot.machines.find((x) => x.machineId === 'l1-fill');
    expect(fill?.identity?.nominalRate).toBe(320);
    expect(fill?.values['fillWeightAvg']?.value).toBe(10.02);
    expect(fill?.counters?.good).toBe(61880);
    expect(snapshot.shift?.start).toBe('2026-10-21T12:00:00.000Z');
  });

  it('führt nur anstehende Alarme', () => {
    const m = model();
    feed(m, messages);
    const fill = m.snapshot().machines.find((x) => x.machineId === 'l1-fill');
    expect(fill?.alarms.map((a) => a.alarmId).sort()).toEqual(['FILL-CAP-0001', 'FILL-WGT-0003']);
    const tunnel = m.snapshot().machines.find((x) => x.machineId === 'l1-tunnel');
    expect(tunnel?.alarms).toEqual([]); // Sammelstörung kam und ging
  });

  it('verwirft Nachrichten, die das Schema nicht bestehen, und zählt sie', () => {
    const m = model();
    const accepted = m.apply('iot/v1/l1/l1-fill/state', {
      schema: 'iot.state/1.0',
      machineId: 'l1-fill',
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
    const state = messages.find((o) => o.topic === 'iot/v1/l1/l1-wash/state');
    m.apply('iot/v1/l1/l1-wash/state', { ...state?.message, quality: 'bad' });
    expect(m.snapshot().machines[0]?.quality).toBe('bad');
  });

  it('zeichnet Zustandswechsel und Zählerstände der Schicht auf', () => {
    const m = model();
    feed(m, messages);
    const insp = m.snapshot().machines.find((x) => x.machineId === 'l1-insp');
    expect(insp?.history.states.map((s) => s.state)).toEqual(['Suspended']);
    expect(insp?.history.counterBaseline?.good).toBe(55130);
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
