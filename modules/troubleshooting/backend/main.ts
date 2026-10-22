import type { ModuleManifest } from '@iot/module-sdk/manifest';
import { publishDeepLinkTargets, registerWithCore } from '@iot/module-sdk/server';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifest } from '../manifest';
import { buildApp } from './app';
import { SolutionStore } from './solutions';
import { loadTrees } from './trees';

const port = Number(process.env['MODULE_PORT'] ?? 4103);
const host = process.env['MODULE_HOST'] ?? '127.0.0.1';
const publicUrl = process.env['MODULE_PUBLIC_URL'] ?? `http://localhost:${String(port)}`;
const core = {
  coreUrl: process.env['CORE_URL'] ?? 'http://localhost:4000',
  token: process.env['CORE_REGISTRY_TOKEN'] ?? 'dev-registry-token',
};
// Fehlerbäume: im Betrieb aus dem Fehlerbaum-System (O-01), in der Entwicklung die Beispiele des Mockups
const treesDir =
  process.env['FAULT_TREES_DIR'] ??
  fileURLToPath(new URL('../../../packages/simulator/fixtures/fault-trees/', import.meta.url));
const dataDir =
  process.env['MODULE_DATA_DIR'] ?? fileURLToPath(new URL('../.data/', import.meta.url));
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

const { trees, rejected } = loadTrees(treesDir);
const app = buildApp({ trees, solutions: new SolutionStore(dataDir), token: core.token });
for (const [file, errors] of Object.entries(rejected))
  app.log.warn(`Fehlerbaum ${file} abgelehnt: ${errors.join('; ')}`);

const TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};
app.addHook('onSend', async (_request, reply) => {
  reply.header('access-control-allow-origin', '*');
});
app.get<{ Params: { file: string } }>('/:file', async (request, reply) => {
  const file = join(distDir, request.params.file);
  if (!file.startsWith(distDir) || !existsSync(file)) return reply.code(404).send();
  return reply.type(TYPES[extname(file)] ?? 'application/octet-stream').send(readFileSync(file));
});

const fullManifest: ModuleManifest = {
  ...manifest,
  entry: `${publicUrl}/entry.js`,
  backend: publicUrl,
  ...(existsSync(join(distDir, 'entry.css')) ? { styles: [`${publicUrl}/entry.css`] } : {}),
};

await app.listen({ port, host });
const connection = {
  ...core,
  log: (m: string) => {
    app.log.info(m);
  },
};
await registerWithCore(connection, fullManifest);
// Einsprungpunkte: Alarme, zu denen ein Fehlerbaum existiert (Deep Link aus Alarmen und Dashboard)
await publishDeepLinkTargets(connection, manifest.id, {
  alarm: [...new Set(trees.flatMap((t) => t.alarmIds))],
});
