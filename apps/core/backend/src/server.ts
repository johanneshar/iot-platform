import Fastify, { type FastifyInstance } from 'fastify';

export interface HealthResponse {
  status: 'ok';
  service: 'core';
}

/** Baut den Server ohne ihn zu starten – so bleibt er in Tests direkt aufrufbar. */
export function buildServer(): FastifyInstance {
  const server = Fastify({ logger: process.env['NODE_ENV'] !== 'test' });

  server.get('/api/health', (): HealthResponse => ({ status: 'ok', service: 'core' }));

  return server;
}
