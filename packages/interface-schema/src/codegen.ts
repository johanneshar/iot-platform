import { compile, type JSONSchema } from 'json-schema-to-typescript';
import { fileURLToPath } from 'node:url';
import { DATA_CLASSES } from './topics';

const HEADER = `/* Automatisch erzeugt aus schemas/*.schema.json – nicht von Hand bearbeiten.
   Neu erzeugen: pnpm --filter @iot/interface-schema generate */`;

const schemaDir = fileURLToPath(new URL('../schemas/', import.meta.url));
const ROOT = 'SchemaIndex';

/** Erzeugt die TypeScript-Typen aller Datenklassen und des Umschlags in einem Durchgang. */
export async function generateTypes(): Promise<string> {
  // Wurzelschema, das alle Schemas referenziert – so entsteht jeder Typ genau einmal
  const names = ['envelope', ...DATA_CLASSES];
  const root: JSONSchema = {
    title: ROOT,
    type: 'object',
    properties: Object.fromEntries(names.map((n) => [n, { $ref: `${n}.schema.json` }])),
    additionalProperties: false,
  };
  const ts = await compile(root, ROOT, {
    cwd: schemaDir,
    bannerComment: '',
    additionalProperties: false,
    declareExternallyReferenced: true,
    style: { singleQuote: true, printWidth: 100 },
  });
  // Das Hilfs-Wurzelinterface selbst wird nicht gebraucht
  const withoutRoot = ts.replace(new RegExp(`export interface ${ROOT} \\{[\\s\\S]*?\\n\\}\\n`), '');
  return `${HEADER}\n\n${withoutRoot.trim()}\n`;
}
