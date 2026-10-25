import { parseTopic, validateMessage, type DataClass } from '@iot/interface-schema';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLines, type SimMachine } from './config';
import { countersMessage, startupMessages, valuesMessage, type Outgoing } from './messages';
import { nextBatchId, Simulator } from './simulator';

const NOW = new Date('2026-10-21T12:20:00.000Z');
const lines = buildLines();
const machines = lines.flatMap((l) => l.machines);
const byId = (id: string): SimMachine => {
  const machine = machines.find((m) => m.id === id);
  if (!machine) throw new Error(id);
  return machine;
};
const classes = (out: Outgoing[]) => new Set(out.map((o) => parseTopic(o.topic)?.dataClass));

describe('Linie 3 · Flexfill (E-47)', () => {
  it('ist die einzige Linie, mit dem Isolator als Fremdmaschine', () => {
    expect(lines.map((l) => l.machines.map((m) => m.id))).toEqual([
      ['l3-iso', 'l3-debag', 'l3-delid', 'l3-fill', 'l3-transfer', 'l3-cap'],
    ]);
    expect(lines[0]?.machines.map((m) => m.name)).toEqual([
      'Isolator',
      'Beutelauspacker',
      'Öffner (Delid/Delining)',
      'Füll- und Verschließmaschine',
      'Transfermodul',
      'Bördelmodul',
    ]);
  });

  it('eigene Maschinen der Stufe Voll, Isolator fremd mit Stufe Basis', () => {
    expect(byId('l3-iso')).toMatchObject({ own: false, conformance: 'basic' });
    for (const id of ['l3-debag', 'l3-delid', 'l3-fill', 'l3-transfer', 'l3-cap'])
      expect(byId(id)).toMatchObject({ own: true, conformance: 'full' });
    expect(byId('l3-fill').nominalRate).toBe(100);
    expect(byId('l3-fill').values.find((v) => v.key === 'fillWeightAvg')?.value).toBe(2.01);
    expect(byId('l3-cap').reason).toBe('Einlauf leer');
    expect(byId('l3-fill').alarms.map((a) => a.alarmId)).toEqual([
      'FILL-WGT-0003',
      'FILL-STP-0001',
    ]);
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
      expect(o.retain).toBe(
        ['identity', 'meta', 'state', 'counters', 'activeAlarms', 'batch'].includes(
          dataClass ?? '',
        ),
      );
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
  it('basic (Isolator): nur Identität, Zustand, Zähler (gut/gesamt) und Sammelstörung', () => {
    const out = startupMessages(byId('l3-iso'), NOW);
    expect(classes(out)).toEqual(
      new Set(['identity', 'state', 'counters', 'alarms', 'activeAlarms']),
    );
    const counters = out.find((o) => o.topic.endsWith('/counters'))?.message.data;
    expect(counters).not.toHaveProperty('bad');
    const alarmIds = out
      .filter((o) => o.topic.endsWith('/alarms'))
      .map((o) => (o.message.data as { alarmId: string }).alarmId);
    expect(new Set(alarmIds)).toEqual(new Set(['COMMON-FAULT']));
  });

  it('full: Batch mit Produkt, Start und Rezept; quittierte Alarme mit Benutzer', () => {
    const out = startupMessages(byId('l3-fill'), NOW);
    const batch = out.find((o) => o.topic.endsWith('/batch'))?.message.data;
    expect(batch).toEqual({
      event: 'started',
      batchId: 'B-2026-3001',
      productName: '[Produktname]',
      targetQuantity: expect.any(Number) as number,
      startedAt: '2026-10-21T04:05:00.000Z',
      recipe: { id: 'vial-nest', version: 1 },
      formatParts: [],
    });
    const acks = out.filter((o) => (o.message.data as { event?: string }).event === 'acknowledged');
    expect(acks.length).toBeGreaterThan(0);
  });

  it('aktive Alarme kommen nur, vergangene kommen und gehen', () => {
    const out = startupMessages(byId('l3-fill'), NOW).filter((o) => o.topic.endsWith('/alarms'));
    const events = (id: string) =>
      out
        .filter((o) => (o.message.data as { alarmId: string }).alarmId === id)
        .map((o) => (o.message.data as { event: string }).event);
    expect(events('FILL-WGT-0003')).toEqual(['raised']);
    expect(events('FILL-STP-0001')).toEqual(['raised', 'cleared', 'acknowledged']);
  });
});

describe('Zähler', () => {
  const total = (o: Outgoing) => (o.message.data as { total: number }).total;

  it('steigen monoton, solange die Maschine produziert', () => {
    const fill = byId('l3-fill');
    const steps = [0, 5_000, 10_000, 60_000].map((ms) => total(countersMessage(fill, ms, NOW)));
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(steps[3]).toBeGreaterThan(steps[0] ?? 0);
  });

  it('stehen still, wenn die Maschine nicht in Execute ist', () => {
    const stopped = byId('l3-cap');
    expect(total(countersMessage(stopped, 60_000, NOW))).toBe(
      total(countersMessage(stopped, 0, NOW)),
    );
  });

  it('eigene Maschinen starten mit den Batchmengen, der Isolator mit „Zähler gut“', () => {
    expect(countersMessage(byId('l3-fill'), 0, NOW).message.data).toMatchObject({
      good: 18400,
      bad: 310,
      total: 18710,
    });
    expect(countersMessage(byId('l3-iso'), 0, NOW).message.data).toMatchObject({ good: 18700 });
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

describe('Stand der anstehenden Alarme (S-09)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('meldet den Stand retained beim Start und bei jedem Wechsel', () => {
    const active = (id: string) =>
      startupMessages(byId(id), NOW).find((o) => o.topic.endsWith('/activeAlarms'));
    const fill = active('l3-fill');
    expect(fill?.retain).toBe(true);
    expect(
      (fill?.message.data as { alarms: { alarmId: string }[] }).alarms.map((a) => a.alarmId),
    ).toEqual(['FILL-WGT-0003']);
    // Basis: Sammelstörung ist vergangen – leerer Stand
    expect((active('l3-iso')?.message.data as { alarms: unknown[] }).alarms).toEqual([]);

    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const published: Outgoing[] = [];
    const sim = new Simulator((o) => published.push(o), { batchCycle: false });
    sim.start();
    const since = published.length;
    vi.advanceTimersByTime(60_000);
    const cap = published.slice(since).filter((o) => o.topic === 'iot/v1/l3/l3-cap/activeAlarms');
    expect((cap.at(-1)?.message.data as { alarms: unknown[] }).alarms).toEqual([]);
    sim.stop();
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

  it('das Bördelmodul läuft nach 1 min an; sein Alarm geht', () => {
    const { sim, after, data } = run();
    vi.advanceTimersByTime(60_000);
    const cap = after().filter((o) => o.topic.startsWith('iot/v1/l3/l3-cap/'));
    expect(cap.filter((o) => o.topic.endsWith('/state')).map((o) => data(o)['state'])).toEqual([
      'Execute',
    ]);
    expect(
      cap
        .filter((o) => o.topic.endsWith('/alarms'))
        .map((o) => [data(o)['alarmId'], data(o)['event']]),
    ).toEqual([['CAP-INF-0001', 'cleared']]);
    sim.stop();
  });

  it('nach 9 min Lauf steht es wieder und der Alarm kommt erneut', () => {
    const { sim, after, data } = run();
    vi.advanceTimersByTime(60_000 + 9 * 60_000);
    const states = after()
      .filter((o) => o.topic === 'iot/v1/l3/l3-cap/state')
      .map((o) => [data(o)['state'], data(o)['reason']]);
    expect(states).toEqual([
      ['Execute', null],
      ['Suspended', 'Einlauf leer'],
    ]);
    sim.stop();
  });

  it('im Lauf zählt das Bördelmodul mit der Linienleistung (92 /min)', () => {
    const { sim, after } = run();
    vi.advanceTimersByTime(60_000 + 60_000);
    const totals = after()
      .filter((o) => o.topic === 'iot/v1/l3/l3-cap/counters')
      .map((o) => (o.message.data as { total: number }).total);
    const diff = (totals.at(-1) ?? 0) - (totals[0] ?? 0);
    expect(diff).toBeGreaterThan(75);
    expect(diff).toBeLessThan(100);
    sim.stop();
  });

  it('laufende Maschinen wechseln nicht', () => {
    const { sim, after } = run();
    vi.advanceTimersByTime(20 * 60_000);
    expect(after().some((o) => o.topic === 'iot/v1/l3/l3-fill/state')).toBe(false);
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

describe('Batch-Zyklus (M6)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('nummeriert fortlaufend', () => {
    expect(nextBatchId('B-2026-3001')).toBe('B-2026-3002');
    expect(nextBatchId('B-2026-0999')).toBe('B-2026-1000');
  });

  it('beendet den Batch nach 15 min und startet nach 2 min den nächsten mit Zählerreset', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const published: Outgoing[] = [];
    const sim = new Simulator((o) => published.push(o), { cycle: false });
    sim.start();
    const since = published.length;
    const batchEvents = () =>
      published
        .slice(since)
        .filter((o) => o.topic.endsWith('/batch'))
        .map((o) => {
          const d = o.message.data as { event: string; batchId: string };
          return `${o.topic.split('/')[3] ?? ''} ${d.event} ${d.batchId}`;
        });
    vi.advanceTimersByTime(15 * 60_000);
    expect(batchEvents()).toContain('l3-fill ended B-2026-3001');
    vi.advanceTimersByTime(2 * 60_000);
    // alle eigenen Maschinen (Stufe Voll) gehören zum Batch der Linie, der Isolator (Basis) nicht
    const started = batchEvents().filter((e) => e.includes(' started B-2026-3002'));
    expect(started.map((e) => e.split(' ')[0])).toEqual([
      'l3-debag',
      'l3-delid',
      'l3-fill',
      'l3-transfer',
      'l3-cap',
    ]);
    const counters = published
      .slice(since)
      .filter((o) => o.topic === 'iot/v1/l3/l3-fill/counters')
      .at(-1);
    const data = counters?.message.data as { total: number; resetAt: string };
    expect(data.resetAt).toBe(new Date(NOW.getTime() + 17 * 60_000).toISOString());
    expect(data.total).toBe(0);
    // S-08, S-10: Start, Produkt und Sollmenge in jeder Batch-Meldung, retained
    const message = published
      .slice(since)
      .find(
        (o) =>
          o.topic === 'iot/v1/l3/l3-fill/batch' &&
          (o.message.data as { event: string }).event === 'started',
      );
    expect(message?.retain).toBe(true);
    expect(message?.message.data).toMatchObject({
      batchId: 'B-2026-3002',
      productName: '[Produktname]',
      startedAt: new Date(NOW.getTime() + 17 * 60_000).toISOString(),
    });
    expect((message?.message.data as { targetQuantity: number }).targetQuantity).toBeGreaterThan(0);
    sim.stop();
  });
});

describe('Bedienung am HMI nachspielen (E-51)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const published: Outgoing[] = [];
    const sim = new Simulator((o) => published.push(o), {});
    sim.start();
    return { sim, published, since: published.length };
  };
  // Testhilfe: Nutzdaten in der erwarteten Form lesen
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  const data = <T>(o: Outgoing | undefined) => o?.message.data as T;

  it('stop beendet den Batch und stoppt alle Maschinen, auch den Isolator', () => {
    const { sim, published, since } = setup();
    expect(sim.control('l3', { command: 'stop' })).toBeNull();
    const after = published.slice(since);
    const states = after.filter((o) => o.topic.endsWith('/state'));
    expect(states.map((o) => o.topic.split('/')[3])).toEqual([
      'l3-iso',
      'l3-debag',
      'l3-delid',
      'l3-fill',
      'l3-transfer',
      'l3-cap',
    ]);
    expect(states.every((o) => data<{ state: string }>(o).state === 'Stopped')).toBe(true);
    expect(
      data<{ event: string }>(after.find((o) => o.topic === 'iot/v1/l3/l3-fill/batch')).event,
    ).toBe('ended');
    // gestoppt: kein neuer Batch, kein Zustandswechsel des Bördelmoduls, kein Zählerzuwachs
    const count = published.length;
    vi.advanceTimersByTime(20 * 60_000);
    const later = published.slice(count);
    expect(later.some((o) => o.topic.endsWith('/batch') || o.topic.endsWith('/state'))).toBe(false);
    const counters = later.filter((o) => o.topic === 'iot/v1/l3/l3-fill/counters');
    expect(new Set(counters.map((o) => data<{ total: number }>(o).total)).size).toBe(1);
    sim.stop();
  });

  it('recipe wirkt ab dem nächsten Batch, start lässt die Linie mit neuem Batch anlaufen', () => {
    const { sim, published } = setup();
    sim.control('l3', { command: 'stop' });
    expect(sim.control('l3', { command: 'recipe', recipe: 'syringe-nest' })).toBeNull();
    const count = published.length;
    expect(sim.control('l3', { command: 'start' })).toBeNull();
    const after = published.slice(count);
    expect(
      after
        .filter((o) => o.topic.endsWith('/state'))
        .every((o) => data<{ state: string }>(o).state === 'Execute'),
    ).toBe(true);
    const started = data<{
      event: string;
      batchId: string;
      recipe: unknown;
      formatParts: string[];
    }>(after.find((o) => o.topic === 'iot/v1/l3/l3-fill/batch'));
    expect(started).toMatchObject({
      event: 'started',
      batchId: 'B-2026-3002',
      recipe: { id: 'syringe-nest', version: 1 },
    });
    expect(started.formatParts).toContain('FT-3320');
    for (const o of after)
      expect(
        validateMessage(parseTopic(o.topic)?.dataClass as DataClass, o.message).errors,
      ).toEqual([]);
    sim.stop();
  });

  it('lehnt unbekannte Rezepte und Linien ab', () => {
    const { sim } = setup();
    expect(sim.control('l3', { command: 'recipe', recipe: 'unbekannt' })).toMatch(/unbekannt/);
    expect(sim.control('l9', { command: 'stop' })).toMatch(/l9/);
    expect(sim.control('l3', { command: 'start' })).toMatch(/läuft bereits/);
    sim.stop();
  });
});
