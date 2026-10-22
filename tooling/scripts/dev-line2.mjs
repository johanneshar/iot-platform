// Zweite Linie im Dev-Betrieb: eigener Core (Backend 4001, Shell 5190) für „Linie 2 · Spritzen“.
// Jede Linie hat im Betrieb ihr eigenes Edge Device (E-23); die Linienwahl springt zwischen den Adressen.
import { spawn } from 'node:child_process';

const env = (extra) => ({ ...process.env, ...extra });
const children = [
  spawn('pnpm', ['--filter', '@iot/core-backend', 'dev'], {
    stdio: 'inherit',
    env: env({ CORE_LINE_ID: 'l2', CORE_PORT: '4001' }),
  }),
  spawn('pnpm', ['--filter', '@iot/core-frontend', 'dev'], {
    stdio: 'inherit',
    env: env({ CORE_FRONTEND_PORT: '5190', CORE_BACKEND_URL: 'http://localhost:4001' }),
  }),
];
const stop = () => children.forEach((child) => child.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
