import type { ModuleManifest } from '@iot/module-sdk/manifest';

/** Manifest des Moduls (CLAUDE.md, Abschnitt 6.1); `entry`, `styles` und `backend` setzt das Backend. */
export const manifest = {
  id: 'batch',
  version: '0.1.0',
  name: { de: 'Batch-Reporting', en: 'Batch reporting' },
  description: {
    de: 'Batchdaten über die ganze Linie, Bericht mit elektronischer Signatur',
    en: 'Batch data across the whole line, report with electronic signature',
  },
  category: 'Produktion',
  gxp: true,
  minConformance: 'full',
  nav: { section: 'Linie', order: 30, icon: 'batch' },
  routes: [{ path: '', title: { de: 'Batch-Reporting', en: 'Batch reporting' } }],
  // Lesen dürfen alle angemeldeten Benutzer; Rechte nach O-29 (vorläufig) und E-26
  permissions: ['batch.sign', 'batch.review', 'batch.clear', 'batch.export'],
} satisfies Omit<ModuleManifest, 'entry' | 'styles' | 'backend'>;
