import type { ModuleManifest } from '@iot/module-sdk/manifest';

/**
 * Manifest des Moduls (CLAUDE.md, Abschnitt 6.1). `entry` und `styles` setzt das Backend beim Anmelden,
 * weil sie von der Adresse abhängen, unter der das Modul läuft.
 */
export const manifest = {
  id: '__MODULE_ID__',
  version: '0.1.0',
  name: { de: '__MODULE_NAME__', en: '__MODULE_NAME__' },
  description: { de: '[Beschreibung – erscheint auch auf dem Sperrbildschirm]' },
  category: 'Produktion',
  gxp: false,
  minConformance: 'basic',
  nav: { section: 'Linie', order: 100, icon: 'overview' },
  routes: [{ path: '', title: { de: '__MODULE_NAME__', en: '__MODULE_NAME__' } }],
  permissions: ['__MODULE_ID__.view'],
} satisfies Omit<ModuleManifest, 'entry' | 'styles'>;
