// Dritte Linie im Dev-Betrieb: „Linie 3 · Flexfill“ mit eigenem Core (Backend 4002, Shell 5195) und den
// Modulen Dashboard (4201), Alarme (4202), Fehlersuche (4203). Jede Linie hat im Betrieb ihr eigenes
// Edge Device (E-23). Voraussetzung: `pnpm dev` läuft (Broker, Simulator, gebaute Einstiegsmodule).
import { spawn } from 'node:child_process';

const CORE = 'http://localhost:4002';
const children = [];
const run = (filter, script, env) => {
  const child = spawn('pnpm', ['--filter', filter, script], {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  children.push(child);
};

run('@iot/core-backend', 'dev', { CORE_LINE_ID: 'l3', CORE_PORT: '4002' });
run('@iot/core-frontend', 'dev', { CORE_FRONTEND_PORT: '5195', CORE_BACKEND_URL: CORE });
const modules = [
  ['@iot/module-dashboard', '4201', 'dashboard'],
  ['@iot/module-alarms', '4202', 'alarms'],
  ['@iot/module-troubleshooting', '4203', 'troubleshooting'],
];
for (const [filter, port, id] of modules) {
  run(filter, 'start', {
    MODULE_PORT: port,
    CORE_URL: CORE,
    LINE_ID: 'l3',
    MODULE_DATA_DIR: `.data/l3-${id}`,
  });
}

const stop = () => children.forEach((child) => child.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
