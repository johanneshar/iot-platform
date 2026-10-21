import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateTypes } from '../src/codegen';

const target = fileURLToPath(new URL('../src/generated/types.ts', import.meta.url));
writeFileSync(target, await generateTypes());
console.log(`Typen geschrieben: ${target}`);
