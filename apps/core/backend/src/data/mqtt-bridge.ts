import { TOPIC_ROOT } from '@iot/interface-schema';
import mqtt, { type MqttClient } from 'mqtt';
import type { LineModel } from './line-model.js';

/**
 * Abonniert die kanonischen Topics der eigenen Linie (Databus, im Dev-Betrieb Mosquitto) und speist das
 * Linienmodell. Module lesen nie direkt von MQTT, sondern über den Core (CLAUDE.md, Abschnitt 4).
 */
export function connectLine(
  url: string,
  lineId: string,
  model: LineModel,
  log: (message: string) => void,
): MqttClient {
  const client = mqtt.connect(url, {
    clientId: `iot-core-${lineId}-${String(process.pid)}`,
    reconnectPeriod: 5_000,
  });
  let warned = false;
  client.on('connect', () => {
    warned = false;
    log(`Datenkern: verbunden mit ${url}`);
    client.subscribe(`${TOPIC_ROOT}/${lineId}/+/+`, { qos: 1 });
  });
  client.on('error', (error) => {
    if (!warned)
      log(
        `Datenkern: MQTT-Broker ${url} nicht erreichbar (${error.message}) – neuer Versuch alle 5 s`,
      );
    warned = true;
  });
  client.on('message', (topic, payload) => {
    let message: unknown;
    try {
      message = JSON.parse(payload.toString('utf8'));
    } catch {
      message = null;
    }
    model.apply(topic, message);
  });
  return client;
}
