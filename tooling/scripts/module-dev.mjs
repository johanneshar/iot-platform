// Dev-Betrieb eines Moduls: Oberfläche im Watch-Modus bauen und das Backend starten.
// --configLoader runner: die Vite-Konfiguration importiert TypeScript aus @iot/module-sdk.
import { spawn } from 'node:child_process';

const run = (command, args) => spawn('pnpm', ['exec', command, ...args], { stdio: 'inherit' });
const children = [
  run('vite', ['build', '--watch', '--configLoader', 'runner']),
  run('tsx', ['watch', 'backend/main.ts']),
];
const stop = () => children.forEach((child) => child.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
