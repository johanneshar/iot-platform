import {
  readProxyUser,
  userCan,
  type AuditEntryInfo,
  type ProxyUser,
} from '@iot/module-sdk/server';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import {
  ACTIONS,
  procedureReference,
  reference,
  scanMatches,
  stepAuditValue,
  summarize,
  type ActionStep,
  type AuditRef,
  type Change,
  type FormatRef,
  type FormatState,
  type LineCheck,
  type Procedure,
  type StepScans,
} from '../shared/format';
import { parseProcedure } from './procedures';
import { recordHash, type FormatStore, type ReportedRecipe } from './store';

export interface LineView {
  /** Zustand der Linie für die Prüfung „Linie leerfahren“ */
  check: () => LineCheck;
  /** machineIds der Linie (Prüfung importierter Abläufe) */
  machineIds: () => string[];
  /** Rezepte laut letzter Batch-Meldung je Maschine */
  recipes: () => ReportedRecipe[];
}

export interface AppDeps {
  store: FormatStore;
  audit: { entry: (seq: number) => Promise<AuditEntryInfo | null> };
  line: LineView;
  token: string;
  now?: () => Date;
  logger?: boolean;
}

/** Ein Schritt muss kurz vorher im Audit Trail stehen – kein Wiederverwenden alter Einträge */
const MAX_AGE_MS = 10 * 60_000;

const sameRecipe = (a: FormatRef['recipe'], b: FormatRef['recipe']) =>
  a.id === b.id && a.version === b.version;

/**
 * Aktuelles Format der Linie: Zielformat des letzten freigegebenen Wechsels, solange danach kein Batch
 * mit anderem Rezept gestartet ist; sonst das Format zum Rezept des letzten Batches.
 */
export function currentFormat(
  procedures: readonly Procedure[],
  last: Change | null,
  recipes: readonly ReportedRecipe[],
): FormatRef | null {
  const latest = [...recipes].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  const releasedAt = last?.released ? Date.parse(last.released.ts) : null;
  if (last && releasedAt !== null && (!latest || Date.parse(latest.at) <= releasedAt))
    return last.procedure.to;
  if (!latest) return null;
  for (const p of procedures)
    for (const ref of [p.from, p.to]) if (sameRecipe(ref.recipe, latest.recipe)) return ref;
  return null;
}

/** API des geführten Formatwechsels – erreichbar über `/api/modules/format/…` im Core. */
export function buildApp({
  store,
  audit,
  line,
  token,
  now = () => new Date(),
  logger = true,
}: AppDeps): FastifyInstance {
  const app = Fastify({ logger });

  app.addHook('onRequest', async (request, reply) => {
    if (
      !request.url.startsWith('/state') &&
      !request.url.startsWith('/changes') &&
      !request.url.startsWith('/procedures')
    )
      return;
    const user = readProxyUser(request.headers, token);
    if (!user) return reply.code(401).send({ errors: ['nur über den Core erreichbar'] });
    request.user = user;
  });

  const fail = (reply: FastifyReply, code: number, message: string) =>
    reply.code(code).send({ errors: [message] });

  /** Prüft einen Eintrag im Audit Trail des Core: Vorgang, Benutzer, Recht, Bezug, Inhalt, Alter. */
  async function verify(
    user: ProxyUser,
    seq: unknown,
    step: ActionStep,
    expected: { reference: string; newValue: string },
  ): Promise<AuditRef | string> {
    if (!userCan(user, step.permission)) return `Recht ${step.permission} fehlt`;
    if (typeof seq !== 'number' || !Number.isInteger(seq))
      return 'seq (laufende Nummer im Audit Trail) erforderlich';
    const entry = await audit.entry(seq);
    if (
      !entry ||
      entry.module !== 'format' ||
      entry.action !== step.action ||
      entry.username !== user.username ||
      entry.reference !== expected.reference ||
      entry.meaning !== step.meaning ||
      entry.newValue !== expected.newValue
    )
      return 'Eintrag im Audit Trail passt nicht zu diesem Schritt';
    if (now().getTime() - Date.parse(entry.ts) > MAX_AGE_MS)
      return 'Eintrag im Audit Trail ist zu alt';
    return {
      seq: entry.seq,
      ts: entry.ts,
      username: entry.username,
      userName: entry.userName,
      meaning: entry.meaning,
    };
  }

  /** Protokoll-Hash, sobald alle Schritte bestätigt sind */
  const withHash = (change: Change): Change =>
    change.status === 'running'
      ? {
          ...change,
          recordHash:
            change.steps.length === change.procedure.steps.length ? recordHash(change) : null,
        }
      : change;

  const state = (): FormatState => {
    const procedures = store.procedures();
    const last = store.lastReleased();
    const current = currentFormat(procedures, last, line.recipes());
    const open = store.open();
    return {
      current,
      targets: current
        ? procedures.filter((p) => sameRecipe(p.from.recipe, current.recipe)).map(summarize)
        : [],
      change: open ? withHash(open) : null,
      last,
      line: line.check(),
      procedures: procedures.map(summarize),
    };
  };

  /** Lädt den Wechsel für einen Schritt; Fehlertext, wenn er nicht (mehr) bearbeitet werden kann. */
  const editable = (id: string, status: Change['status'][]): Change | string => {
    const change = store.change(id);
    if (!change) return 'Formatwechsel unbekannt';
    if (!status.includes(change.status))
      return `Formatwechsel ist ${change.status} – Schritt nicht möglich`;
    return change;
  };

  app.get('/state', () => state());

  // Neuen Wechsel beginnen (format.execute); höchstens einer offen
  app.post<{ Body: { procedureId?: unknown } }>('/changes', async (request, reply) => {
    const user = request.user;
    if (!user || !userCan(user, ACTIONS.started.permission))
      return fail(reply, 403, `Recht ${ACTIONS.started.permission} fehlt`);
    if (store.open()) return fail(reply, 409, 'Es läuft bereits ein Formatwechsel');
    const current = state();
    const target = current.targets.find((t) => t.id === request.body.procedureId);
    const procedure = target ? store.procedure(target.id) : null;
    if (!procedure) return fail(reply, 400, 'Ablauf passt nicht zum aktuellen Format');
    const at = now();
    const change: Change = {
      id: store.nextChangeId(at.getUTCFullYear()),
      procedure,
      status: 'running',
      startedAt: at.toISOString(),
      startedBy: { username: user.username, userName: user.displayName },
      steps: [],
      recordHash: null,
      performed: null,
      released: null,
      cancelled: null,
      recipeCheck: null,
    };
    store.save(change);
    return reply.code(201).send(change);
  });

  // Nächsten Schritt bestätigen: Reihenfolge, Formatteil-Codes (E-17) und automatische Prüfung
  app.post<{
    Params: { id: string };
    Body: { stepId?: unknown; scans?: StepScans | null; seq?: unknown };
  }>('/changes/:id/steps', async (request, reply) => {
    const user = request.user;
    if (!user) return fail(reply, 401, 'nicht angemeldet');
    const change = editable(request.params.id, ['running']);
    if (typeof change === 'string') return fail(reply, 409, change);
    const step = change.procedure.steps[change.steps.length];
    if (!step) return fail(reply, 409, 'Alle Schritte sind bereits bestätigt');
    if (request.body.stepId !== step.id)
      return fail(reply, 409, `Als Nächstes ist Schritt ${step.id} dran`);
    const scans = step.part ? (request.body.scans ?? null) : null;
    if (!scanMatches(step, scans)) return fail(reply, 400, 'Codes passen nicht zum Formatteil');
    if (step.check === 'line-stopped' && !line.check().stopped)
      return fail(reply, 409, 'Noch nicht alle Maschinen melden Stopped');
    const ref = await verify(user, request.body.seq, ACTIONS.step, {
      reference: reference(change.id),
      newValue: stepAuditValue(step, scans),
    });
    if (typeof ref === 'string') return fail(reply, 400, ref);
    const next: Change = {
      ...change,
      steps: [...change.steps, { stepId: step.id, confirmed: ref, scans }],
    };
    store.save(next);
    return reply.code(201).send(withHash(next));
  });

  // Letzten Schritt zurücknehmen (Mockup „Zurück“) – mit Eintrag im Audit Trail
  app.post<{ Params: { id: string }; Body: { seq?: unknown } }>(
    '/changes/:id/revert',
    async (request, reply) => {
      const user = request.user;
      if (!user) return fail(reply, 401, 'nicht angemeldet');
      const change = editable(request.params.id, ['running']);
      if (typeof change === 'string') return fail(reply, 409, change);
      const last = change.steps.at(-1);
      if (!last) return fail(reply, 409, 'Noch kein Schritt bestätigt');
      const ref = await verify(user, request.body.seq, ACTIONS.revert, {
        reference: reference(change.id),
        newValue: last.stepId,
      });
      if (typeof ref === 'string') return fail(reply, 400, ref);
      const next: Change = { ...change, steps: change.steps.slice(0, -1) };
      store.save(next);
      return reply.code(201).send(withHash(next));
    },
  );

  app.post<{ Params: { id: string }; Body: { seq?: unknown } }>(
    '/changes/:id/cancel',
    async (request, reply) => {
      const user = request.user;
      if (!user) return fail(reply, 401, 'nicht angemeldet');
      const change = editable(request.params.id, ['running', 'performed']);
      if (typeof change === 'string') return fail(reply, 409, change);
      const ref = await verify(user, request.body.seq, ACTIONS.cancel, {
        reference: reference(change.id),
        newValue: change.id,
      });
      if (typeof ref === 'string') return fail(reply, 400, ref);
      const next: Change = { ...change, status: 'cancelled', cancelled: ref };
      store.save(next);
      return reply.code(201).send(next);
    },
  );

  // Erste Signatur „Durchgeführt“ (format.sign), gebunden an den Protokoll-Hash
  app.post<{ Params: { id: string }; Body: { seq?: unknown } }>(
    '/changes/:id/perform',
    async (request, reply) => {
      const user = request.user;
      if (!user) return fail(reply, 401, 'nicht angemeldet');
      const change = editable(request.params.id, ['running']);
      if (typeof change === 'string') return fail(reply, 409, change);
      if (change.steps.length !== change.procedure.steps.length)
        return fail(reply, 409, 'Noch nicht alle Schritte bestätigt');
      const hash = recordHash(change);
      const ref = await verify(user, request.body.seq, ACTIONS.perform, {
        reference: reference(change.id),
        newValue: hash,
      });
      if (typeof ref === 'string') return fail(reply, 400, ref);
      const next: Change = { ...change, status: 'performed', recordHash: hash, performed: ref };
      store.save(next);
      return reply.code(201).send(next);
    },
  );

  // Zweite Signatur „Freigabe“ (format.release) – Vier-Augen-Prinzip (E-50)
  app.post<{ Params: { id: string }; Body: { seq?: unknown } }>(
    '/changes/:id/release',
    async (request, reply) => {
      const user = request.user;
      if (!user) return fail(reply, 401, 'nicht angemeldet');
      const change = editable(request.params.id, ['performed']);
      if (typeof change === 'string') return fail(reply, 409, change);
      if (change.performed?.username === user.username)
        return fail(
          reply,
          403,
          'Vier-Augen-Prinzip: Durchführung und Freigabe durch verschiedene Personen',
        );
      const ref = await verify(user, request.body.seq, ACTIONS.release, {
        reference: reference(change.id),
        newValue: change.recordHash ?? '',
      });
      if (typeof ref === 'string') return fail(reply, 400, ref);
      const next: Change = { ...change, status: 'released', released: ref };
      store.save(next);
      return reply.code(201).send(next);
    },
  );

  app.get('/procedures', () => store.procedures());

  // Ablauf einrichten (E-15, format.configure): neue Version eines Ablaufs als JSON
  app.post<{ Body: { procedure?: unknown; seq?: unknown } }>(
    '/procedures',
    async (request, reply) => {
      const user = request.user;
      if (!user) return fail(reply, 401, 'nicht angemeldet');
      if (!userCan(user, ACTIONS.imported.permission))
        return fail(reply, 403, `Recht ${ACTIONS.imported.permission} fehlt`);
      const result = parseProcedure(request.body.procedure, line.machineIds());
      if ('errors' in result) return reply.code(400).send({ errors: result.errors });
      const { procedure } = result;
      if (procedure.version <= store.latestVersion(procedure.id))
        return fail(
          reply,
          409,
          `Version ${String(procedure.version)} ist nicht neuer als die eingerichtete (${String(store.latestVersion(procedure.id))})`,
        );
      const ref = await verify(user, request.body.seq, ACTIONS.imported, {
        reference: procedureReference(procedure.id),
        newValue: `${procedure.id} v${String(procedure.version)}`,
      });
      if (typeof ref === 'string') return fail(reply, 400, ref);
      store.addProcedure(procedure, ref.ts, ref.username);
      return reply.code(201).send(summarize(procedure));
    },
  );

  return app;
}

/**
 * Rezeptprüfung (E-51): beim ersten Batchstart nach der Freigabe vergleichen, ob die Maschinen das
 * Zielrezept melden. Liefert den aktualisierten Wechsel oder `null`, wenn nichts zu tun ist.
 */
export function checkRecipe(change: Change | null, reported: ReportedRecipe): Change | null {
  if (!change?.released || reported.event !== 'started') return null;
  if (Date.parse(reported.at) < Date.parse(change.released.ts)) return null;
  const check = change.recipeCheck;
  if (check && check.batchId !== reported.batchId) return null; // nur der erste Batch zählt
  const machines = [
    ...(check?.machines.filter((m) => m.machineId !== reported.machineId) ?? []),
    { machineId: reported.machineId, recipe: reported.recipe },
  ].sort((a, b) => a.machineId.localeCompare(b.machineId));
  return {
    ...change,
    recipeCheck: {
      batchId: reported.batchId,
      at: check?.at ?? reported.at,
      machines,
      ok: machines.every((m) => sameRecipe(m.recipe, change.procedure.to.recipe)),
    },
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: ProxyUser;
  }
}
