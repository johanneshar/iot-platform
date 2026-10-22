// MQTT-Broker im Prozess für E2E-Tests (ersetzt Mosquitto ohne Docker).
// Aufruf: node tooling/scripts/test-broker.mjs [port] [--with-simulator]
import { Aedes } from 'aedes';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const args = process.argv.slice(2);
const port = Number(args.find((a) => /^\d+$/.test(a)) ?? 1884);
const broker = await Aedes.createBroker();
const server = createServer(broker.handle);
await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
console.log(`test-broker: mqtt://localhost:${String(port)}`);

// Optional den Simulator starten (Linie 3 · Flexfill) – erst, wenn ein Core die Topics
// abonniert hat: Alarm- und Batch-Ereignisse sind nicht retained und gingen sonst verloren.
let simulator = null;
if (args.includes('--with-simulator')) {
  broker.on('subscribe', (subscriptions, client) => {
    const core =
      client?.id.startsWith('iot-core') && subscriptions.some((s) => s.topic.startsWith('iot/v1/'));
    if (!core || simulator) return;
    simulator = spawn('pnpm', ['--filter', '@iot/simulator', 'start'], {
      stdio: 'inherit',
      env: { ...process.env, MQTT_URL: `mqtt://localhost:${String(port)}` },
    });
  });
}

const stop = () => {
  simulator?.kill();
  server.close();
  broker.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
