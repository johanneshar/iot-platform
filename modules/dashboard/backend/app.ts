import { readProxyUser, type LineConfig, type ProxyUser } from '@iot/module-sdk/server';
import { plannedIntervals } from '@iot/module-sdk/time';
import Fastify, { type FastifyInstance } from 'fastify';
import type { PeriodOption } from '../shared/analysis';
import { analyse } from './analysis';
import type { HistoryStore } from './history-store';
import { bucketsOf, windowOf, type Period } from './periods';

export interface AppDeps {
  history: HistoryStore;
  periods: readonly Period[];
  /** Linienkonfiguration aus dem Core; `null`, solange der Core noch nicht geantwortet hat */
  line: () => LineConfig | null;
  /** Dienst-Token: nur Aufrufe über den Proxy des Core sind gültig (ADR-008) */
  token: string;
  now?: () => Date;
  logger?: boolean;
}

/** API des Linien-Dashboards – erreichbar über `/api/modules/dashboard/…` im Core. */
export function buildApp({
  history,
  periods,
  line,
  token,
  now = () => new Date(),
  logger = true,
}: AppDeps): FastifyInstance {
  const app = Fastify({ logger });

  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/periods') && !request.url.startsWith('/machines')) return;
    const user = readProxyUser(request.headers, token);
    if (!user) return reply.code(401).send({ errors: ['nur über den Core erreichbar'] });
    request.user = user;
  });

  app.get('/periods', (): PeriodOption[] => periods.map(({ id, label }) => ({ id, label })));

  app.get<{ Params: { id: string }; Querystring: { period?: string } }>(
    '/machines/:id/analysis',
    async (request, reply) => {
      const config = line();
      if (!config)
        return reply.code(503).send({ errors: ['Linienkonfiguration noch nicht geladen'] });
      const period = periods.find((p) => p.id === (request.query.period ?? periods[0]?.id));
      if (!period) return reply.code(400).send({ errors: ['Zeitraum unbekannt'] });
      if (!history.machineIds().includes(request.params.id))
        return reply.code(404).send({ errors: ['Maschine unbekannt'] });
      const { from, to } = windowOf(period, config, now());
      return analyse({
        machineId: request.params.id,
        period: period.id,
        from: from.getTime(),
        to: to.getTime(),
        planned: plannedIntervals(config.shifts, config.timeZone, from, to).map((p) => ({
          start: p.start.getTime(),
          end: p.end.getTime(),
        })),
        buckets: bucketsOf(from, to, config.timeZone),
        history: history.load(request.params.id, from.getTime(), to.getTime()),
      });
    },
  );

  return app;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: ProxyUser;
  }
}
