import type { DataByClass } from '@iot/interface-schema';
import type { ModuleManifest } from '@iot/module-sdk/manifest';
import {
  fetchLineConfig,
  publishDeepLinkTargets,
  registerWithCore,
  subscribeLine,
} from '@iot/module-sdk/server';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifest } from '../manifest';
import type { MachineInfo } from '../shared/spares';
import { buildApp } from './app';
import { loadCatalog } from './catalog';
import { RequestStore } from './requests';

const port = Number(process.env['MODULE_PORT'] ?? 4106);
const host = process.env['MODULE_HOST'] ?? '127.0.0.1';
const publicUrl = process.env['MODULE_PUBLIC_URL'] ?? `http://localhost:${String(port)}`;
const core = {
  coreUrl: process.env['CORE_URL'] ?? 'http://localhost:4000',
  // Dienst-Token für Registry und Proxy (O-18); im Betrieb aus der Konfiguration der Edge App
  token: process.env['CORE_REGISTRY_TOKEN'] ?? 'dev-registry-token',
};
const log = (m: string) => {
  console.log(m);
};
const connection = { ...core, log };
const lineConfig = await fetchLineConfig(connection);
const lineId = lineConfig.id;
const mqttUrl = process.env['MQTT_URL'] ?? 'mqtt://localhost:1883';
// Katalog: im Betrieb aus dem PLM (O-02), in der Entwicklung die Beispieldaten der Flexfill
const catalogFile =
  process.env['SPARES_CATALOG'] ??
  fileURLToPath(
    new URL('../../../packages/simulator/fixtures/spares/flexfill.json', import.meta.url),
  );
const dataDir =
  process.env['MODULE_DATA_DIR'] ?? fileURLToPath(new URL(`../.data/${lineId}/`, import.meta.url));
const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

const catalog = loadCatalog(catalogFile);
if (catalog.lineId !== lineId)
  console.warn(
    `Ersatzteilkatalog gehört zu Linie ${catalog.lineId}, dieses Edge Device: ${lineId}`,
  );

// Maschinen der Linie: Name, eigene/fremde, Seriennummer und Zustand für die Anfrage.
// Retained-Nachrichten kommen in beliebiger Reihenfolge – Identität und Zustand getrennt merken.
const identities = new Map<string, DataByClass['identity']>();
const states = new Map<string, string>();
subscribeLine({
  url: mqttUrl,
  lineId,
  clientId: `iot-module-spares-${lineId}`,
  log,
  onMessage: (machineId, dataClass, message) => {
    if (dataClass === 'identity')
      identities.set(machineId, message.data as DataByClass['identity']);
    if (dataClass === 'state') states.set(machineId, (message.data as DataByClass['state']).state);
  },
});
const machines = (): MachineInfo[] =>
  [...identities.entries()]
    .sort(([, a], [, b]) => a.position - b.position)
    .map(([machineId, identity]) => ({
      machineId,
      name: identity.type,
      own: identity.manufacturer === 'own',
      serial: identity.serial,
      state: states.get(machineId) ?? null,
    }));

const app = buildApp({
  catalog,
  requests: new RequestStore(dataDir),
  machines,
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
// Einsprungpunkte: Teilenummern des Katalogs (Fehlersuche, Instandhaltung) und Maschinen mit Teilen
await publishDeepLinkTargets(connection, manifest.id, {
  part: catalog.parts.map((p) => p.id),
  machine: [...new Set(catalog.parts.flatMap((p) => p.machines))],
});
