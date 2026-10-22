import type { ModuleManifest } from '@iot/module-sdk/manifest';

/**
 * Manifest des Moduls (CLAUDE.md, Abschnitt 6.1). `entry` und `styles` setzt das Backend beim Anmelden,
 * weil sie von der Adresse abhängen, unter der das Modul läuft.
 */
export const manifest = {
  id: 'example',
  version: '0.1.0',
  name: { de: 'Beispielmodul', en: 'Example module' },
  description: {
    de: 'Zeigt, wie ein Modul aufgebaut ist und sich beim Core anmeldet',
    en: 'Shows how a module is built and registers with the core',
  },
  category: 'Integration',
  gxp: false,
  minConformance: 'basic',
  nav: { section: 'Plattform', order: 90, icon: 'modules' },
  routes: [{ path: '', title: { de: 'Beispielmodul', en: 'Example module' } }],
  permissions: ['example.view'],
} satisfies Omit<ModuleManifest, 'entry' | 'styles'>;
