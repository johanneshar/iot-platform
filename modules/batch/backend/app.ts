import {
  readProxyUser,
  userCan,
  type AuditEntryInfo,
  type LineConfig,
  type ProxyUser,
} from '@iot/module-sdk/server';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import type { AuditRef, BatchDetail, PendingLineRelease } from '../shared/batch';
import { buildReport, countsOf, reportHash } from './report';
import type { BatchStore } from './store';
import { renderReportPdf } from './pdf';

export interface AuditReader {
  entry: (seq: number) => Promise<AuditEntryInfo | null>;
  byReference: (reference: string) => Promise<AuditEntryInfo[]>;
}

export interface AppDeps {
  store: BatchStore;
  audit: AuditReader;
  line: () => LineConfig | null;
  token: string;
  now?: () => Date;
  logger?: boolean;
}

/** Ein Schritt muss kurz vorher im Audit Trail stehen – kein Wiederverwenden alter Einträge */
const MAX_AGE_MS = 10 * 60_000;

export const reference = (batchId: string) => `batch:${batchId}`;
export const LINE_RELEASE_REFERENCE = 'batch:line-release';

/** Vorgänge und Bedeutungen der Schritte (E-40, E-41) */
export const STEPS = {
  lineRelease: {
    action: 'batch.line-released',
    meaning: 'Linienfreigabe',
    permission: 'batch.sign',
  },
  clearance: { action: 'batch.line-cleared', meaning: null, permission: 'batch.clear' },
  review: { action: 'batch.report-reviewed', meaning: 'Geprüft', permission: 'batch.review' },
  release: { action: 'batch.report-released', meaning: 'Freigabe', permission: 'batch.sign' },
} as const;

type Step = (typeof STEPS)[keyof typeof STEPS];

/** API des Batch-Reportings – erreichbar über `/api/modules/batch/…` im Core. */
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
    if (!request.url.startsWith('/batches') && !request.url.startsWith('/line-release')) return;
    const user = readProxyUser(request.headers, token);
    if (!user) return reply.code(401).send({ errors: ['nur über den Core erreichbar'] });
    request.user = user;
  });

  const fail = (reply: FastifyReply, code: number, message: string) =>
    reply.code(code).send({ errors: [message] });

  /** Prüft einen Eintrag im Audit Trail des Core: richtiger Vorgang, Benutzer, Recht, Bezug, Inhalt. */
  async function verify(
    user: ProxyUser,
    seq: unknown,
    step: Step,
    expected: { reference: string; newValue?: string },
  ): Promise<AuditRef | string> {
    if (!userCan(user, step.permission)) return `Recht ${step.permission} fehlt`;
    if (typeof seq !== 'number' || !Number.isInteger(seq))
      return 'seq (laufende Nummer im Audit Trail) erforderlich';
    const entry = await audit.entry(seq);
    if (
      !entry ||
      entry.module !== 'batch' ||
      entry.action !== step.action ||
      entry.username !== user.username ||
      entry.reference !== expected.reference ||
      (step.meaning !== null && entry.meaning !== step.meaning) ||
      (expected.newValue !== undefined && entry.newValue !== expected.newValue)
    ) {
      return 'Eintrag im Audit Trail passt nicht zu diesem Schritt';
    }
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

  app.get('/batches', () => store.list());

  app.get('/line-release', (): PendingLineRelease => ({ release: store.pendingLineRelease() }));

  app.post<{ Body: { seq?: unknown } }>('/line-release', async (request, reply) => {
    const user = request.user;
    if (!user) return fail(reply, 401, 'nicht angemeldet');
    const ref = await verify(user, request.body.seq, STEPS.lineRelease, {
      reference: LINE_RELEASE_REFERENCE,
    });
    if (typeof ref === 'string') return fail(reply, 400, ref);
    store.addLineRelease(ref);
    return reply.code(201).send({ release: ref });
  });

  app.get<{ Params: { id: string } }>('/batches/:id', async (request, reply) => {
    const batch = store.get(request.params.id);
    if (!batch) return fail(reply, 404, 'Batch unbekannt');
    const entries = await audit.byReference(reference(batch.batchId));
    const lineRelease = batch.lineRelease ? await audit.entry(batch.lineRelease.seq) : null;
    const detail: BatchDetail = {
      ...batch,
      counts: batch.machines.map((m) => countsOf(store, batch.batchId, m)),
      report: store.report(batch.batchId),
      audit: [...(lineRelease ? [lineRelease] : []), ...entries].map((e) => ({
        seq: e.seq,
        ts: e.ts,
        userName: e.userName,
        action: e.action,
        meaning: e.meaning,
        oldValue: e.oldValue,
        newValue: e.newValue,
        reason: e.reason,
      })),
    };
    return detail;
  });

  // Linienräumung bestätigt → Bericht einfrieren (ADR-011)
  app.post<{ Params: { id: string }; Body: { seq?: unknown } }>(
    '/batches/:id/clearance',
    async (request, reply) => {
      const user = request.user;
      const config = line();
      if (!user) return fail(reply, 401, 'nicht angemeldet');
      if (!config) return fail(reply, 503, 'Linienkonfiguration noch nicht geladen');
      const batch = store.get(request.params.id);
      if (!batch) return fail(reply, 404, 'Batch unbekannt');
      if (batch.status !== 'ended')
        return fail(reply, 409, 'Linienräumung nur nach Batchende und nur einmal');
      const ref = await verify(user, request.body.seq, STEPS.clearance, {
        reference: reference(batch.batchId),
      });
      if (typeof ref === 'string') return fail(reply, 400, ref);
      const report = buildReport(store, batch.batchId, config, ref, now());
      store.setStep(batch.batchId, 'clearance', ref);
      store.freeze(batch.batchId, report, reportHash(report));
      return reply.code(201).send(store.get(batch.batchId));
    },
  );

  app.post<{ Params: { id: string }; Body: { seq?: unknown } }>(
    '/batches/:id/review',
    async (request, reply) => {
      const user = request.user;
      if (!user) return fail(reply, 401, 'nicht angemeldet');
      const batch = store.get(request.params.id);
      if (!batch?.reportHash) return fail(reply, 404, 'Bericht unbekannt');
      if (batch.status !== 'frozen')
        return fail(reply, 409, 'Prüfung nur einmal, nach dem Einfrieren');
      const ref = await verify(user, request.body.seq, STEPS.review, {
        reference: reference(batch.batchId),
        newValue: batch.reportHash,
      });
      if (typeof ref === 'string') return fail(reply, 400, ref);
      store.setStep(batch.batchId, 'review', ref);
      return reply.code(201).send(store.get(batch.batchId));
    },
  );

  // Freigabe durch QA – Vier-Augen-Prinzip (E-41): nicht dieselbe Person wie bei „Geprüft“
  app.post<{ Params: { id: string }; Body: { seq?: unknown } }>(
    '/batches/:id/release',
    async (request, reply) => {
      const user = request.user;
      if (!user) return fail(reply, 401, 'nicht angemeldet');
      const batch = store.get(request.params.id);
      if (!batch?.reportHash) return fail(reply, 404, 'Bericht unbekannt');
      if (batch.status !== 'reviewed')
        return fail(reply, 409, 'Freigabe erst nach „Geprüft“ und nur einmal');
      if (batch.review?.username === user.username)
        return fail(
          reply,
          403,
          'Vier-Augen-Prinzip: Prüfung und Freigabe durch verschiedene Personen',
        );
      const ref = await verify(user, request.body.seq, STEPS.release, {
        reference: reference(batch.batchId),
        newValue: batch.reportHash,
      });
      if (typeof ref === 'string') return fail(reply, 400, ref);
      store.setStep(batch.batchId, 'release', ref);
      return reply.code(201).send(store.get(batch.batchId));
    },
  );

  app.get<{ Params: { id: string } }>('/batches/:id/report.pdf', async (request, reply) => {
    const user = request.user;
    if (!user || !userCan(user, 'batch.export'))
      return fail(reply, 403, 'Recht batch.export fehlt');
    const batch = store.get(request.params.id);
    const report = batch ? store.report(batch.batchId) : null;
    if (!batch || !report || !batch.reportHash)
      return fail(reply, 404, 'Bericht noch nicht eingefroren');
    const pdf = await renderReportPdf(report, batch);
    return reply
      .type('application/pdf')
      .header('content-disposition', `attachment; filename="Batchbericht-${batch.batchId}.pdf"`)
      .send(pdf);
  });

  return app;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: ProxyUser;
  }
}
