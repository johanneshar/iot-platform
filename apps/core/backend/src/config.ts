import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { LocalizedText, ModuleCategory } from '@iot/module-sdk/manifest';

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
}

export interface CoreConfig {
  port: number;
  host: string;
  /** Linie dieses Edge Device */
  lineId: string;
  dataDir: string;
  catalog: CatalogModule[];
  site: SiteLine[];
  /** Buchungsstand beim ersten Start ohne IEM (nur Entwicklung) */
  devBooked: string[];
}

const configFile = (name: string) => fileURLToPath(new URL(`../config/${name}`, import.meta.url));
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

export function loadConfig(env: NodeJS.ProcessEnv = process.env): CoreConfig {
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
  const lineId = env['CORE_LINE_ID'] ?? 'l1';
  if (!site.lines.some((l) => l.id === lineId)) {
    throw new Error(`CORE_LINE_ID „${lineId}“ steht nicht in der Standortkonfiguration`);
  }
  return {
    port: Number(env['CORE_PORT'] ?? 4000),
    host: env['CORE_HOST'] ?? '127.0.0.1',
    lineId,
    dataDir: env['CORE_DATA_DIR'] ?? fileURLToPath(new URL(`../.data/${lineId}`, import.meta.url)),
    catalog: catalog.modules,
    site: site.lines,
    devBooked: licenses.booked,
  };
}
