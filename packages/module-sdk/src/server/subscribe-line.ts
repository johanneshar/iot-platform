import {
  TOPIC_ROOT,
  parseTopic,
  validateMessage,
  type DataClass,
  type Message,
} from '@iot/interface-schema';
import mqtt, { type MqttClient } from 'mqtt';

export interface SubscribeLineOptions {
  /** Databus, im Dev-Betrieb der Broker aus `pnpm dev` */
  url: string;
  lineId: string;
  clientId: string;
  /** Nur schemakonforme Nachrichten der kanonischen Topics (nie Connector-Topics) */
  onMessage: (machineId: string, dataClass: DataClass, message: Message<DataClass>) => void;
  log?: (message: string) => void;
}

/** Kanonische Topics der Linie für Modul-Backends, die einen eigenen Verlauf brauchen (ADR-005). */
export function subscribeLine({
  url,
  lineId,
  clientId,
  onMessage,
  log = console.log,
}: SubscribeLineOptions): MqttClient {
  const client = mqtt.connect(url, { clientId, reconnectPeriod: 5_000 });
  client.on('connect', () => {
    log(`verbunden mit ${url}`);
    client.subscribe(`${TOPIC_ROOT}/${lineId}/+/+`, { qos: 1 });
  });
  client.on('message', (topic, payload) => {
    const parsed = parseTopic(topic);
    if (!parsed || parsed.lineId !== lineId) return;
    let message: unknown;
    try {
      message = JSON.parse(payload.toString('utf8'));
    } catch {
      return;
    }
    if (validateMessage(parsed.dataClass, message).valid) {
      onMessage(parsed.machineId, parsed.dataClass, message as Message<DataClass>);
    }
  });
  return client;
}
