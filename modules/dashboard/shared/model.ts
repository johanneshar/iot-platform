import type { LocalizedText } from '@iot/interface-schema';

/** 3D-Modell der Linie mit aufgelöster Zuordnung (ADR-010) – Antwort von `GET model`. */
export interface LineModelInfo {
  /** Pfad der Modelldatei relativ zur API des Moduls */
  file: string;
  machines: { machineId: string; nodes: string[] }[];
  alarms: {
    alarmId: string;
    machineId: string;
    label: LocalizedText;
    position: [number, number, number];
  }[];
}
