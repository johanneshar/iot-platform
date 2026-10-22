import { SHARED_MODULES } from '@iot/module-sdk/manifest';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';

/** CommonJS-Pakete: `export *` liefert dort keine benannten Exporte, sie werden ausdrücklich erzeugt. */
const COMMONJS = new Set(['react', 'react/jsx-runtime', 'react-dom']);
const PREFIX = 'virtual:iot-shared/';
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const require = createRequire(import.meta.url);

function shimSource(specifier: string): string {
  if (!COMMONJS.has(specifier)) return `export * from '${specifier}';\n`;
  const names = Object.keys(require(specifier) as object).filter(
    (n) => n !== 'default' && IDENTIFIER.test(n),
  );
  return [
    `import * as ns from '${specifier}';`,
    'const mod = ns.default ?? ns;',
    'export default mod;',
    `export const { ${names.join(', ')} } = mod;`,
    '',
  ].join('\n');
}

/** Rollup-Eingaben der Weiterleitungsmodule: `shared/<datei>` → virtuelles Modul. */
export const sharedInputs = Object.fromEntries(
  Object.values(SHARED_MODULES).map((file) => [`shared/${file}`, `${PREFIX}${file}`]),
);

/**
 * Gemeinsame Bibliotheken für Module (ADR-002): erzeugt je Bibliothek ein Weiterleitungsmodul und setzt
 * die Import-Map darauf – im Dev-Betrieb auf die virtuellen Module, im Build auf `/shared/<datei>.js`.
 */
export function sharedModules(): Plugin {
  let build = false;
  const byFile = new Map<string, string>(
    Object.entries(SHARED_MODULES).map(([spec, file]) => [file, spec]),
  );
  return {
    name: 'iot-shared-modules',
    configResolved(config) {
      build = config.command === 'build';
    },
    resolveId(id) {
      return id.startsWith(PREFIX) ? `\0${id}` : null;
    },
    load(id) {
      if (!id.startsWith(`\0${PREFIX}`)) return null;
      const specifier = byFile.get(id.slice(PREFIX.length + 1));
      return specifier ? shimSource(specifier) : null;
    },
    transformIndexHtml() {
      const imports = Object.fromEntries(
        Object.entries(SHARED_MODULES).map(([specifier, file]) => [
          specifier,
          build ? `/shared/${file}.js` : `/@id/__x00__${PREFIX}${file}`,
        ]),
      );
      return [
        {
          tag: 'script',
          attrs: { type: 'importmap' },
          children: JSON.stringify({ imports }, null, 2),
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}
