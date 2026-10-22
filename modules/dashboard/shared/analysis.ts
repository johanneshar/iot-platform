import type { LocalizedText } from '@iot/interface-schema';
import type { PackMLState } from '@iot/module-sdk/data';

/** Auswahl im Zeitraum-Schalter der Detailseite (E-37). */
export interface PeriodOption {
  id: string;
  label: LocalizedText;
}

export interface StateSegment {
  state: PackMLState;
  reason: string | null;
  /** UTC */
  start: string;
  end: string;
}

export interface Stop extends StateSegment {
  durationMs: number;
  /** Alarm, der zum Beginn des Stillstands kam (Störung vor Warnung) */
  alarm: { alarmId: string; text: LocalizedText | null } | null;
}

export interface Bucket {
  start: string;
  end: string;
  /** Stück pro Minute in `Execute`; `null` ohne Laufzeit */
  rate: number | null;
  /** Ausschussanteil 0–1; `null` ohne Menge */
  rejectShare: number | null;
  total: number;
}

export interface ValueSeries {
  key: string;
  name: LocalizedText;
  unit: string;
  gxp: boolean;
  min: number | null;
  max: number | null;
  last: number | null;
  avg: number | null;
  low: number | null;
  high: number | null;
  points: { ts: string; avg: number }[];
}

export interface AlarmStat {
  alarmId: string;
  text: LocalizedText | null;
  class: 'fault' | 'warning' | 'info';
  count: number;
  durationMs: number;
}

export interface MachineAnalysis {
  machineId: string;
  period: string;
  from: string;
  to: string;
  /** Beginn der Zählerdaten im Zeitraum; später als `from`, wenn der Verlauf erst danach beginnt */
  observedFrom: string;
  /** Zählersprünge im Zeitraum, die nicht gezählt wurden (Rücksprung, mehr als möglich) */
  implausibleCounters: number;
  kpis: {
    /** 0–1 */
    availability: number | null;
    performance: number | null;
    quality: number | null;
    oee: number | null;
    good: number;
    bad: number;
    total: number;
    executeMs: number;
    plannedMs: number;
    nominalRate: number | null;
  };
  stateTotals: Partial<Record<PackMLState, number>>;
  segments: StateSegment[];
  stops: Stop[];
  bucketMs: number;
  buckets: Bucket[];
  values: ValueSeries[];
  alarms: { count: number; faults: number; faultDowntimeMs: number; top: AlarmStat[] };
}
