import type { LocalizedText, ModuleCategory, ModuleManifest } from '@iot/module-sdk/manifest';
import type { CatalogModule, SiteLine } from './config.js';
import type { LicenseProvider } from './licenses.js';

export interface ShellModule {
  id: string;
  category: ModuleCategory;
  name: LocalizedText;
  description: LocalizedText;
  core: boolean;
  gxp: boolean;
  /** gebucht laut Lizenz; Kernmodule immer */
  booked: boolean;
  /** auf diesem Edge Device installiert und bei der Registry angemeldet */
  installed: boolean;
  manifest?: ModuleManifest;
  /** Einsprungpunkte des Moduls, z. B. Alarme mit Fehlerbaum */
  targets: Record<string, string[]>;
}

export interface ShellState {
  line: { id: string; name: string; timeZone: string };
  lines: SiteLine[];
  modules: ShellModule[];
}

/**
 * Was die Shell braucht: Linie, Standortlinien und alle Module – der Produktkatalog ergänzt um die
 * angemeldeten Module. Ein angemeldetes Modul, das nicht im Katalog steht, erscheint mit den Angaben
 * seines Manifests.
 */
export function buildShellState(
  lineId: string,
  site: readonly SiteLine[],
  catalog: readonly CatalogModule[],
  registered: readonly ModuleManifest[],
  licenses: LicenseProvider,
  targets: Readonly<Record<string, Record<string, string[]>>> = {},
): ShellState {
  const line = site.find((l) => l.id === lineId);
  if (!line) throw new Error(`Linie ${lineId} fehlt in der Standortkonfiguration`);
  const byId = new Map(registered.map((m) => [m.id, m]));

  const fromCatalog = catalog.map((c): ShellModule => {
    const manifest = byId.get(c.id);
    const core = c.core ?? false;
    return {
      id: c.id,
      category: c.category,
      name: c.name,
      description: c.description,
      core,
      gxp: c.gxp,
      booked: core || licenses.isBooked(c.id),
      installed: manifest !== undefined,
      ...(manifest ? { manifest } : {}),
      targets: targets[c.id] ?? {},
    };
  });
  const known = new Set(catalog.map((c) => c.id));
  const extra = registered
    .filter((m) => !known.has(m.id))
    .map((m): ShellModule => ({
      id: m.id,
      category: m.category,
      name: m.name,
      description: m.description,
      core: m.core ?? false,
      gxp: m.gxp,
      booked: (m.core ?? false) || licenses.isBooked(m.id),
      installed: true,
      manifest: m,
      targets: targets[m.id] ?? {},
    }));

  return {
    line: { id: line.id, name: line.name, timeZone: line.timeZone },
    lines: [...site],
    modules: [...fromCatalog, ...extra],
  };
}
