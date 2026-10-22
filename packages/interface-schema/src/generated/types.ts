/* Automatisch erzeugt aus schemas/*.schema.json – nicht von Hand bearbeiten.
   Neu erzeugen: pnpm --filter @iot/interface-schema generate */

/**
 * Topic alarms: eine Nachricht pro Ereignis. Stufe basic meldet nur die Sammelstörung COMMON-FAULT ohne Text (S-04).
 */
export type AlarmData = {
  /**
   * Stabil über alle Softwarestände – daran hängen Fehlerbäume und Auswertungen
   */
  alarmId: string;
  event: 'raised' | 'cleared' | 'acknowledged';
  class: 'fault' | 'warning' | 'info';
  textKey?: string;
  text?: LocalizedText;
  subsystem?: string;
  /**
   * Benutzer, der quittiert hat; nur bei acknowledged gesetzt
   */
  user: string | null;
};

/**
 * Nachrichtenumschlag – für alle Datenklassen gleich. `data` wird durch das Schema der Datenklasse geprüft.
 */
export interface Envelope {
  /**
   * Datenklasse und Schemaversion, z. B. iot.state/1.0
   */
  schema: string;
  /**
   * lineId oder machineId: kleingeschrieben, ohne Leerzeichen, eindeutig je Standort (z. B. l1, l1-fill)
   */
  machineId: string;
  /**
   * Zeitstempel der Quelle (Steuerung) in UTC – maßgeblich für GxP-Daten
   */
  ts: string;
  /**
   * Empfangszeit auf dem Edge Device, setzt der Normalizer
   */
  tsEdge: string;
  /**
   * Datenqualität; bad z. B. bei unterbrochener Verbindung zur Steuerung
   */
  quality: 'good' | 'uncertain' | 'bad';
  /**
   * Inhalt nach dem Schema der Datenklasse
   */
  data: Record<string, unknown>;
}
/**
 * Topic identity (retained): einmal beim Start und bei Änderung
 */
export interface IdentityData {
  /**
   * Maschinentyp im Klartext
   */
  type: string;
  /**
   * own für eigene Maschinen, sonst der Herstellername
   */
  manufacturer: string;
  serial: string;
  /**
   * lineId oder machineId: kleingeschrieben, ohne Leerzeichen, eindeutig je Standort (z. B. l1, l1-fill)
   */
  lineId: string;
  /**
   * Position in der Linie, beginnend bei 1
   */
  position: number;
  /**
   * Version der Schnittstellenspezifikation
   */
  interfaceVersion: string;
  /**
   * Konformitätsstufe der Maschine
   */
  conformance: 'basic' | 'standard' | 'full';
  /**
   * Sollleistung in Stück pro Minute – Grundlage der OEE-Leistung (S-03)
   */
  nominalRate: number;
  /**
   * Anbindung der Maschine im Klartext, z. B. „OPC UA · PackML-Tags“ – optional, setzt der Normalizer aus der Mapping-Datei (S-07)
   */
  source?: string;
}
/**
 * Topic meta (retained): Katalog der Prozesswerte. Nur Schlüssel aus diesem Katalog sind in values zulässig.
 */
export interface MetaData {
  values: ValueDefinition[];
}
export interface ValueDefinition {
  key: string;
  name: LocalizedText;
  /**
   * Einheit, leer bei einheitenlosen Werten
   */
  unit: string;
  /**
   * Untere Grenze, optional (S-06)
   */
  min?: number;
  /**
   * Obere Grenze, optional (S-06)
   */
  max?: number;
  gxp: boolean;
  sampling: 'onChange' | 'cyclic';
}
/**
 * Text je Sprache; Deutsch ist Pflicht
 */
export interface LocalizedText {
  de: string;
  [k: string]: string;
}
/**
 * Topic state (retained): bei jeder Änderung
 */
export interface StateData {
  /**
   * Zustand nach PackML (ISA-TR88.00.02); alle Stufen dürfen alle Zustände melden (S-02)
   */
  state:
    | 'Idle'
    | 'Starting'
    | 'Execute'
    | 'Completing'
    | 'Complete'
    | 'Resetting'
    | 'Holding'
    | 'Held'
    | 'Unholding'
    | 'Suspending'
    | 'Suspended'
    | 'Unsuspending'
    | 'Stopping'
    | 'Stopped'
    | 'Aborting'
    | 'Aborted'
    | 'Clearing';
  /**
   * Betriebsart nach PackML, z. B. Production, Maintenance, Manual
   */
  mode: string;
  /**
   * Grund des Zustands im Klartext, sonst null
   */
  reason: string | null;
}
/**
 * Topic counters (retained): kumulativ seit resetAt, zyklisch (Vorschlag 5 s). Stufe basic liefert gut und gesamt, ab standard auch schlecht.
 */
export interface CountersData {
  good: number;
  bad?: number;
  total: number;
  /**
   * Zeitstempel in UTC nach RFC 3339 mit Z
   */
  resetAt: string;
}
/**
 * Topic activeAlarms (retained, S-09): vollständige Liste der anstehenden Alarme, bei jeder Änderung neu. Wer sich später verbindet, kennt damit sofort den Stand. Stufe basic: nur die Sammelstörung COMMON-FAULT.
 */
export interface ActiveAlarmsData {
  alarms: ActiveAlarm[];
}
export interface ActiveAlarm {
  alarmId: string;
  class: 'fault' | 'warning' | 'info';
  textKey?: string;
  text?: LocalizedText;
  subsystem?: string;
  /**
   * Zeitstempel in UTC nach RFC 3339 mit Z
   */
  raisedAt: string;
  acknowledged: boolean;
  /**
   * Benutzer, der an der Maschine quittiert hat; sonst null
   */
  user: string | null;
}
/**
 * Topic values: Prozesswerte, zyklisch oder bei Änderung
 */
export interface ValuesData {
  /**
   * @minItems 1
   */
  values: [
    {
      key: string;
      value: number;
    },
    ...{
      key: string;
      value: number;
    }[]
  ];
}
/**
 * Topic batch (retained, S-08): Batch- und Rezeptereignisse (Stufe full). Die letzte Meldung bleibt auf dem Broker – wer sich später verbindet, erkennt den laufenden Batch.
 */
export interface BatchData {
  event: 'started' | 'paused' | 'resumed' | 'ended';
  batchId: string;
  /**
   * Produkt laut Maschine bzw. Rezept (S-10)
   */
  productName: string;
  /**
   * Sollmenge des Batches in Stück, falls bekannt (S-10)
   */
  targetQuantity?: number;
  /**
   * Zeitstempel in UTC nach RFC 3339 mit Z
   */
  startedAt: string;
  recipe: {
    id: string;
    version: number;
  };
  /**
   * Teilenummern der eingesetzten Formatteile
   */
  formatParts: string[];
}
