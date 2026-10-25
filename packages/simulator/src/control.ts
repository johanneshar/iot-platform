// Befehl an den laufenden Simulator – spielt die Bedienung am HMI nach (nur Entwicklung, E-51).
// Aufruf über die Wurzel: pnpm sim stop | pnpm sim recipe syringe-nest | pnpm sim start
// Linie und Broker: SIM_LINE (Standard l3), MQTT_URL (Standard mqtt://localhost:1883)
import mqtt from 'mqtt';
import { controlTopic, type SimCommand } from './simulator';

const USAGE = 'Aufruf: pnpm sim stop | pnpm sim start | pnpm sim recipe <rezept-id>';

function parse(args: string[]): SimCommand | null {
  const [command, recipe] = args;
  if (command === 'stop' || command === 'start') return { command };
  if (command === 'recipe' && recipe) return { command, recipe };
  return null;
}

const command = parse(process.argv.slice(2).filter((a) => a !== '--'));
if (!command) {
  console.error(USAGE);
  process.exit(1);
}

const url = process.env['MQTT_URL'] ?? 'mqtt://localhost:1883';
const lineId = process.env['SIM_LINE'] ?? 'l3';
const client = mqtt.connect(url, { clientId: `iot-sim-control-${String(process.pid)}` });
client.on('error', (error) => {
  console.error(`MQTT-Broker ${url} nicht erreichbar: ${error.message}`);
  process.exit(1);
});
client.once('connect', () => {
  client.publish(controlTopic(lineId), JSON.stringify(command), { qos: 1 }, () => {
    console.log(`Befehl an den Simulator (${lineId}): ${JSON.stringify(command)}`);
    client.end();
  });
});
