import { validateManifest } from '@iot/module-sdk/manifest';
import Fastify, { type FastifyInstance } from 'fastify';
import type { CoreConfig } from './config.js';
import { openDb, type Db } from './db.js';
import { LocalLicenseProvider, type LicenseProvider } from './licenses.js';
import { Registry } from './registry.js';
import { buildShellState } from './shell-state.js';

export interface HealthResponse {
  status: 'ok';
  service: 'core';
}

export interface ServerDeps {
  config: CoreConfig;
  db?: Db;
  licenses?: LicenseProvider;
}

/** Baut den Server ohne ihn zu starten – so bleibt er in Tests direkt aufrufbar. */
export function buildServer({
  config,
  db = openDb(config.dataDir),
  licenses,
}: ServerDeps): FastifyInstance {
  const server = Fastify({ logger: process.env['NODE_ENV'] !== 'test' });
  const registry = new Registry(db);
  const license = licenses ?? new LocalLicenseProvider(db, config.devBooked);
  const known = new Set(config.catalog.map((c) => c.id));

  server.get('/api/health', (): HealthResponse => ({ status: 'ok', service: 'core' }));

  server.get('/api/shell', () =>
    buildShellState(config.lineId, config.site, config.catalog, registry.list(), license),
  );

  // Anmeldung eines Moduls beim Start (ADR-002). Absicherung über Dienst-Token folgt mit M3b.
  server.post('/api/registry/modules', async (request, reply) => {
    const result = validateManifest(request.body);
    if (!result.ok) return reply.code(400).send({ errors: result.errors });
    registry.register(result.manifest);
    return reply.code(204).send();
  });

  // Buchen/Abbestellen im Baukasten. Nur Admin – Rollenprüfung folgt mit M3b (E-14).
  server.put<{ Params: { id: string }; Body: { booked?: unknown } }>(
    '/api/licenses/:id',
    async (request, reply) => {
      const { id } = request.params;
      const booked = request.body.booked;
      if (typeof booked !== 'boolean')
        return reply.code(400).send({ errors: ['booked: true oder false'] });
      const isRegistered = registry.list().some((m) => m.id === id);
      if (!known.has(id) && !isRegistered)
        return reply.code(404).send({ errors: [`Modul ${id} unbekannt`] });
      if (config.catalog.find((c) => c.id === id)?.core) {
        return reply.code(409).send({ errors: ['Kernmodule sind immer enthalten'] });
      }
      license.setBooked(id, booked);
      return reply.code(204).send();
    },
  );

  server.addHook('onClose', () => {
    db.close();
  });

  return server;
}
