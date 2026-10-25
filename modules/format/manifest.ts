import type { ModuleManifest } from '@iot/module-sdk/manifest';

/** Manifest des Moduls (CLAUDE.md, Abschnitt 6.1); `entry`, `styles` und `backend` setzt das Backend. */
export const manifest = {
  id: 'format',
  version: '0.1.0',
  name: { de: 'Geführter Formatwechsel', en: 'Guided format change' },
  description: {
    de: 'Schritt-für-Schritt-Anleitung mit Formatteil-Prüfung und Signatur',
    en: 'Step-by-step instructions with format part check and signature',
  },
  category: 'Produktion',
  gxp: true,
  // Zustand reicht für „Linie leerfahren“; Fremdmaschinen bestätigt der Bediener (ADR-013)
  minConformance: 'basic',
  nav: {
    section: 'Service',
    order: 20,
    icon: 'format',
    label: { de: 'Formatwechsel', en: 'Format change' },
  },
  routes: [{ path: '', title: { de: 'Geführter Formatwechsel', en: 'Guided format change' } }],
  permissions: ['format.execute', 'format.sign', 'format.release', 'format.configure'],
} satisfies Omit<ModuleManifest, 'entry' | 'styles' | 'backend'>;
