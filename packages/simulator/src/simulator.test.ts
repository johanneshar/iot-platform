import { parseTopic, validateMessage, type DataClass } from '@iot/interface-schema';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLines, type SimMachine } from './config';
import { countersMessage, startupMessages, valuesMessage, type Outgoing } from './messages';
import { Simulator } from './simulator';

const NOW = new Date('2026-10-21T12:20:00.000Z');
const lines = buildLines();
const machines = lines.flatMap((l) => l.machines);
const byId = (id: string): SimMachine => {
  const machine = machines.find((m) => m.id === id);
  if (!machine) throw new Error(id);
  return machine;
};
const classes = (out: Outgoing[]) => new Set(out.map((o) => parseTopic(o.topic)?.dataClass));

describe('Beispiellinien aus dem Mockup', () => {
  it('kennt beide Linien mit den Maschinen-IDs aus S-01', () => {
    expect(lines.map((l) => l.machines.map((m) => m.id))).toEqual([
      ['l1-wash', 'l1-tunnel', 'l1-fill', 'l1-insp'],
      ['l2-detub', 'l2-fill', 'l2-label'],
    ]);
  });

  it('übernimmt Stufen, Sollleistung und Werte aus dem Mockup', () => {
    expect(byId('l1-tunnel').conformance).toBe('basic');
    expect(byId('l1-wash').conformance).toBe('standard');
    expect(byId('l1-fill').conformance).toBe('full');
    expect(byId('l1-fill').nominalRate).toBe(320);
    expect(byId('l2-fill').nominalRate).toBe(400);
    expect(byId('l1-fill').values.find((v) => v.key === 'fillWeightAvg')?.value).toBe(10.02);
    expect(byId('l1-insp').reason).toBe('Auslauf gestaut');
  });
});

describe('Schemakonformität', () => {
  const all: Outgoing[] = machines.flatMap((m) => [
    ...startupMessages(m, NOW),
    countersMessage(m, 60_000, NOW),
    ...[valuesMessage(m, NOW)].filter((v): v is Outgoing => v !== null),
  ]);

  it.each(all.map((o) => [o.topic, o] as const))('%s ist schemakonform', (topic, outgoing) => {
    const parsed = parseTopic(topic);
    expect(parsed).not.toBeNull();
    const result = validateMessage(parsed?.dataClass as DataClass, outgoing.message);
    expect(result.errors).toEqual([]);
  });

  it('setzt retained nach Spezifikation', () => {
    for (const o of all) {
      const dataClass = parseTopic(o.topic)?.dataClass;
      expect(o.retain).toBe(['identity', 'meta', 'state', 'counters'].includes(dataClass ?? ''));
    }
  });

  it('sendet nur values-Schlüssel aus dem meta-Katalog', () => {
    for (const m of machines) {
      const out = startupMessages(m, NOW);
      const meta = out.find((o) => o.topic.endsWith('/meta'))?.message.data as
        { values: { key: string }[] } | undefined;
      const values = out.find((o) => o.topic.endsWith('/values'))?.message.data as
        { values: { key: string }[] } | undefined;
      const allowed = new Set(meta?.values.map((v) => v.key));
      for (const v of values?.values ?? []) expect(allowed.has(v.key)).toBe(true);
    }
  });
});

describe('Konformitätsstufen', () => {
  it('basic: nur Identität, Zustand, Zähler (gut/gesamt) und Sammelstörung', () => {
    const out = startupMessages(byId('l1-tunnel'), NOW);
    expect(classes(out)).toEqual(new Set(['identity', 'state', 'counters', 'alarms']));
    const counters = out.find((o) => o.topic.endsWith('/counters'))?.message.data;
    expect(counters).not.toHaveProperty('bad');
    const alarmIds = out
      .filter((o) => o.topic.endsWith('/alarms'))
      .map((o) => (o.message.data as { alarmId: string }).alarmId);
    expect(new Set(alarmIds)).toEqual(new Set(['COMMON-FAULT']));
  });

  it('standard: Prozesswerte und Einzelalarme, aber kein Batch und keine Quittierung', () => {
    const out = startupMessages(byId('l1-wash'), NOW);
    expect(classes(out).has('values')).toBe(true);
    expect(classes(out).has('batch')).toBe(false);
    const events = out
      .filter((o) => o.topic.endsWith('/alarms'))
      .map((o) => (o.message.data as { event: string }).event);
    expect(events).not.toContain('acknowledged');
  });

  it('full: Batch mit Rezept und quittierte Alarme mit Benutzer', () => {
    const out = startupMessages(byId('l1-fill'), NOW);
    const batch = out.find((o) => o.topic.endsWith('/batch'))?.message.data;
    expect(batch).toEqual({
      event: 'started',
      batchId: 'B-2026-1042',
      recipe: { id: 'vial-10ml', version: 3 },
      formatParts: ['FT-2041', 'FT-3110'],
    });
    const acks = out.filter((o) => (o.message.data as { event?: string }).event === 'acknowledged');
    expect(acks.length).toBeGreaterThan(0);
  });

  it('aktive Alarme kommen nur, vergangene kommen und gehen', () => {
    const out = startupMessages(byId('l1-fill'), NOW).filter((o) => o.topic.endsWith('/alarms'));
    const events = (id: string) =>
      out
        .filter((o) => (o.message.data as { alarmId: string }).alarmId === id)
        .map((o) => (o.message.data as { event: string }).event);
    expect(events('FILL-WGT-0003')).toEqual(['raised']);
    expect(events('FILL-RCP-0001')).toEqual(['raised', 'cleared', 'acknowledged']);
  });
});

describe('Zähler', () => {
  const total = (o: Outgoing) => (o.message.data as { total: number }).total;

  it('steigen monoton, solange die Maschine produziert', () => {
    const fill = byId('l1-fill');
    const steps = [0, 5_000, 10_000, 60_000].map((ms) => total(countersMessage(fill, ms, NOW)));
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(steps[3]).toBeGreaterThan(steps[0] ?? 0);
  });

  it('stehen still, wenn die Maschine nicht in Execute ist', () => {
    const held = byId('l2-fill');
    expect(total(countersMessage(held, 60_000, NOW))).toBe(total(countersMessage(held, 0, NOW)));
  });

  it('starten mit den Ständen aus dem Mockup', () => {
    expect(countersMessage(byId('l1-fill'), 0, NOW).message.data).toMatchObject({
      good: 61880,
      bad: 2580,
      total: 64460,
    });
  });
});

describe('Simulator', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('veröffentlicht beim Start alles und danach zyklisch die Zähler', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const published: Outgoing[] = [];
    const sim = new Simulator((o) => published.push(o), {
      countersIntervalMs: 5_000,
      valuesIntervalMs: 10_000,
    });
    sim.start();
    const afterStart = published.length;
    expect(afterStart).toBeGreaterThan(0);
    vi.advanceTimersByTime(5_000);
    expect(published.slice(afterStart).every((o) => o.topic.endsWith('/counters'))).toBe(true);
    expect(published.length - afterStart).toBe(machines.length);
    sim.stop();
    vi.advanceTimersByTime(20_000);
    expect(published.length - afterStart).toBe(machines.length);
  });
});

describe('Zustandswechsel (O-24)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function run() {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const published: Outgoing[] = [];
    const sim = new Simulator((o) => published.push(o));
    sim.start();
    const since = published.length;
    const after = () => published.slice(since);
    const data = (o: Outgoing) => o.message.data as Record<string, unknown>;
    return { sim, after, data };
  }

  it('die Inspektion läuft nach 1 min an; ihr Alarm geht', () => {
    const { sim, after, data } = run();
    vi.advanceTimersByTime(60_000);
    const insp = after().filter((o) => o.topic.startsWith('iot/v1/l1/l1-insp/'));
    expect(insp.filter((o) => o.topic.endsWith('/state')).map((o) => data(o)['state'])).toEqual([
      'Execute',
    ]);
    expect(
      insp
        .filter((o) => o.topic.endsWith('/alarms'))
        .map((o) => [data(o)['alarmId'], data(o)['event']]),
    ).toEqual([['INSP-OUT-0001', 'cleared']]);
    sim.stop();
  });

  it('nach 9 min Lauf steht sie wieder und der Alarm kommt erneut', () => {
    const { sim, after, data } = run();
    vi.advanceTimersByTime(60_000 + 9 * 60_000);
    const states = after()
      .filter((o) => o.topic === 'iot/v1/l1/l1-insp/state')
      .map((o) => [data(o)['state'], data(o)['reason']]);
    expect(states).toEqual([
      ['Execute', null],
      ['Suspended', 'Auslauf gestaut'],
    ]);
    sim.stop();
  });

  it('im Lauf zählt die Inspektion mit der Linienleistung (286 /min)', () => {
    const { sim, after } = run();
    vi.advanceTimersByTime(60_000 + 60_000);
    const counters = after().filter((o) => o.topic === 'iot/v1/l1/l1-insp/counters');
    const totals = counters.map((o) => (o.message.data as { total: number }).total);
    const first = totals[0] ?? 0;
    const last = totals.at(-1) ?? 0;
    expect(last - first).toBeGreaterThan(250);
    expect(last - first).toBeLessThan(320);
    sim.stop();
  });

  it('laufende Maschinen wechseln nicht', () => {
    const { sim, after } = run();
    vi.advanceTimersByTime(20 * 60_000);
    expect(after().some((o) => o.topic === 'iot/v1/l1/l1-fill/state')).toBe(false);
    sim.stop();
  });

  it('alle Nachrichten der Wechsel sind schemakonform', () => {
    const { sim, after } = run();
    vi.advanceTimersByTime(11 * 60_000);
    for (const o of after()) {
      const parsed = parseTopic(o.topic);
      expect(validateMessage(parsed?.dataClass as DataClass, o.message).errors).toEqual([]);
    }
    sim.stop();
  });
});
