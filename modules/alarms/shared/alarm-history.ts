import type { LocalizedText } from '@iot/module-sdk';

export type AlarmClass = 'fault' | 'warning' | 'info';

/** Ein Auftreten eines Alarms: gekommen, ggf. an der Maschine quittiert, gegangen. */
export interface AlarmOccurrence {
  id: number;
  machineId: string;
  alarmId: string;
  class: AlarmClass;
  text: LocalizedText | null;
  /** Zeitstempel der Quelle (UTC) */
  raisedAt: string;
  clearedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

/** Top-Störung: Summe der Dauer „kommt“ bis „geht“ im Zeitraum (E-33). */
export interface TopFault {
  alarmId: string;
  machineId: string;
  text: LocalizedText | null;
  minutes: number;
  count: number;
}
