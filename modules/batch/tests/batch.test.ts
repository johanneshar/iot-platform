import { proxyHeaders, type AuditEntryInfo, type ProxyUser } from '@iot/module-sdk/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp, LINE_RELEASE_REFERENCE, reference, STEPS } from '../backend/app';
import { canonical, reportHash } from '../backend/report';
import { BatchStore, GAP_MS } from '../backend/store';
import type { BatchDetail, BatchSummary } from '../shared/batch';

const TOKEN = 'test-token';
const T0 = Date.parse('2026-10-22T04:00:00Z');
const MIN = 60_000;
const at = (m: number) => T0 + m * MIN;
const LINE = {
  id: 'l3',
  name: 'Linie 3 · Flexfill',
  timeZone: 'Europe/Berlin',
  oeeTarget: null,
  shifts: [{ start: '06:00', end: '14:00' }],
};
const FALLBACK: ProxyUser = { username: 'nobody', displayName: 'Niemand', permissions: [] };
const users: Record<string, ProxyUser> = {
  qa: { username: 'qa', displayName: '[QA]', permissions: ['batch.sign', 'batch.export'] },
  setup: {
    username: 'setup',
    displayName: '[Setup Man]',
    permissions: ['batch.review', 'batch.clear'],
  },
  operator: { username: 'operator', displayName: '[Operator]', permissions: ['batch.clear'] },
  service: { username: 'service', displayName: '[Service]', permissions: ['*'] },
};

function identity(machineId: string) {
  return {
    type: machineId === 'fill' ? 'Füll- und Verschließmaschine' : 'Bördelmodul',
    manufacturer: 'own',
    serial: 'SN',
    lineId: 'l3',
    position: machineId === 'fill' ? 3 : 5,
    interfaceVersion: '1.0',
    conformance: 'full' as const,
    nominalRate: 100,
  };
}

describe('Batch-Reporting', () => {
  let store: BatchStore;
  let clock: number;
  let audit: AuditEntryInfo[];
  let app: ReturnType<typeof buildApp>;

  /** Simuliert den Audit Trail des Core: die Oberfläche signiert, das Backend liest nach */
  const write = (user: string, entry: Partial<AuditEntryInfo>): number => {
    const seq = audit.length + 1;
    const u = users[user];
    if (!u) throw new Error(user);
    audit.push({
      seq,
      ts: new Date(clock).toISOString(),
      username: u.username,
      userName: u.displayName,
      action: '',
      module: 'batch',
      oldValue: null,
      newValue: null,
      reason: null,
      meaning: null,
      reference: null,
      hash: 'x',
      ...entry,
    });
    return seq;
  };
  const post = (user: string, url: string, seq: number) =>
    app.inject({
      method: 'POST',
      url,
      headers: proxyHeaders(users[user] ?? FALLBACK, TOKEN),
      payload: { seq },
    });
  const get = (user: string, url: string) =>
    app.inject({ url, headers: proxyHeaders(users[user] ?? FALLBACK, TOKEN) });

  beforeEach(() => {
    store = new BatchStore(':memory:');
    clock = at(0);
    audit = [];
    app = buildApp({
      store,
      token: TOKEN,
      logger: false,
      line: () => LINE,
      now: () => new Date(clock),
      audit: {
        entry: (seq) => Promise.resolve(audit.find((e) => e.seq === seq) ?? null),
        byReference: (ref) => Promise.resolve(audit.filter((e) => e.reference === ref)),
      },
    });
    for (const m of ['fill', 'cap']) {
      store.identity(m, identity(m));
      store.meta(m, {
        values: [
          {
            key: 'fillWeightAvg',
            name: { de: 'Füllgewicht Ø' },
            unit: 'g',
            gxp: true,
            min: 1.95,
            max: 2.05,
            sampling: 'cyclic',
          },
          { key: 'torque', name: { de: 'Moment' }, unit: 'Nm', gxp: false, sampling: 'cyclic' },
        ],
      });
    }
  });
  afterEach(async () => {
    await app.close();
    store.close();
  });

  /** Batch über zwei Maschinen: 30 min, Füllgewicht einmal außerhalb, eine Datenlücke am Bördelmodul */
  function runBatch() {
    const started = {
      event: 'started' as const,
      batchId: 'B-1',
      recipe: { id: 'vial-nest', version: 1 },
      formatParts: [],
    };
    store.batch('fill', started, at(0));
    store.batch('cap', started, at(0.5));
    for (let m = 0; m <= 30; m++) {
      const ts = at(m);
      store.counters(
        'fill',
        { good: m * 95, total: m * 100, resetAt: new Date(at(0)).toISOString() },
        ts,
      );
      store.values(
        'fill',
        {
          values: [
            { key: 'fillWeightAvg', value: m === 10 ? 2.08 : 2.01 },
            { key: 'torque', value: 1 },
          ],
        },
        ts,
        m === 20 ? 'uncertain' : 'good',
      );
      store.seen('fill', ts);
      if (m < 10 || m > 15) {
        store.counters(
          'cap',
          { good: m * 90, total: m * 90, resetAt: new Date(at(0)).toISOString() },
          ts,
        );
        store.seen('cap', ts);
      }
    }
    store.alarm(
      'fill',
      {
        alarmId: 'FILL-WGT-0003',
        event: 'raised',
        class: 'fault',
        textKey: 'a.b',
        text: { de: 'Wägezelle 3' },
        user: null,
      },
      at(12),
    );
    store.alarm(
      'fill',
      {
        alarmId: 'FILL-WGT-0003',
        event: 'cleared',
        class: 'fault',
        textKey: 'a.b',
        text: { de: 'Wägezelle 3' },
        user: null,
      },
      at(14),
    );
    store.batch('fill', { ...started, event: 'ended' }, at(30));
    store.batch('cap', { ...started, event: 'ended' }, at(30.5));
  }

  it('fasst die Maschinen zu einem Batch zusammen; beendet erst, wenn alle beendet sind', () => {
    const started = {
      event: 'started' as const,
      batchId: 'B-1',
      recipe: { id: 'r', version: 1 },
      formatParts: ['FT-1'],
    };
    store.batch('fill', started, at(0));
    store.batch('cap', started, at(1));
    store.batch('fill', { ...started, event: 'ended' }, at(20));
    expect(store.get('B-1')).toMatchObject({ status: 'running', machines: ['fill', 'cap'] });
    store.batch('cap', { ...started, event: 'ended' }, at(21));
    expect(store.get('B-1')).toMatchObject({
      status: 'ended',
      endedAt: new Date(at(21)).toISOString(),
    });
  });

  it('Linienfreigabe gilt für den nächsten Batch (E-40)', async () => {
    const seq = write('qa', {
      action: STEPS.lineRelease.action,
      meaning: 'Linienfreigabe',
      reference: LINE_RELEASE_REFERENCE,
    });
    expect((await post('qa', '/line-release', seq)).statusCode).toBe(201);
    runBatch();
    expect(store.get('B-1')?.lineRelease).toMatchObject({ seq, username: 'qa', afterStart: false });
    expect(store.pendingLineRelease()).toBeNull();
  });

  it('Ablauf bis zur Freigabe mit Vier-Augen-Prinzip (E-41)', async () => {
    runBatch();
    clock = at(31);
    // Räumung nur mit Recht und passendem Eintrag
    const wrong = write('operator', { action: 'batch.line-cleared', reference: reference('B-2') });
    expect((await post('operator', '/batches/B-1/clearance', wrong)).statusCode).toBe(400);
    const cleared = write('operator', {
      action: 'batch.line-cleared',
      reference: reference('B-1'),
    });
    expect((await post('operator', '/batches/B-1/clearance', cleared)).statusCode).toBe(201);
    const frozen = store.get('B-1') as BatchSummary;
    expect(frozen.status).toBe('frozen');
    const report = store.report('B-1');
    expect(frozen.reportHash).toBe(report ? reportHash(report) : null);

    // Prüfung muss genau diesen Bericht signieren
    const badHash = write('setup', {
      action: 'batch.report-reviewed',
      meaning: 'Geprüft',
      reference: reference('B-1'),
      newValue: 'sha256:falsch',
    });
    expect((await post('setup', '/batches/B-1/review', badHash)).statusCode).toBe(400);
    const reviewed = write('setup', {
      action: 'batch.report-reviewed',
      meaning: 'Geprüft',
      reference: reference('B-1'),
      newValue: frozen.reportHash,
    });
    expect((await post('setup', '/batches/B-1/review', reviewed)).statusCode).toBe(201);

    // Service hat alle Rechte, darf aber nicht prüfen und freigeben zugleich
    const svcReview = write('service', {
      action: 'batch.report-reviewed',
      meaning: 'Geprüft',
      reference: reference('B-1'),
      newValue: frozen.reportHash,
    });
    expect((await post('service', '/batches/B-1/review', svcReview)).statusCode).toBe(409);
    const sameUser = write('setup', {
      action: 'batch.report-released',
      meaning: 'Freigabe',
      reference: reference('B-1'),
      newValue: frozen.reportHash,
    });
    expect((await post('setup', '/batches/B-1/release', sameUser)).statusCode).toBe(403);
    const released = write('qa', {
      action: 'batch.report-released',
      meaning: 'Freigabe',
      reference: reference('B-1'),
      newValue: frozen.reportHash,
    });
    expect((await post('qa', '/batches/B-1/release', released)).statusCode).toBe(201);
    const detail = (await get('qa', '/batches/B-1')).json<BatchDetail>();
    expect(detail.status).toBe('released');
    // Alle Vorgänge zu diesem Batch stehen im Audit Trail – auch abgewiesene Versuche
    expect(detail.audit.map((a) => a.action)).toEqual([
      'batch.line-cleared',
      'batch.report-reviewed',
      'batch.report-reviewed',
      'batch.report-reviewed',
      'batch.report-released',
      'batch.report-released',
    ]);
  });

  it('der Bericht enthält Mengen, GxP-Werte, Alarme und Datenlücken; eingefroren ist unveränderbar', async () => {
    runBatch();
    clock = at(31);
    await post(
      'operator',
      '/batches/B-1/clearance',
      write('operator', { action: 'batch.line-cleared', reference: reference('B-1') }),
    );
    const report = store.report('B-1');
    const fill = report?.machines.find((m) => m.machineId === 'fill');
    const cap = report?.machines.find((m) => m.machineId === 'cap');
    expect(fill?.counts).toMatchObject({ good: 2850, total: 3000, bad: 150, implausible: 0 });
    // nur GxP-Werte, mit Grenzverletzung und Qualität
    expect(fill?.values.map((v) => v.key)).toEqual(['fillWeightAvg']);
    expect(fill?.values[0]).toMatchObject({ count: 31, outOfLimits: 1, uncertain: 1, high: 2.08 });
    expect(fill?.alarms).toHaveLength(1);
    expect(cap?.gaps).toEqual([
      { from: new Date(at(9)).toISOString(), to: new Date(at(16)).toISOString() },
    ]);
    expect(at(16) - at(9)).toBeGreaterThan(GAP_MS);
    if (!report) throw new Error('Bericht fehlt');
    expect(() => {
      store.freeze('B-1', report, 'sha256:anders');
    }).toThrow(/eingefroren/);
  });

  it('kanonisches JSON ist unabhängig von der Reihenfolge der Schlüssel', () => {
    expect(canonical({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(canonical({ a: [{ c: 3, d: 2 }], b: 1 }));
  });

  it('PDF/A-2b mit eingebetteter Schrift, nur mit batch.export', async () => {
    runBatch();
    clock = at(31);
    await post(
      'operator',
      '/batches/B-1/clearance',
      write('operator', { action: 'batch.line-cleared', reference: reference('B-1') }),
    );
    expect((await get('setup', '/batches/B-1/report.pdf')).statusCode).toBe(403);
    const response = await get('qa', '/batches/B-1/report.pdf');
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    const pdf = response.rawPayload.toString('latin1');
    expect(pdf.startsWith('%PDF-1.7')).toBe(true);
    expect(pdf).toContain('<pdfaid:part>2</pdfaid:part>');
    expect(pdf).toContain('<pdfaid:conformance>B</pdfaid:conformance>');
    expect(pdf).toContain('/FontFile2');
    expect(pdf).toContain('/OutputIntents');
    expect(pdf).not.toMatch(/\/BaseFont \/Helvetica/);
  });
});
