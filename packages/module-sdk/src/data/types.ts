import type {
  AlarmData,
  CountersData,
  IdentityData,
  LocalizedText,
  MetaData,
  StateData,
} from '@iot/interface-schema';

export type DataQuality = 'good' | 'uncertain' | 'bad';
export type PackMLState = StateData['state'];

/** Zustand seit einem Zeitpunkt (UTC). */
export interface StatePeriod {
  state: PackMLState;
  since: string;
}

export interface CounterSample {
  /** Zeitstempel der Quelle (UTC) */
  ts: string;
  good: number;
  bad?: number;
  total: number;
}

export interface ActiveAlarm {
  alarmId: string;
  class: AlarmData['class'];
  textKey?: string;
  text?: LocalizedText;
  subsystem?: string;
  raisedAt: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
}

/** Letzter Stand einer Maschine im kanonischen Linienmodell (Datenkern im Core). */
export interface MachineSnapshot {
  machineId: string;
  identity: IdentityData | null;
  meta: MetaData | null;
  state: (StateData & { since: string }) | null;
  counters: (CountersData & { ts: string }) | null;
  values: Record<string, { value: number; ts: string }>;
  /** Anstehende Alarme (gekommen, noch nicht gegangen) */
  alarms: ActiveAlarm[];
  /** Schlechteste Qualität der letzten Nachrichten je Datenklasse */
  quality: DataQuality;
  lastMessageAt: string | null;
  /** Nachrichten, die das Schema nicht bestanden haben – werden nicht übernommen */
  invalidMessages: number;
  /** Verlauf seit Beginn der Beobachtung in der laufenden Schicht */
  history: {
    states: StatePeriod[];
    /**
     * Erster Zählerstand der Schicht (bzw. seit Start des Core). Nach einem Zählerreset um den Stand vor dem
     * Reset verschoben (auch negativ), damit `counters − counterBaseline` die Menge der Schicht bleibt.
     */
    counterBaseline: CounterSample | null;
    /** Zählerstände der letzten Minuten für die aktuelle Leistung (nach einem Reset ebenso verschoben) */
    recentCounters: CounterSample[];
  };
}

export interface LineSnapshot {
  lineId: string;
  shift: { start: string; end: string } | null;
  /** OEE-Ziel der Linie in Prozent (Linienkonfiguration) */
  oeeTarget: number | null;
  machines: MachineSnapshot[];
}
