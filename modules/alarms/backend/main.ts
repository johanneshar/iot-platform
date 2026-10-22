import type { AlarmData, DataByClass } from '@iot/interface-schema';
import type { ModuleManifest } from '@iot/module-sdk/manifest';
import { fetchLineConfig, registerWithCore, subscribeLine } from '@iot/module-sdk/server';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifest } from '../manifest';
import { buildApp } from './app';
import { AlarmHistory } from './history';

const port = Number(process.env['MODULE_PORT'] ?? 4102);
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
// Aufbewahrung des Alarmverlaufs, je Kunde einstellbar (E-34)
const retentionDays = Number(process.env['ALARMS_RETENTION_DAYS'] ?? 90);
if (!Number.isInteger(retentionDays) || retentionDays < 1)
  throw new Error('ALARMS_RETENTION_DAYS: ganze Zahl ≥ 1 erwartet');
const dataDir =
  process.env['MODULE_DATA_DIR'] ?? fileURLToPath(new URL(`../.data/${lineId}/`, import.meta.url));
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

const history = new AlarmHistory(dataDir);
const app = buildApp({ history, token: core.token, retentionDays });

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

const log = (m: string) => {
  app.log.info(m);
};
const purge = () => {
  const removed = history.purge(retentionDays);
  if (removed > 0)
    log(`${String(removed)} Alarme älter als ${String(retentionDays)} Tage gelöscht`);
};
purge();
setInterval(purge, 60 * 60 * 1000).unref();

subscribeLine({
  url: mqttUrl,
  lineId,
  clientId: `iot-module-alarms-${lineId}`,
  log,
  onMessage: (machineId, dataClass, message) => {
    if (dataClass === 'alarms') history.record(machineId, message.data as AlarmData, message.ts);
    if (dataClass === 'activeAlarms')
      history.reconcile(machineId, message.data as DataByClass['activeAlarms'], message.ts);
  },
});

await app.listen({ port, host });
await registerWithCore({ ...core, log }, fullManifest);
