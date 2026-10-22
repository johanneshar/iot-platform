import type { ModuleManifest } from '@iot/module-sdk/manifest';

/** Manifest des Moduls (CLAUDE.md, Abschnitt 6.1); `entry`, `styles` und `backend` setzt das Backend. */
export const manifest = {
  id: 'alarms',
  version: '0.1.0',
  name: { de: 'Alarm-Analytics', en: 'Alarm analytics' },
  description: {
    de: 'Alarmliste, Häufigkeit, Dauer und Top-Störungen',
    en: 'Alarm list, frequency, duration and top faults',
  },
  category: 'Produktion',
  gxp: false,
  minConformance: 'standard',
  nav: {
    section: 'Linie',
    order: 20,
    icon: 'alarms',
    label: { de: 'Alarme', en: 'Alarms' },
    // Zähler anstehender Alarme liefert das Einstiegsmodul (frontend/entry.tsx)
  },
  routes: [{ path: '', title: { de: 'Alarme', en: 'Alarms' } }],
  // Lesen der Linie dürfen alle angemeldeten Benutzer; Quittieren gibt es nicht (E-32)
  permissions: [],
} satisfies Omit<ModuleManifest, 'entry' | 'styles' | 'backend'>;
