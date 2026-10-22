/** Datenklassen der Schnittstelle in Reihenfolge der Spezifikation. */
export const DATA_CLASSES = [
  'identity',
  'meta',
  'state',
  'counters',
  'alarms',
  'activeAlarms',
  'values',
  'batch',
] as const;

export type DataClass = (typeof DATA_CLASSES)[number];

/** Topics mit retained-Flag laut Spezifikation, Abschnitt „Transport“. */
export const RETAINED: Readonly<Record<DataClass, boolean>> = {
  identity: true,
  meta: true,
  state: true,
  counters: true,
  alarms: false,
  // S-09: Stand der anstehenden Alarme für Nachzügler
  activeAlarms: true,
  values: false,
  // S-08: laufender Batch für Nachzügler
  batch: true,
};

export const TOPIC_ROOT = 'iot/v1';

export function topicFor(lineId: string, machineId: string, dataClass: DataClass): string {
  return `${TOPIC_ROOT}/${lineId}/${machineId}/${dataClass}`;
}

export interface ParsedTopic {
  lineId: string;
  machineId: string;
  dataClass: DataClass;
}

export function isDataClass(value: string): value is DataClass {
  return (DATA_CLASSES as readonly string[]).includes(value);
}

/** Zerlegt `iot/v1/{lineId}/{machineId}/{datenklasse}`; liefert `null` bei fremden Topics. */
export function parseTopic(topic: string): ParsedTopic | null {
  const match = /^iot\/v1\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(topic);
  if (!match) return null;
  const [, lineId = '', machineId = '', dataClass = ''] = match;
  return isDataClass(dataClass) ? { lineId, machineId, dataClass } : null;
}

/** Wert des Feldes `schema` im Umschlag, z. B. `iot.state/1.0`. */
export function schemaName(dataClass: DataClass, minor = 0): string {
  return `iot.${dataClass}/1.${String(minor)}`;
}
