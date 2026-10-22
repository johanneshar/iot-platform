import type { DataByClass } from '@iot/interface-schema';
import type { ModuleManifest } from '@iot/module-sdk/manifest';
import { fetchLineConfig, registerWithCore, subscribeLine } from '@iot/module-sdk/server';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifest } from '../manifest';
import { buildApp } from './app';
import { HistoryStore } from './history-store';
import { loadLineModel } from './line-model-3d';
import { parsePeriods, retentionMs } from './periods';

const port = Number(process.env['MODULE_PORT'] ?? 4101);
const host = process.env['MODULE_HOST'] ?? '127.0.0.1';
const publicUrl = process.env['MODULE_PUBLIC_URL'] ?? `http://localhost:${String(port)}`;
const core = {
  coreUrl: process.env['CORE_URL'] ?? 'http://localhost:4000',
  // Dienst-Token für Registry und Proxy (O-18); im Betrieb aus der Konfiguration der Edge App
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
// Zeiträume der Detailseite stellt der Kunde ein (E-37)
const periods = parsePeriods(process.env['DASHBOARD_PERIODS'] ?? 'shift,24h,7d');
const dataDir =
  process.env['MODULE_DATA_DIR'] ?? fileURLToPath(new URL(`../.data/${lineId}/`, import.meta.url));
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

// 3D-Modelle und Zuordnungen (ADR-010): im Betrieb aus der Konfiguration der Edge App
const modelDir =
  process.env['DASHBOARD_MODEL_DIR'] ??
  fileURLToPath(new URL('../../../packages/simulator/fixtures/models/', import.meta.url));

const history = new HistoryStore(dataDir);
const model = loadLineModel(modelDir, lineId, (m) => {
  console.warn(m);
});
const app = buildApp({ history, periods, line: () => lineConfig, token: core.token, model });
if (model) app.log.info(`3D-Modell für ${lineId}: ${model.path}`);

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

const log = (m: string) => {
  app.log.info(m);
};
const purge = () => {
  history.purge(Date.now() - retentionMs(periods));
};
purge();
setInterval(purge, 60 * 60 * 1000).unref();

subscribeLine({
  url: mqttUrl,
  lineId,
  clientId: `iot-module-dashboard-${lineId}`,
  log,
  onMessage: (machineId, dataClass, message) => {
    const ts = Date.parse(message.ts);
    switch (dataClass) {
      case 'identity':
        history.identity(machineId, message.data as DataByClass['identity']);
        break;
      case 'meta':
        history.meta(machineId, message.data as DataByClass['meta']);
        break;
      case 'state':
        history.state(machineId, message.data as DataByClass['state'], ts);
        break;
      case 'counters':
        history.counters(machineId, message.data as DataByClass['counters'], ts);
        break;
      case 'values':
        history.values(machineId, message.data as DataByClass['values'], ts);
        break;
      case 'alarms':
        history.alarm(machineId, message.data as DataByClass['alarms'], ts);
        break;
      case 'activeAlarms':
        history.reconcileAlarms(machineId, message.data as DataByClass['activeAlarms'], ts);
        break;
      default:
        break;
    }
  },
});

await app.listen({ port, host });
const connection = { ...core, log };
await registerWithCore(connection, fullManifest);
