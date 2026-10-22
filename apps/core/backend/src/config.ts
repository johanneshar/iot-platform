import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { LocalizedText, ModuleCategory } from '@iot/module-sdk/manifest';
import type { ShiftDefinition } from '@iot/module-sdk/time';
import type { RoleDefinition } from './auth/roles.js';

export interface CatalogModule {
  id: string;
  category: ModuleCategory;
  core?: boolean;
  gxp: boolean;
  name: LocalizedText;
  description: LocalizedText;
}

export interface SiteLine {
  id: string;
  name: string;
  /** Adresse des Core dieser Linie (Linienwahl, E-23) */
  url: string;
  /** Zeitzone des Standorts für die Anzeige (E-19) */
  timeZone: string;
  /** Schichtmodell – legt der Kunde fest (E-29) */
  shifts: ShiftDefinition[];
  /** OEE-Ziel in Prozent */
  oeeTarget?: number;
}

export interface CoreConfig {
  production: boolean;
  port: number;
  host: string;
  /** Linie dieses Edge Device */
  lineId: string;
  dataDir: string;
  catalog: CatalogModule[];
  site: SiteLine[];
  roles: RoleDefinition[];
  /** Buchungsstand beim ersten Start ohne IEM (nur Entwicklung) */
  devBooked: string[];
  /** Dienst-Token, mit dem sich Module bei der Registry anmelden (O-18) */
  registryToken: string;
  sessionHours: number;
  /** Beispielbenutzer je Rolle anlegen (nur Entwicklung und Tests) */
  devUsers: { password: string } | null;
  /** Passwort des Service-Zugangs beim ersten Start (Betrieb) */
  servicePassword: string | null;
  /** Databus (MQTT) – im Dev-Betrieb Mosquitto; `null` = keine Anbindung (Tests) */
  mqttUrl: string | null;
}

const configFile = (name: string) => fileURLToPath(new URL(`../config/${name}`, import.meta.url));
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

export function loadConfig(env: NodeJS.ProcessEnv = process.env): CoreConfig {
  const production = env['NODE_ENV'] === 'production';
  // Konfigurationsdateien gehören zum Lieferumfang des Core; ihre Form prüfen die Tests
  const catalog = readJson(env['CORE_CATALOG_FILE'] ?? configFile('catalog.json')) as {
    modules: CatalogModule[];
  };
  const site = readJson(env['CORE_SITE_FILE'] ?? configFile('site.dev.json')) as {
    lines: SiteLine[];
  };
  const licenses = readJson(env['CORE_DEV_LICENSE_FILE'] ?? configFile('licenses.dev.json')) as {
    booked: string[];
  };
  const roles = readJson(env['CORE_ROLES_FILE'] ?? configFile('roles.json')) as {
    roles: RoleDefinition[];
  };
  const lineId = env['CORE_LINE_ID'] ?? 'l3';
  if (!site.lines.some((l) => l.id === lineId)) {
    throw new Error(`CORE_LINE_ID „${lineId}“ steht nicht in der Standortkonfiguration`);
  }

  // Im Betrieb kein Standard-Token und keine Beispielbenutzer
  const registryToken = env['CORE_REGISTRY_TOKEN'] ?? (production ? '' : 'dev-registry-token');
  if (!registryToken) throw new Error('CORE_REGISTRY_TOKEN fehlt');
  const devUsersWanted = !production && env['CORE_DEV_USERS'] !== '0';
  if (production && env['CORE_DEV_USERS'] === '1')
    throw new Error('Beispielbenutzer sind im Betrieb nicht erlaubt');

  return {
    production,
    port: Number(env['CORE_PORT'] ?? 4000),
    host: env['CORE_HOST'] ?? '127.0.0.1',
    lineId,
    dataDir: env['CORE_DATA_DIR'] ?? fileURLToPath(new URL(`../.data/${lineId}`, import.meta.url)),
    catalog: catalog.modules,
    site: site.lines,
    roles: roles.roles,
    devBooked: production ? [] : licenses.booked,
    registryToken,
    sessionHours: Number(env['CORE_SESSION_HOURS'] ?? 12),
    // Nur Entwicklung: ein bekanntes Passwort für alle Beispielbenutzer
    devUsers: devUsersWanted ? { password: env['CORE_DEV_PASSWORD'] ?? 'entwicklung' } : null,
    servicePassword: env['CORE_SERVICE_PASSWORD'] ?? null,
    mqttUrl:
      env['CORE_MQTT_URL'] === 'off' ? null : (env['CORE_MQTT_URL'] ?? 'mqtt://localhost:1883'),
  };
}
