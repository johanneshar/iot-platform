import type { LocalizedText } from '@iot/interface-schema';

/** Ablauf eines Batches (E-40, E-41). */
export type BatchStatus =
  /** läuft (mindestens eine Maschine gestartet und nicht beendet) */
  | 'running'
  /** beendet, Linienräumung steht aus */
  | 'ended'
  /** Linienräumung bestätigt, Bericht eingefroren – Prüfung steht aus */
  | 'frozen'
  /** „Geprüft“ signiert – Freigabe durch QA steht aus */
  | 'reviewed'
  /** „Freigabe“ signiert – abgeschlossen */
  | 'released';

/** Vorgang im Audit Trail des Core, auf den sich ein Schritt stützt. */
export interface AuditRef {
  seq: number;
  ts: string;
  username: string;
  userName: string;
  meaning: string | null;
}

export interface BatchSummary {
  batchId: string;
  recipe: { id: string; version: number };
  formatParts: string[];
  startedAt: string;
  endedAt: string | null;
  status: BatchStatus;
  machines: string[];
  lineRelease: (AuditRef & { afterStart: boolean }) | null;
  clearance: AuditRef | null;
  review: AuditRef | null;
  release: AuditRef | null;
  reportHash: string | null;
}

export interface MachineCounts {
  machineId: string;
  good: number;
  bad: number;
  total: number;
  /** Zählersprünge, die nicht gezählt wurden (counterStep) */
  implausible: number;
}

export interface ValueStats {
  key: string;
  name: LocalizedText;
  unit: string;
  min: number | null;
  max: number | null;
  count: number;
  low: number | null;
  high: number | null;
  avg: number | null;
  outOfLimits: number;
  uncertain: number;
  bad: number;
  first: string | null;
  last: string | null;
}

export interface ReportMachine {
  machineId: string;
  name: string;
  source: string | null;
  counts: MachineCounts;
  events: { event: string; ts: string }[];
  values: ValueStats[];
  alarms: {
    alarmId: string;
    class: 'fault' | 'warning' | 'info';
    text: LocalizedText | null;
    raisedAt: string;
    clearedAt: string | null;
  }[];
  /** Zeiträume ohne Nachrichten der Maschine (Datenlücken, Konzept: GxP-Daten) */
  gaps: { from: string; to: string }[];
}

/** Eingefrorener Batchbericht (ADR-011) – sein Hash wird signiert. */
export interface BatchReport {
  format: 'iot-batch-report/1';
  batchId: string;
  line: { id: string; name: string; timeZone: string };
  recipe: { id: string; version: number };
  formatParts: string[];
  startedAt: string;
  endedAt: string;
  lineRelease: (AuditRef & { afterStart: boolean }) | null;
  clearance: AuditRef;
  machines: ReportMachine[];
  generatedAt: string;
}

export interface BatchDetail extends BatchSummary {
  counts: MachineCounts[];
  report: BatchReport | null;
  /** Einträge der Plattform zu diesem Batch (E-42) */
  audit: {
    seq: number;
    ts: string;
    userName: string;
    action: string;
    meaning: string | null;
    oldValue: string | null;
    newValue: string | null;
    reason: string | null;
  }[];
}

/** Linienfreigabe für den nächsten Batch (E-40). */
export interface PendingLineRelease {
  release: AuditRef | null;
}
