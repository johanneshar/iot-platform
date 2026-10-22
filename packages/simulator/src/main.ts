import mqtt from 'mqtt';
import { Simulator } from './simulator';

const url = process.env['MQTT_URL'] ?? 'mqtt://localhost:1883';
const client = mqtt.connect(url, { clientId: 'iot-simulator', reconnectPeriod: 5_000 });
let warned = false;

client.on('error', (error) => {
  if (!warned)
    console.warn(
      `Simulator: MQTT-Broker ${url} nicht erreichbar (${error.message}) – neuer Versuch alle 5 s`,
    );
  warned = true;
});

// Batch-Zyklus kürzer, z. B. für E2E-Tests (SIM_BATCH_RUN_MS, SIM_BATCH_PAUSE_MS)
const ms = (name: string) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};
const batchRunMs = ms('SIM_BATCH_RUN_MS');
const batchPauseMs = ms('SIM_BATCH_PAUSE_MS');
const simulator = new Simulator(
  (outgoing) => {
    client.publish(outgoing.topic, JSON.stringify(outgoing.message), {
      qos: 1,
      retain: outgoing.retain,
    });
  },
  {
    ...(batchRunMs ? { batchRunMs } : {}),
    ...(batchPauseMs ? { batchPauseMs } : {}),
  },
);

client.once('connect', () => {
  console.log(
    `Simulator: verbunden mit ${url}, sende ${simulator.lines.map((l) => l.name).join(', ')}`,
  );
  simulator.start();
});

const shutdown = () => {
  simulator.stop();
  client.end(false, () => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
