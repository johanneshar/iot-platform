import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { toCss } from '../src/to-css';

const target = fileURLToPath(new URL('../tokens.css', import.meta.url));
writeFileSync(target, toCss());
console.log(`tokens.css geschrieben: ${target}`);
