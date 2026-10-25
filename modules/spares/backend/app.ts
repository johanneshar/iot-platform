import { readProxyUser, userCan, type ProxyUser } from '@iot/module-sdk/server';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import type { Catalog, CatalogResponse, MachineInfo, RequestItem } from '../shared/spares';
import type { RequestStore } from './requests';

export interface AppDeps {
  catalog: Catalog;
  requests: RequestStore;
  /** Maschinen der Linie aus identity/state (Datenkern über MQTT) */
  machines: () => MachineInfo[];
  token: string;
  now?: () => Date;
  logger?: boolean;
}

const MAX_ITEMS = 50;

/** API des Ersatzteilkatalogs – erreichbar über `/api/modules/spares/…` im Core. */
export function buildApp({
  catalog,
  requests,
  machines,
  token,
  now = () => new Date(),
  logger = true,
}: AppDeps): FastifyInstance {
  const app = Fastify({ logger });

  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/catalog') && !request.url.startsWith('/requests')) return;
    const user = readProxyUser(request.headers, token);
    if (!user) return reply.code(401).send({ errors: ['nur über den Core erreichbar'] });
    request.user = user;
  });

  const fail = (reply: FastifyReply, code: number, message: string) =>
    reply.code(code).send({ errors: [message] });
  const allowed = (reply: FastifyReply, user: ProxyUser | undefined, permission: string) => {
    if (user && userCan(user, permission)) return true;
    void fail(reply, 403, `Recht ${permission} fehlt`);
    return false;
  };

  app.get('/catalog', (request, reply): CatalogResponse | undefined => {
    if (!allowed(reply, request.user, 'spares.view')) return undefined;
    return { ...catalog, machines: machines() };
  });

  app.get('/requests', (request, reply) => {
    if (!allowed(reply, request.user, 'spares.view')) return undefined;
    return requests.list();
  });

  // Anfrage an den Service (E-16): mit Maschinen-Nr., Linie und aktuellem Zustand
  app.post<{ Body: { items?: unknown; machineId?: unknown } }>(
    '/requests',
    async (request, reply) => {
      const user = request.user;
      if (!allowed(reply, user, 'spares.request') || !user) return reply;
      const { items, machineId } = request.body;
      if (
        !Array.isArray(items) ||
        items.length === 0 ||
        items.length > MAX_ITEMS ||
        !items.every((i): i is string => typeof i === 'string')
      )
        return fail(reply, 400, `items: 1 bis ${String(MAX_ITEMS)} Teilenummern`);
      const parts: RequestItem[] = [];
      for (const id of new Set(items)) {
        const part = catalog.parts.find((p) => p.id === id);
        if (!part) return fail(reply, 400, `Teil ${id} nicht im Katalog`);
        parts.push({ id: part.id, name: part.name.de });
      }
      if (machineId !== undefined && typeof machineId !== 'string')
        return fail(reply, 400, 'machineId muss Text sein');
      const machine = machineId
        ? (machines().find((m) => m.machineId === machineId) ?? null)
        : null;
      if (machineId && !machine) return fail(reply, 400, `Maschine ${machineId} unbekannt`);
      if (machine && !machine.own)
        return fail(reply, 400, 'Fremdmaschine: Ersatzteile über den jeweiligen Hersteller');
      const saved = requests.add({
        createdAt: now().toISOString(),
        username: user.username,
        userName: user.displayName,
        lineId: catalog.lineId,
        machine,
        items: parts,
        delivery: 'pending',
      });
      return reply.code(201).send(saved);
    },
  );

  return app;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: ProxyUser;
  }
}
