import { describe, expect, it } from 'vitest';
import { analyse, delta } from '../backend/analysis';
import { HistoryStore } from '../backend/history-store';
import { bucketsOf, parsePeriods, retentionMs, windowOf } from '../backend/periods';

const T0 = Date.parse('2026-10-22T04:00:00Z'); // 06:00 Ortszeit
const MIN = 60_000;
const at = (minutes: number) => T0 + minutes * MIN;
const RESET = '2026-10-22T03:58:00Z';

function store() {
  const h = new HistoryStore(':memory:');
  h.identity('fill', {
    type: 'Füll- und Verschließmaschine',
    manufacturer: 'own',
    serial: 'SN-1',
    lineId: 'l1',
    position: 3,
    interfaceVersion: '1.0',
    conformance: 'full',
    nominalRate: 100,
  });
  h.meta('fill', {
    values: [
      {
        key: 'fillWeightAvg',
        name: { de: 'Füllgewicht Ø' },
        unit: 'g',
        gxp: true,
        min: 9.95,
        max: 10.1,
        sampling: 'cyclic',
      },
    ],
  });
  return h;
}
const counters = (good: number, total: number, resetAt = RESET) => ({ good, total, resetAt });
const state = (s: 'Execute' | 'Held', reason: string | null = null) => ({
  state: s,
  mode: 'Production',
  reason,
});

describe('Zeiträume (E-37)', () => {
  it('liest die Konfiguration', () => {
    const periods = parsePeriods('30min, shift,24h,7d');
    expect(periods.map((p) => [p.id, p.ms, p.label.de])).toEqual([
      ['30min', 30 * MIN, '30 Minuten'],
      ['shift', null, 'Schicht'],
      ['24h', 24 * 60 * MIN, '24 Stunden'],
      ['7d', 7 * 24 * 60 * MIN, '7 Tage'],
    ]);
    expect(retentionMs(periods)).toBe(8 * 24 * 60 * MIN);
  });

  it('lehnt ungültige Angaben ab', () => {
    expect(() => parsePeriods('3w')).toThrow(/3w/);
    expect(() => parsePeriods('')).toThrow();
  });

  it('Schicht beginnt mit der laufenden Schicht', () => {
    const [shift] = parsePeriods('shift');
    const line = {
      id: 'l1',
      name: 'Linie 1',
      timeZone: 'Europe/Berlin',
      oeeTarget: 82,
      shifts: [{ start: '06:00', end: '14:00' }],
    };
    if (!shift) throw new Error('Zeitraum fehlt');
    expect(windowOf(shift, line, new Date(at(90))).from.toISOString()).toBe(
      new Date(T0).toISOString(),
    );
  });

  it('teilt kurze Zeiträume in 5 min, lange in Stunden und Tage', () => {
    const tz = 'Europe/Berlin';
    expect(bucketsOf(new Date(T0), new Date(at(60)), tz)).toHaveLength(12);
    expect(bucketsOf(new Date(T0), new Date(at(8 * 60)), tz)).toHaveLength(8);
    const days = bucketsOf(new Date(at(-7 * 24 * 60)), new Date(T0), tz);
    expect(days.length).toBeGreaterThanOrEqual(7);
    expect(days.length).toBeLessThanOrEqual(8);
  });
});

describe('Zählerdifferenz', () => {
  it('zählt nach einem Reset ab null', () => {
    const a = { ts: 0, ...counters(500, 520) };
    expect(delta(a, { ts: 1, ...counters(600, 630) })).toEqual({ good: 100, total: 110 });
    expect(delta(a, { ts: 1, ...counters(20, 21, 'neu') })).toEqual({ good: 20, total: 21 });
    expect(delta(a, { ts: 1, ...counters(10, 12) })).toEqual({ good: 10, total: 12 });
  });
});

describe('Auswertung einer Maschine', () => {
  // 60 min geplant: 50 min Execute, 10 min Held (Wägung) mit Alarm; 4.000 Stück, davon 200 Ausschuss
  const h = store();
  h.state('fill', state('Execute'), at(-30));
  h.counters('fill', counters(1000, 1050), at(-1));
  h.counters('fill', counters(2900, 3000), at(25));
  h.state('fill', state('Held', 'Wägung gestört'), at(30));
  h.alarm(
    'fill',
    {
      alarmId: 'FILL-WGT-0003',
      event: 'raised',
      class: 'fault',
      textKey: 'a.b',
      text: { de: 'Wägezelle 3' },
      user: null,
    },
    at(30),
  );
  h.state('fill', state('Execute'), at(40));
  h.alarm(
    'fill',
    {
      alarmId: 'FILL-WGT-0003',
      event: 'cleared',
      class: 'fault',
      textKey: 'a.b',
      text: { de: 'Wägezelle 3' },
      user: null,
    },
    at(40),
  );
  h.counters('fill', counters(4800, 5050), at(60));
  h.values('fill', { values: [{ key: 'fillWeightAvg', value: 10.0 }] }, at(5));
  h.values('fill', { values: [{ key: 'fillWeightAvg', value: 10.04 }] }, at(5.5));
  h.values('fill', { values: [{ key: 'unbekannt', value: 1 }] }, at(6));

  const result = analyse({
    machineId: 'fill',
    period: '1h',
    from: T0,
    to: at(60),
    planned: [{ start: T0, end: at(60) }],
    buckets: bucketsOf(new Date(T0), new Date(at(60)), 'Europe/Berlin').map((b) => b),
    history: h.load('fill', T0, at(60)),
  });

  it('berechnet die Kennzahlen nach E-27', () => {
    expect(result.kpis.total).toBe(4000);
    expect(result.kpis.good).toBe(3800);
    expect(result.kpis.availability).toBeCloseTo(50 / 60);
    expect(result.kpis.performance).toBeCloseTo(4000 / (100 * 50));
    expect(result.kpis.quality).toBeCloseTo(0.95);
    expect(result.kpis.oee).toBeCloseTo((50 / 60) * 0.8 * 0.95);
  });

  it('listet Stillstände mit Grund und Alarm', () => {
    expect(result.stateTotals).toEqual({ Execute: 50 * MIN, Held: 10 * MIN });
    expect(result.stops).toEqual([
      expect.objectContaining({
        state: 'Held',
        reason: 'Wägung gestört',
        durationMs: 10 * MIN,
        alarm: { alarmId: 'FILL-WGT-0003', text: { de: 'Wägezelle 3' } },
      }),
    ]);
    expect(result.alarms).toMatchObject({ count: 1, faults: 1, faultDowntimeMs: 10 * MIN });
  });

  it('verteilt Mengen und Leistung auf die Abschnitte', () => {
    expect(result.bucketMs).toBe(5 * MIN);
    expect(result.buckets.reduce((s, b) => s + b.total, 0)).toBe(4000);
    const heldBucket = result.buckets.find((b) => b.start === new Date(at(30)).toISOString());
    expect(heldBucket?.rate).toBeNull();
  });

  it('zeigt nur Prozesswerte aus dem Wertekatalog, mit Grenzen', () => {
    expect(result.values).toHaveLength(1);
    expect(result.values[0]).toMatchObject({
      key: 'fillWeightAvg',
      min: 9.95,
      max: 10.1,
      low: 10,
      high: 10.04,
    });
    expect(result.values[0]?.avg).toBeCloseTo(10.02);
  });
});

describe('Verlauf', () => {
  it('speichert Zustände nur bei Wechsel und löscht Altes', () => {
    const h = store();
    h.state('fill', state('Execute'), at(0));
    h.state('fill', state('Execute'), at(1));
    h.state('fill', state('Held'), at(2));
    h.counters('fill', counters(1, 1), at(0));
    expect(h.load('fill', at(0), at(10)).states).toHaveLength(2);
    h.purge(at(5));
    const after = h.load('fill', at(6), at(10));
    // letzter Zustand vor dem Löschzeitpunkt bleibt erhalten
    expect(after.states.map((s) => s.state)).toEqual(['Held']);
    expect(after.counters).toEqual([]);
  });
});

describe('Beobachtungszeitraum', () => {
  it('rechnet nur ab dem ersten Zählerstand', () => {
    const h = store();
    h.state('fill', state('Execute'), at(-120));
    h.counters('fill', counters(0, 0), at(30));
    h.counters('fill', counters(2900, 3000), at(60));
    const result = analyse({
      machineId: 'fill',
      period: '1h',
      from: T0,
      to: at(60),
      planned: [{ start: T0, end: at(60) }],
      buckets: bucketsOf(new Date(T0), new Date(at(60)), 'Europe/Berlin'),
      history: h.load('fill', T0, at(60)),
    });
    expect(result.observedFrom).toBe(new Date(at(30)).toISOString());
    expect(result.kpis.plannedMs).toBe(30 * MIN);
    expect(result.kpis.performance).toBeCloseTo(3000 / (100 * 30));
    expect(result.buckets[0]?.rate).toBeNull();
  });
});
