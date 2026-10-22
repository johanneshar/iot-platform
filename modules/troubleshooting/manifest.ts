import type { ModuleManifest } from '@iot/module-sdk/manifest';

/** Manifest des Moduls (CLAUDE.md, Abschnitt 6.1); `entry`, `styles` und `backend` setzt das Backend. */
export const manifest = {
  id: 'troubleshooting',
  version: '0.1.0',
  name: { de: 'Geführte Fehlersuche', en: 'Guided troubleshooting' },
  description: {
    de: 'Fehlerbäume zu Alarmen, Schritt für Schritt bis zur Lösung',
    en: 'Fault trees for alarms, step by step to the solution',
  },
  category: 'Instandhaltung',
  gxp: false,
  minConformance: 'standard',
  nav: { section: 'Service', order: 10, icon: 'troubleshooting' },
  routes: [{ path: '', title: { de: 'Geführte Fehlersuche', en: 'Guided troubleshooting' } }],
  deepLinks: {
    start: {
      alarmId: 'stabile alarmId – startet den passenden Fehlerbaum',
      machine: 'machineId (optional)',
      tree: 'Fehlerbaum-ID (optional)',
    },
  },
  permissions: ['troubleshooting.use', 'troubleshooting.document'],
} satisfies Omit<ModuleManifest, 'entry' | 'styles' | 'backend'>;
