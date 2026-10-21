// Startet den lokalen MQTT-Broker (ersetzt im Dev-Betrieb den Databus) und danach
// alle Pakete mit `dev`-Skript über Turborepo.
import { spawn, spawnSync } from 'node:child_process';

const broker = spawnSync('docker', ['compose', '-f', 'deploy/docker-compose.dev.yml', 'up', '-d'], {
  stdio: 'inherit',
});

if (broker.status !== 0) {
  console.warn(
    '\n⚠  MQTT-Broker nicht gestartet (läuft Docker?). Shell und Backend starten trotzdem.\n',
  );
}

const turbo = spawn('pnpm', ['exec', 'turbo', 'run', 'dev', '--filter=!@iot/docs'], {
  stdio: 'inherit',
});
turbo.on('exit', (code) => process.exit(code ?? 0));
