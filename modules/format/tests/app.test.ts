import { proxyHeaders, type AuditEntryInfo, type ProxyUser } from '@iot/module-sdk/server';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp, checkRecipe, currentFormat } from '../backend/app';
import { loadProcedures } from '../backend/procedures';
import { FormatStore, type ReportedRecipe } from '../backend/store';
import {
  ACTIONS,
  reference,
  stepAuditValue,
  type ActionStep,
  type Change,
  type FormatState,
  type LineCheck,
} from '../shared/format';

const DIR = fileURLToPath(
  new URL('../../../packages/simulator/fixtures/format-procedures', import.meta.url),
);
const TOKEN = 'test-token';
const NOW = new Date('2026-10-25T08:00:00.000Z');
const { procedures } = loadProcedures(DIR);
const procedure = procedures[0];
if (!procedure) throw new Error('Ablauf fehlt');

const setup: ProxyUser = {
  username: 'setup',
  displayName: '[Setup Man]',
  permissions: ['format.execute', 'format.sign'],
};
const qa: ProxyUser = { username: 'qa', displayName: '[QA]', permissions: ['format.release'] };
const service: ProxyUser = { username: 'service', displayName: '[Service]', permissions: ['*'] };

const vialBatch: ReportedRecipe = {
  machineId: 'l3-fill',
  batchId: 'B-2026-3001',
  event: 'started',
  recipe: { id: 'vial-nest', version: 1 },
  at: '2026-10-25T04:05:00.000Z',
};

describe('API des Formatwechsels', () => {
  let store: FormatStore;
  let app: ReturnType<typeof buildApp>;
  let entries: AuditEntryInfo[];
  let line: LineCheck;
  let recipes: ReportedRecipe[];

  beforeEach(() => {
    store = new FormatStore(':memory:');
    store.addProcedure(procedure, NOW.toISOString(), 'system');
    entries = [];
    line = { stopped: false, notStopped: ['Isolator', 'Bördelmodul'] };
    recipes = [vialBatch];
    app = buildApp({
      store,
      audit: { entry: async (seq) => Promise.resolve(entries.find((e) => e.seq === seq) ?? null) },
      line: {
        check: () => line,
        machineIds: () => ['l3-iso', 'l3-debag', 'l3-delid', 'l3-fill', 'l3-transfer', 'l3-cap'],
        recipes: () => recipes,
      },
      token: TOKEN,
      now: () => NOW,
      logger: false,
    });
  });
  afterEach(async () => {
    await app.close();
    store.close();
  });

  /** Eintrag im Audit Trail, wie ihn die Shell über den Core anlegt */
  const record = (user: ProxyUser, step: ActionStep, ref: string, newValue: string) => {
    const seq = entries.length + 1;
    entries.push({
      seq,
      ts: NOW.toISOString(),
      username: user.username,
      userName: user.displayName,
      action: step.action,
      module: 'format',
      oldValue: null,
      newValue,
      reason: null,
      meaning: step.meaning,
      reference: ref,
      hash: `sha256:test-${String(seq)}`,
    });
    return seq;
  };
  const post = (user: ProxyUser, url: string, payload: object) =>
    app.inject({ method: 'POST', url, headers: proxyHeaders(user, TOKEN), payload });
  const getState = async (user = setup) =>
    (
      await app.inject({ method: 'GET', url: '/state', headers: proxyHeaders(user, TOKEN) })
    ).json<FormatState>();

  const start = async () => {
    const response = await post(setup, '/changes', { procedureId: procedure.id });
    expect(response.statusCode).toBe(201);
    return response.json<Change>();
  };
  const confirmAll = async (change: Change) => {
    line = { stopped: true, notStopped: [] };
    for (const step of procedure.steps) {
      const scans = step.part
        ? { part: step.part.id, slot: step.part.slot, source: 'scanner' as const }
        : null;
      const seq = record(setup, ACTIONS.step, reference(change.id), stepAuditValue(step, scans));
      const response = await post(setup, `/changes/${change.id}/steps`, {
        stepId: step.id,
        scans,
        seq,
      });
      expect(response.statusCode).toBe(201);
    }
  };

  it('aktuelles Format aus dem Rezept des laufenden Batches, Ziel Spritze im Nest', async () => {
    const state = await getState();
    expect(state.current?.format.de).toBe('Vial im Nest');
    expect(state.targets.map((t) => [t.to.format.de, t.stepCount])).toEqual([
      ['Spritze im Nest', procedure.steps.length],
    ]);
    expect(state.change).toBeNull();
  });

  it('ohne Recht kein Start; höchstens ein offener Wechsel', async () => {
    expect((await post(qa, '/changes', { procedureId: procedure.id })).statusCode).toBe(403);
    await start();
    expect((await post(setup, '/changes', { procedureId: procedure.id })).statusCode).toBe(409);
  });

  it('„Linie leerfahren“ erst, wenn alle Maschinen stehen', async () => {
    const change = await start();
    const first = procedure.steps[0];
    if (!first) throw new Error('Schritt fehlt');
    const seq = record(setup, ACTIONS.step, reference(change.id), first.id);
    const blocked = await post(setup, `/changes/${change.id}/steps`, { stepId: first.id, seq });
    expect(blocked.statusCode).toBe(409);
    line = { stopped: true, notStopped: [] };
    const ok = await post(setup, `/changes/${change.id}/steps`, { stepId: first.id, seq });
    expect(ok.statusCode).toBe(201);
  });

  it('Formatteil: falscher Code, falscher Schritt oder fremder Audit-Eintrag werden abgelehnt', async () => {
    const change = await start();
    line = { stopped: true, notStopped: [] };
    const partIndex = procedure.steps.findIndex((s) => s.part);
    for (const step of procedure.steps.slice(0, partIndex)) {
      const seq = record(setup, ACTIONS.step, reference(change.id), step.id);
      await post(setup, `/changes/${change.id}/steps`, { stepId: step.id, seq });
    }
    const step = procedure.steps[partIndex];
    if (!step?.part) throw new Error('Formatteil fehlt');
    const wrong = { part: 'FT-2041', slot: step.part.slot, source: 'manual' };
    const seqWrong = record(setup, ACTIONS.step, reference(change.id), 'x');
    expect(
      (
        await post(setup, `/changes/${change.id}/steps`, {
          stepId: step.id,
          scans: wrong,
          seq: seqWrong,
        })
      ).statusCode,
    ).toBe(400);
    const next = procedure.steps[partIndex + 1];
    expect(
      (await post(setup, `/changes/${change.id}/steps`, { stepId: next?.id, seq: seqWrong }))
        .statusCode,
    ).toBe(409);
    const scans = { part: step.part.id, slot: step.part.slot, source: 'manual' as const };
    // Audit-Eintrag eines anderen Benutzers passt nicht
    const foreign = record(
      service,
      ACTIONS.step,
      reference(change.id),
      stepAuditValue(step, scans),
    );
    expect(
      (await post(setup, `/changes/${change.id}/steps`, { stepId: step.id, scans, seq: foreign }))
        .statusCode,
    ).toBe(400);
    const seq = record(setup, ACTIONS.step, reference(change.id), stepAuditValue(step, scans));
    const ok = await post(setup, `/changes/${change.id}/steps`, { stepId: step.id, scans, seq });
    expect(ok.json<Change>().steps.at(-1)?.scans).toEqual(scans);
  });

  it('Zurück nimmt den letzten Schritt zurück', async () => {
    const change = await start();
    line = { stopped: true, notStopped: [] };
    const first = procedure.steps[0];
    if (!first) throw new Error('Schritt fehlt');
    await post(setup, `/changes/${change.id}/steps`, {
      stepId: first.id,
      seq: record(setup, ACTIONS.step, reference(change.id), first.id),
    });
    const seq = record(setup, ACTIONS.revert, reference(change.id), first.id);
    const reverted = await post(setup, `/changes/${change.id}/revert`, { seq });
    expect(reverted.json<Change>().steps).toEqual([]);
  });

  it('Abschluss im Vier-Augen-Prinzip, gebunden an den Protokoll-Hash (E-50)', async () => {
    const change = await start();
    expect((await post(setup, `/changes/${change.id}/perform`, { seq: 1 })).statusCode).toBe(409);
    await confirmAll(change);
    const state = await getState();
    const hash = state.change?.recordHash;
    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    if (!hash) throw new Error('Hash fehlt');

    const performed = await post(setup, `/changes/${change.id}/perform`, {
      seq: record(setup, ACTIONS.perform, reference(change.id), hash),
    });
    expect(performed.json<Change>()).toMatchObject({ status: 'performed', recordHash: hash });

    // dieselbe Person darf nicht freigeben – auch nicht mit allen Rechten
    const self: ProxyUser = { ...service, username: 'setup' };
    const denied = await post(self, `/changes/${change.id}/release`, {
      seq: record(self, ACTIONS.release, reference(change.id), hash),
    });
    expect(denied.statusCode).toBe(403);
    // Setup Man hat kein Freigaberecht
    const noRight = await post({ ...setup, username: 'setup2' }, `/changes/${change.id}/release`, {
      seq: record({ ...setup, username: 'setup2' }, ACTIONS.release, reference(change.id), hash),
    });
    expect(noRight.statusCode).toBe(400);
    // falscher Hash
    const wrongHash = await post(qa, `/changes/${change.id}/release`, {
      seq: record(qa, ACTIONS.release, reference(change.id), 'sha256:00'),
    });
    expect(wrongHash.statusCode).toBe(400);

    const released = await post(qa, `/changes/${change.id}/release`, {
      seq: record(qa, ACTIONS.release, reference(change.id), hash),
    });
    expect(released.json<Change>()).toMatchObject({
      status: 'released',
      released: { username: 'qa', meaning: 'Freigabe' },
    });
    const after = await getState();
    expect(after.change).toBeNull();
    expect(after.current?.format.de).toBe('Spritze im Nest');
    expect(after.last?.id).toBe(change.id);
  });

  it('Abbrechen beendet den Wechsel', async () => {
    const change = await start();
    const seq = record(setup, ACTIONS.cancel, reference(change.id), change.id);
    expect((await post(setup, `/changes/${change.id}/cancel`, { seq })).json<Change>().status).toBe(
      'cancelled',
    );
    expect((await getState()).change).toBeNull();
  });

  it('Ablauf einrichten: nur neuere Versionen, nur mit format.configure', async () => {
    const admin: ProxyUser = {
      username: 'admin',
      displayName: '[Admin]',
      permissions: ['format.configure'],
    };
    const next = {
      ...procedure,
      version: 2,
      steps: procedure.steps.map((s) => ({ ...s, machine: null })),
    };
    const ref = `format:procedure:${procedure.id}`;
    expect((await post(setup, '/procedures', { procedure: next, seq: 1 })).statusCode).toBe(403);
    expect(
      (
        await post(admin, '/procedures', {
          procedure: procedure,
          seq: record(admin, ACTIONS.imported, ref, `${procedure.id} v1`),
        })
      ).statusCode,
    ).toBe(409);
    const bad = await post(admin, '/procedures', { procedure: { ...next, steps: [] }, seq: 1 });
    expect(bad.statusCode).toBe(400);
    const ok = await post(admin, '/procedures', {
      procedure: next,
      seq: record(admin, ACTIONS.imported, ref, `${procedure.id} v2`),
    });
    expect(ok.statusCode).toBe(201);
    expect(store.procedure(procedure.id)?.version).toBe(2);
  });
});

describe('Rezept und Format', () => {
  const released = (ts: string): Change => ({
    id: 'FW-2026-0001',
    procedure,
    status: 'released',
    startedAt: '2026-10-25T07:00:00.000Z',
    startedBy: { username: 'setup', userName: '[Setup Man]' },
    steps: [],
    recordHash: 'sha256:x',
    performed: null,
    released: { seq: 9, ts, username: 'qa', userName: '[QA]', meaning: 'Freigabe' },
    cancelled: null,
    recipeCheck: null,
  });

  it('nach der Freigabe gilt das Zielformat, bis ein Batch mit anderem Rezept startet', () => {
    const last = released('2026-10-25T08:00:00.000Z');
    expect(currentFormat(procedures, last, [vialBatch])?.format.de).toBe('Spritze im Nest');
    const later = { ...vialBatch, batchId: 'B-2026-3002', at: '2026-10-25T09:00:00.000Z' };
    expect(currentFormat(procedures, last, [later])?.format.de).toBe('Vial im Nest');
    expect(currentFormat(procedures, null, [])).toBeNull();
  });

  it('prüft beim ersten Batchstart nach der Freigabe das Rezept aller Maschinen', () => {
    let change: Change | null = released('2026-10-25T08:00:00.000Z');
    // Batch vor der Freigabe zählt nicht
    expect(checkRecipe(change, vialBatch)).toBeNull();
    const syringe = { id: 'syringe-nest', version: 1 };
    change = checkRecipe(change, {
      ...vialBatch,
      machineId: 'l3-fill',
      batchId: 'B-2026-3002',
      recipe: syringe,
      at: '2026-10-25T09:00:00.000Z',
    });
    expect(change?.recipeCheck).toMatchObject({ batchId: 'B-2026-3002', ok: true });
    change = checkRecipe(change, {
      ...vialBatch,
      machineId: 'l3-cap',
      batchId: 'B-2026-3002',
      at: '2026-10-25T09:00:00.000Z',
    });
    expect(change?.recipeCheck?.ok).toBe(false);
    expect(change?.recipeCheck?.machines.map((m) => m.machineId)).toEqual(['l3-cap', 'l3-fill']);
    // spätere Batches ändern das Ergebnis nicht
    expect(
      checkRecipe(change, { ...vialBatch, batchId: 'B-2026-3003', at: '2026-10-25T10:00:00.000Z' }),
    ).toBeNull();
  });
});
