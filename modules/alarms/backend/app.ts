import { readProxyUser, type ProxyUser } from '@iot/module-sdk/server';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AlarmHistory } from './history';

export interface AppDeps {
  history: AlarmHistory;
  /** Dienst-Token: nur Aufrufe über den Proxy des Core sind gültig (E-36) */
  token: string;
  /** Höchstens so weit zurück wie aufbewahrt (E-34) */
  retentionDays: number;
  logger?: boolean;
}

const days = (value: string | undefined, fallback: number, max: number): number | null => {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
};

/** API von Alarm-Analytics – erreichbar über `/api/modules/alarms/…` im Core. */
export function buildApp({
  history,
  token,
  retentionDays,
  logger = true,
}: AppDeps): FastifyInstance {
  const app = Fastify({ logger });

  app.addHook('onRequest', async (request, reply) => {
    // Statische Dateien (entry.js) frei, API nur mit Benutzer aus dem Proxy
    if (!request.url.startsWith('/history') && !request.url.startsWith('/top-faults')) return;
    const user = readProxyUser(request.headers, token);
    if (!user) return reply.code(401).send({ errors: ['nur über den Core erreichbar'] });
    request.user = user;
  });

  app.get<{ Querystring: { days?: string } }>('/history', async (request, reply) => {
    const d = days(request.query.days, 1, retentionDays);
    if (d === null)
      return reply.code(400).send({ errors: [`days: 1 bis ${String(retentionDays)}`] });
    return history.list(d);
  });

  app.get<{ Querystring: { days?: string } }>('/top-faults', async (request, reply) => {
    const d = days(request.query.days, 7, retentionDays);
    if (d === null)
      return reply.code(400).send({ errors: [`days: 1 bis ${String(retentionDays)}`] });
    return history.topFaults(d);
  });

  return app;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: ProxyUser;
  }
}
