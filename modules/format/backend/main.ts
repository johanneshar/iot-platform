import type { DataByClass } from '@iot/interface-schema';
import type { ModuleManifest } from '@iot/module-sdk/manifest';
import {
  fetchAuditEntry,
  fetchLineConfig,
  registerWithCore,
  subscribeLine,
} from '@iot/module-sdk/server';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifest } from '../manifest';
import type { LineCheck } from '../shared/format';
import { buildApp, checkRecipe } from './app';
import { loadProcedures } from './procedures';
import { FormatStore, type ReportedRecipe } from './store';

const port = Number(process.env['MODULE_PORT'] ?? 4105);
const host = process.env['MODULE_HOST'] ?? '127.0.0.1';
const publicUrl = process.env['MODULE_PUBLIC_URL'] ?? `http://localhost:${String(port)}`;
const core = {
  coreUrl: process.env['CORE_URL'] ?? 'http://localhost:4000',
  // Dienst-Token für Registry, Proxy und Audit Trail (O-18); im Betrieb aus der Konfiguration der Edge App
  token: process.env['CORE_REGISTRY_TOKEN'] ?? 'dev-registry-token',
};
const log = (m: string) => {
  console.log(m);
};
const connection = { ...core, log };
const lineConfig = await fetchLineConfig(connection);
const lineId = lineConfig.id;
const mqttUrl = process.env['MQTT_URL'] ?? 'mqtt://localhost:1883';
// Mitgelieferte Abläufe; weitere richtet der Admin in der Oberfläche ein (E-15)
const proceduresDir =
  process.env['FORMAT_PROCEDURES_DIR'] ??
  fileURLToPath(
    new URL('../../../packages/simulator/fixtures/format-procedures/', import.meta.url),
  );
const dataDir =
  process.env['MODULE_DATA_DIR'] ?? fileURLToPath(new URL(`../.data/${lineId}/`, import.meta.url));
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

const store = new FormatStore(dataDir);
const { procedures, rejected } = loadProcedures(proceduresDir);
for (const procedure of procedures)
  store.addProcedure(procedure, new Date().toISOString(), 'system');
for (const [file, errors] of Object.entries(rejected))
  console.warn(`Ablauf ${file} abgelehnt: ${errors.join('; ')}`);

// Linie aus den kanonischen Topics: Namen, Zustände und Rezepte laut Batch-Meldung
const names = new Map<string, string>();
const states = new Map<string, string>();
const recipes = new Map<string, ReportedRecipe>();
const check = (): LineCheck => {
  const notStopped = [...names.entries()]
    .filter(([id]) => states.get(id) !== 'Stopped')
    .map(([, name]) => name);
  return { stopped: names.size > 0 && notStopped.length === 0, notStopped };
};

subscribeLine({
  url: mqttUrl,
  lineId,
  clientId: `iot-module-format-${lineId}`,
  log,
  onMessage: (machineId, dataClass, message) => {
    if (dataClass === 'identity')
      names.set(machineId, (message.data as DataByClass['identity']).type);
    if (dataClass === 'state') states.set(machineId, (message.data as DataByClass['state']).state);
    if (dataClass === 'batch') {
      const data = message.data as DataByClass['batch'];
      const reported: ReportedRecipe = {
        machineId,
        batchId: data.batchId,
        event: data.event,
        recipe: data.recipe,
        at: data.event === 'started' ? data.startedAt : message.ts,
      };
      recipes.set(machineId, reported);
      const checked = checkRecipe(store.lastReleased(), reported);
      if (checked) store.save(checked);
    }
  },
});

const app = buildApp({
  store,
  audit: { entry: (seq) => fetchAuditEntry(connection, seq) },
  line: { check, machineIds: () => [...names.keys()], recipes: () => [...recipes.values()] },
  token: core.token,
});

const TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};
// Die Shell lädt das Einstiegsmodul von hier (ADR-002); Aufrufe an die API kommen über den Proxy des Core
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
await registerWithCore(connection, fullManifest);
