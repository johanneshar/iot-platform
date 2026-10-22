import type { DataByClass } from '@iot/interface-schema';
import type { ModuleManifest } from '@iot/module-sdk/manifest';
import {
  fetchAudit,
  fetchAuditEntry,
  fetchLineConfig,
  registerWithCore,
  subscribeLine,
} from '@iot/module-sdk/server';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifest } from '../manifest';
import { buildApp } from './app';
import { BatchStore } from './store';

const port = Number(process.env['MODULE_PORT'] ?? 4104);
const host = process.env['MODULE_HOST'] ?? '127.0.0.1';
const publicUrl = process.env['MODULE_PUBLIC_URL'] ?? `http://localhost:${String(port)}`;
const core = {
  coreUrl: process.env['CORE_URL'] ?? 'http://localhost:4000',
  // Dienst-Token für Registry, Proxy und Audit Trail (O-18); im Betrieb aus der Konfiguration der Edge App
  token: process.env['CORE_REGISTRY_TOKEN'] ?? 'dev-registry-token',
};
// Linie dieses Edge Device vom Core (E-47) – kein eigener Schalter, der falsch stehen könnte
const lineConfig = await fetchLineConfig({
  ...core,
  log: (m) => {
    console.log(m);
  },
});
const lineId = lineConfig.id;
const mqttUrl = process.env['MQTT_URL'] ?? 'mqtt://localhost:1883';
const dataDir =
  process.env['MODULE_DATA_DIR'] ?? fileURLToPath(new URL(`../.data/${lineId}/`, import.meta.url));
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

const store = new BatchStore(dataDir);
const log = (m: string) => {
  app.log.info(m);
};
const connection = { ...core, log };
const app = buildApp({
  store,
  line: () => lineConfig,
  token: core.token,
  audit: {
    entry: (seq) => fetchAuditEntry(connection, seq),
    byReference: (reference) => fetchAudit(connection, manifest.id, reference),
  },
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

subscribeLine({
  url: mqttUrl,
  lineId,
  clientId: `iot-module-batch-${lineId}`,
  log,
  onMessage: (machineId, dataClass, message) => {
    const ts = Date.parse(message.ts);
    const quality = message.quality;
    switch (dataClass) {
      case 'identity':
        store.identity(machineId, message.data as DataByClass['identity']);
        return;
      case 'meta':
        store.meta(machineId, message.data as DataByClass['meta']);
        return;
      case 'batch':
        store.batch(machineId, message.data as DataByClass['batch'], ts);
        break;
      case 'counters':
        store.counters(machineId, message.data as DataByClass['counters'], ts);
        break;
      case 'values':
        store.values(machineId, message.data as DataByClass['values'], ts, quality);
        break;
      case 'alarms':
        store.alarm(machineId, message.data as DataByClass['alarms'], ts);
        break;
      case 'activeAlarms':
        store.reconcileAlarms(machineId, message.data as DataByClass['activeAlarms'], ts);
        break;
      default:
        break;
    }
    store.seen(machineId, ts);
  },
});

await app.listen({ port, host });
await registerWithCore(connection, fullManifest);
