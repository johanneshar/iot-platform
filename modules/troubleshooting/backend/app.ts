import { readProxyUser, userCan, type ProxyUser } from '@iot/module-sdk/server';
import Fastify, { type FastifyInstance } from 'fastify';
import type { FaultTree, PathStep, TreeSummary } from '../shared/fault-tree';
import type { SolutionStore } from './solutions';

export interface AppDeps {
  trees: readonly FaultTree[];
  solutions: SolutionStore;
  /** Dienst-Token: nur Aufrufe über den Proxy des Core sind gültig (E-36) */
  token: string;
  logger?: boolean;
}

const isPath = (value: unknown): value is PathStep[] =>
  Array.isArray(value) &&
  value.every(
    (s: unknown) =>
      typeof s === 'object' &&
      s !== null &&
      typeof (s as PathStep).node === 'string' &&
      ((s as PathStep).answer === 'yes' || (s as PathStep).answer === 'no'),
  );

/** API der geführten Fehlersuche – erreichbar über `/api/modules/troubleshooting/…` im Core. */
export function buildApp({ trees, solutions, token, logger = true }: AppDeps): FastifyInstance {
  const app = Fastify({ logger });

  app.addHook('onRequest', async (request, reply) => {
    // Statische Dateien (entry.js) frei, API nur mit Benutzer aus dem Proxy
    if (
      !request.url.startsWith('/trees') &&
      !request.url.startsWith('/solutions') &&
      !request.url.startsWith('/stats')
    )
      return;
    const user = readProxyUser(request.headers, token);
    if (!user) return reply.code(401).send({ errors: ['nur über den Core erreichbar'] });
    request.user = user;
  });

  app.get('/trees', (): TreeSummary[] =>
    trees.map(({ id, version, title, machineType, alarmIds }) => ({
      id,
      version,
      title,
      machineType,
      alarmIds,
    })),
  );

  app.get<{ Params: { id: string } }>('/trees/:id', async (request, reply) => {
    const tree = trees.find((t) => t.id === request.params.id);
    return tree ?? reply.code(404).send({ errors: ['Fehlerbaum unbekannt'] });
  });

  app.post<{ Body: Record<string, unknown> }>('/solutions', async (request, reply) => {
    const user = request.user;
    if (!user || !userCan(user, 'troubleshooting.document')) {
      return reply.code(403).send({ errors: ['Recht troubleshooting.document fehlt'] });
    }
    const { treeId, path, resultNode, alarmId, machineId } = request.body;
    const tree = trees.find((t) => t.id === treeId);
    if (
      !tree ||
      !isPath(path) ||
      typeof resultNode !== 'string' ||
      tree.nodes[resultNode]?.type !== 'result'
    ) {
      return reply
        .code(400)
        .send({ errors: ['treeId, path und resultNode (Lösung) erforderlich'] });
    }
    // Der Weg muss im Baum tatsächlich zur Lösung führen
    let current = tree.start;
    for (const step of path) {
      const node = tree.nodes[current];
      if (step.node !== current || node?.type !== 'question')
        return reply.code(400).send({ errors: ['Weg passt nicht zum Baum'] });
      current = step.answer === 'yes' ? node.yes : node.no;
    }
    if (current !== resultNode)
      return reply.code(400).send({ errors: ['Weg endet nicht in dieser Lösung'] });
    const record = solutions.add(
      {
        treeId: tree.id,
        treeVersion: tree.version,
        alarmId: typeof alarmId === 'string' ? alarmId : null,
        machineId: typeof machineId === 'string' ? machineId : null,
        path,
        resultNode,
      },
      user,
    );
    return reply.code(201).send(record);
  });

  app.get('/stats', () => solutions.stats());

  return app;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: ProxyUser;
  }
}
