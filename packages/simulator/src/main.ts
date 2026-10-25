import mqtt from 'mqtt';
import { controlTopic, Simulator, type SimCommand } from './simulator';

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
  // Bedienung am HMI nachspielen (nur Entwicklung, E-51): pnpm sim stop|start|recipe <id>
  for (const line of simulator.lines) client.subscribe(controlTopic(line.id), { qos: 1 });
});

client.on('message', (topic, payload) => {
  const line = simulator.lines.find((l) => controlTopic(l.id) === topic);
  if (!line) return;
  let command: SimCommand;
  try {
    command = JSON.parse(payload.toString()) as SimCommand;
  } catch {
    console.warn(`Simulator: Befehl auf ${topic} ist kein JSON`);
    return;
  }
  const error = simulator.control(line.id, command);
  console.log(
    error
      ? `Simulator: Befehl ${JSON.stringify(command)} abgelehnt – ${error}`
      : `Simulator: ${line.name} – ${JSON.stringify(command)} ausgeführt`,
  );
});

const shutdown = () => {
  simulator.stop();
  client.end(false, () => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
