// Legt ein neues Modul aus tooling/module-template an.
// Aufruf: pnpm create-module <id> "<Name>" [--port 41xx] [--dir modules]
import {
  cpSync,
  rmSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const [value] = args.splice(index, 2).slice(1);
  return value;
};
const port = option('port', '4199');
const dir = option('dir', 'modules');
const [id, name = id] = args;

if (!id || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) {
  console.error('Aufruf: pnpm create-module <id> "<Name>" – id in kebab-case, z. B. alarms');
  process.exit(1);
}

const root = resolve(import.meta.dirname, '../..');
const target = join(root, dir, id);
if (existsSync(target)) {
  console.error(`${target} gibt es schon.`);
  process.exit(1);
}

cpSync(join(root, 'tooling/module-template'), target, { recursive: true });
renameSync(join(target, 'package.json.tpl'), join(target, 'package.json'));
// VORLAGE.md beschreibt die Vorlage selbst und gehört nicht ins Modul
rmSync(join(target, 'VORLAGE.md'));

const replace = (file) => {
  const text = readFileSync(file, 'utf8')
    .replaceAll('__MODULE_ID__', id)
    .replaceAll('__MODULE_NAME__', name)
    .replaceAll('__MODULE_PORT__', port);
  writeFileSync(file, text);
};
const walk = (path) => {
  for (const entry of readdirSync(path)) {
    const full = join(path, entry);
    if (statSync(full).isDirectory()) walk(full);
    else replace(full);
  }
};
walk(target);

console.log(`Modul „${name}“ angelegt: ${target}`);
console.log(
  'Nächste Schritte: pnpm install, Manifest ausfüllen, Checkliste in CLAUDE.md 6.3 abarbeiten.',
);
