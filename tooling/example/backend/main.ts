import { validateManifest, type ModuleManifest } from '@iot/module-sdk/manifest';
import Fastify from 'fastify';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifest } from '../manifest';

const port = Number(process.env['MODULE_PORT'] ?? 4100);
const host = process.env['MODULE_HOST'] ?? '127.0.0.1';
const publicUrl = process.env['MODULE_PUBLIC_URL'] ?? `http://localhost:${String(port)}`;
const coreUrl = process.env['CORE_URL'] ?? 'http://localhost:4000';
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

const TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const server = Fastify({ logger: true });

// Die Shell lädt das Einstiegsmodul von hier (ADR-002); Auslieferung über den Core-Proxy folgt mit M10
server.addHook('onSend', async (_request, reply) => {
  reply.header('access-control-allow-origin', '*');
});

server.get<{ Params: { file: string } }>('/:file', async (request, reply) => {
  const file = join(distDir, request.params.file);
  if (!file.startsWith(distDir) || !existsSync(file)) return reply.code(404).send();
  return reply.type(TYPES[extname(file)] ?? 'application/octet-stream').send(readFileSync(file));
});

function fullManifest(): ModuleManifest {
  return {
    ...manifest,
    entry: `${publicUrl}/entry.js`,
    ...(existsSync(join(distDir, 'entry.css')) ? { styles: [`${publicUrl}/entry.css`] } : {}),
  };
}

/** Meldet das Manifest beim Core an; versucht es alle 5 s, bis der Core erreichbar ist. */
async function register(): Promise<void> {
  const body = fullManifest();
  const check = validateManifest(body);
  if (!check.ok) throw new Error(`Manifest ungültig: ${check.errors.join('; ')}`);
  for (;;) {
    try {
      const response = await fetch(`${coreUrl}/api/registry/modules`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        server.log.info(`beim Core ${coreUrl} angemeldet`);
        return;
      }
      server.log.warn(`Anmeldung abgelehnt: ${String(response.status)} ${await response.text()}`);
    } catch {
      server.log.warn(`Core ${coreUrl} nicht erreichbar – neuer Versuch in 5 s`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}

await server.listen({ port, host });
await register();
