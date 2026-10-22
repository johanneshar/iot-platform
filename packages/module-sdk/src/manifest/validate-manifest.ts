import {
  CONFORMANCE_LEVELS,
  MODULE_CATEGORIES,
  NAV_SECTIONS,
  type ModuleManifest,
} from './manifest';
import { RESERVED_MODULE_IDS } from './shared-modules';

const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const ICONS = [
  'overview',
  'alarms',
  'batch',
  'condition',
  'prediction',
  'troubleshooting',
  'format',
  'spares',
  'modules',
];

export type ManifestResult =
  { ok: true; manifest: ModuleManifest } | { ok: false; errors: string[] };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown) => isObject(v) && typeof v['de'] === 'string' && v['de'].length > 0;

/** Prüft ein gemeldetes Manifest, bevor die Registry es annimmt. */
export function validateManifest(input: unknown): ManifestResult {
  const errors: string[] = [];
  if (!isObject(input)) return { ok: false, errors: ['Manifest ist kein Objekt'] };
  const m = input;

  if (typeof m['id'] !== 'string' || !ID.test(m['id'])) errors.push('id: kebab-case erwartet');
  else if ((RESERVED_MODULE_IDS as readonly string[]).includes(m['id']))
    errors.push(`id: „${m['id']}“ ist für die Shell reserviert`);
  if (typeof m['version'] !== 'string' || !SEMVER.test(m['version']))
    errors.push('version: SemVer erwartet');
  if (!isText(m['name'])) errors.push('name: Text mit „de“ erwartet');
  if (!isText(m['description'])) errors.push('description: Text mit „de“ erwartet');
  if (!(MODULE_CATEGORIES as readonly unknown[]).includes(m['category']))
    errors.push('category: unbekannte Kategorie');
  if (typeof m['gxp'] !== 'boolean') errors.push('gxp: true oder false erwartet');
  if (!(CONFORMANCE_LEVELS as readonly unknown[]).includes(m['minConformance']))
    errors.push('minConformance: basic, standard oder full');
  if (typeof m['entry'] !== 'string' || m['entry'].length === 0)
    errors.push('entry: Adresse des Einstiegsmoduls fehlt');

  const nav = m['nav'];
  if (nav !== undefined) {
    if (!isObject(nav)) errors.push('nav: Objekt erwartet');
    else {
      if (!(NAV_SECTIONS as readonly unknown[]).includes(nav['section']))
        errors.push('nav.section: Linie, Service oder Plattform');
      if (typeof nav['order'] !== 'number') errors.push('nav.order: Zahl erwartet');
      if (!ICONS.includes(String(nav['icon']))) errors.push('nav.icon: unbekanntes Icon');
      if (nav['label'] !== undefined && !isText(nav['label']))
        errors.push('nav.label: Text mit „de“ erwartet');
    }
  }

  const routes = m['routes'];
  if (!Array.isArray(routes) || routes.length === 0)
    errors.push('routes: mindestens eine Seite erwartet');
  else
    routes.forEach((r: unknown, i) => {
      if (!isObject(r) || typeof r['path'] !== 'string' || !isText(r['title']))
        errors.push(`routes[${String(i)}]: path und title erwartet`);
    });

  const permissions = m['permissions'];
  const id = typeof m['id'] === 'string' ? m['id'] : '';
  if (!Array.isArray(permissions)) errors.push('permissions: Liste erwartet');
  else
    permissions.forEach((p: unknown) => {
      if (typeof p !== 'string' || !p.startsWith(`${id}.`))
        errors.push(`permissions: „${String(p)}“ muss mit „${id}.“ beginnen`);
    });

  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, manifest: input as unknown as ModuleManifest };
}
