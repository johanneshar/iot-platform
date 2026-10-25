import type { ModuleManifest } from '@iot/module-sdk/manifest';

/** Manifest des Moduls (CLAUDE.md, Abschnitt 6.1); `entry`, `styles` und `backend` setzt das Backend. */
export const manifest = {
  id: 'spares',
  version: '0.1.0',
  name: { de: 'Ersatzteilkatalog', en: 'Spare parts catalogue' },
  description: {
    de: 'Teile suchen, Bestand sehen und Anfrage direkt an den Service senden',
    en: 'Search parts, see stock and send a request directly to service',
  },
  category: 'Instandhaltung',
  gxp: false,
  // Katalog und Anfrage brauchen nur die Identität der Maschine (ADR-013); nur eigene Maschinen
  minConformance: 'basic',
  ownMachinesOnly: true,
  nav: { section: 'Service', order: 30, icon: 'spares' },
  routes: [{ path: '', title: { de: 'Ersatzteilkatalog', en: 'Spare parts catalogue' } }],
  deepLinks: {
    catalog: {
      search: 'Teilenummer oder Suchbegriff (optional), z. B. aus der Fehlersuche',
      machine: 'machineId (optional) – nur Teile dieser Maschine',
    },
  },
  permissions: ['spares.view', 'spares.request'],
} satisfies Omit<ModuleManifest, 'entry' | 'styles' | 'backend'>;
