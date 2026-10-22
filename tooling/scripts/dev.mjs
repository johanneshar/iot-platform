// Dev-Betrieb: MQTT-Broker (ersetzt den Databus), Simulator, Core und alle Module.
//
// Standard: Broker im Prozess (ohne Docker). Der Simulator startet erst, wenn der Core die Topics
// abonniert hat – Alarm- und Batch-Ereignisse sind nicht retained und gingen sonst verloren.
// Mit IOT_BROKER=mosquitto läuft stattdessen Mosquitto in Docker (deploy/docker-compose.dev.yml).
import { spawn, spawnSync } from 'node:child_process';

const children = [];
const run = (command, args, env = {}) => {
  const child = spawn(command, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  children.push(child);
  return child;
};

let turboFilter = ['--filter=!@iot/docs'];
if (process.env['IOT_BROKER'] === 'mosquitto') {
  const broker = spawnSync(
    'docker',
    ['compose', '-f', 'deploy/docker-compose.dev.yml', 'up', '-d'],
    {
      stdio: 'inherit',
    },
  );
  if (broker.status !== 0) console.warn('\n⚠  Mosquitto nicht gestartet (läuft Docker?).\n');
} else {
  run('node', ['tooling/scripts/test-broker.mjs', '1883', '--with-simulator']);
  turboFilter = [...turboFilter, '--filter=!@iot/simulator'];
}

const turbo = run('pnpm', ['exec', 'turbo', 'run', 'dev', ...turboFilter]);
const stop = () => {
  children.forEach((child) => child.kill());
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
turbo.on('exit', (code) => {
  stop();
  process.exit(code ?? 0);
});
