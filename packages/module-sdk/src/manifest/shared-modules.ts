/**
 * Bibliotheken, die Shell und Module gemeinsam nutzen (ADR-002). Module markieren sie in ihrem Build als
 * extern; die Import-Map der Shell löst sie auf `/shared/<datei>.js` auf – so gibt es je Bibliothek genau
 * eine Instanz (eine React-Instanz, ein ShellContext, ein Satz Komponenten).
 */
export const SHARED_MODULES = {
  react: 'react',
  'react/jsx-runtime': 'react-jsx-runtime',
  'react-dom': 'react-dom',
  'react-i18next': 'react-i18next',
  '@iot/module-sdk': 'module-sdk',
  '@iot/ui': 'ui',
} as const;

/** Erste Pfadteile, die die Shell selbst belegt – kein Modul darf so heißen. */
export const RESERVED_MODULE_IDS = [
  'baukasten',
  'audit',
  'core',
  'api',
  'shared',
  'assets',
] as const;
