import type { ModuleManifest } from '@iot/module-sdk/manifest';

/**
 * Manifest des Moduls (CLAUDE.md, Abschnitt 6.1). `entry` und `styles` setzt das Backend beim Anmelden,
 * weil sie von der Adresse abhängen, unter der das Modul läuft.
 */
export const manifest = {
  id: 'dashboard',
  version: '0.1.0',
  name: { de: 'Linien-Dashboard', en: 'Line dashboard' },
  description: {
    de: 'PackML-Zustände, Linien-OEE und Engpassanalyse',
    en: 'PackML states, line OEE and bottleneck analysis',
  },
  category: 'Produktion',
  gxp: false,
  minConformance: 'basic',
  nav: {
    section: 'Linie',
    order: 10,
    icon: 'overview',
    label: { de: 'Linienübersicht', en: 'Line overview' },
  },
  routes: [{ path: '', title: { de: 'Linienübersicht', en: 'Line overview' } }],
  // Lesen der Linie dürfen alle angemeldeten Benutzer (Rollen und Rechte)
  permissions: [],
} satisfies Omit<ModuleManifest, 'entry' | 'styles'>;
