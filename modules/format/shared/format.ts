/** Formatwechsel: Ablauf (schemas/format-procedure.schema.json, ADR-013) und Durchführung (M7). */
export type Text = { de: string } & Record<string, string>;

export interface RecipeRef {
  id: string;
  version: number;
}

export interface FormatRef {
  format: Text;
  recipe: RecipeRef;
}

export type StepCheck = 'line-stopped';

export interface ProcedureStep {
  id: string;
  title: Text;
  /** machineId; `null` = ganze Linie */
  machine: string | null;
  text: Text;
  check?: StepCheck;
  /** Formatteil: Code am Teil (Teilenummer) und am Einbauplatz (E-17) */
  part?: { id: string; slot: string };
  media?: string;
}

export interface Procedure {
  id: string;
  version: number;
  title: Text;
  from: FormatRef;
  to: FormatRef;
  plannedMinutes: number;
  steps: ProcedureStep[];
}

export interface ProcedureSummary {
  id: string;
  version: number;
  title: Text;
  from: FormatRef;
  to: FormatRef;
  plannedMinutes: number;
  stepCount: number;
}

export type ScanSource = 'scanner' | 'manual';

export interface StepScans {
  part: string;
  slot: string;
  source: ScanSource;
}

export interface AuditRef {
  seq: number;
  ts: string;
  username: string;
  userName: string;
  meaning: string | null;
}

export interface StepRecord {
  stepId: string;
  confirmed: AuditRef;
  scans: StepScans | null;
}

export type ChangeStatus = 'running' | 'performed' | 'released' | 'cancelled';

/** Prüfung des Rezepts beim ersten Batchstart nach der Freigabe */
export interface RecipeCheck {
  batchId: string;
  at: string;
  machines: { machineId: string; recipe: RecipeRef }[];
  ok: boolean;
}

export interface Change {
  /** z. B. FW-2026-0001 */
  id: string;
  procedure: Procedure;
  status: ChangeStatus;
  startedAt: string;
  startedBy: { username: string; userName: string };
  steps: StepRecord[];
  /** Hash des Protokolls, an den die Signaturen gebunden sind (wie ADR-011) */
  recordHash: string | null;
  performed: AuditRef | null;
  released: AuditRef | null;
  cancelled: AuditRef | null;
  recipeCheck: RecipeCheck | null;
}

export interface LineCheck {
  /** alle Maschinen der Linie melden Stopped */
  stopped: boolean;
  /** Namen der Maschinen, die noch nicht stehen */
  notStopped: string[];
}

export interface FormatState {
  /** Format der Linie: nach Freigabe das Zielformat, sonst aus dem Rezept des letzten Batches */
  current: FormatRef | null;
  /** Abläufe, die vom aktuellen Format ausgehen */
  targets: ProcedureSummary[];
  /** laufender oder durchgeführter, noch nicht freigegebener Wechsel */
  change: Change | null;
  /** zuletzt freigegebener Wechsel */
  last: Change | null;
  line: LineCheck;
  procedures: ProcedureSummary[];
}

export const reference = (changeId: string) => `format:${changeId}`;
export const procedureReference = (procedureId: string) => `format:procedure:${procedureId}`;

/** Vorgänge im Audit Trail; Bedeutungen der Signaturen sind Teil des GxP-Datensatzes (E-50) */
export const ACTIONS = {
  started: { action: 'format.change-started', meaning: null, permission: 'format.execute' },
  step: { action: 'format.step-confirmed', meaning: null, permission: 'format.execute' },
  revert: { action: 'format.step-reverted', meaning: null, permission: 'format.execute' },
  cancel: { action: 'format.change-cancelled', meaning: null, permission: 'format.execute' },
  perform: {
    action: 'format.change-performed',
    meaning: 'Durchgeführt',
    permission: 'format.sign',
  },
  release: { action: 'format.change-released', meaning: 'Freigabe', permission: 'format.release' },
  imported: {
    action: 'format.procedure-imported',
    meaning: null,
    permission: 'format.configure',
  },
} as const;

export type ActionStep = (typeof ACTIONS)[keyof typeof ACTIONS];

/** Neuer Wert im Audit Trail für einen bestätigten Schritt – mit gescannten Codes und Quelle. */
export function stepAuditValue(step: ProcedureStep, scans: StepScans | null): string {
  if (!scans) return step.id;
  return `${step.id}: ${scans.part} @ ${scans.slot} (${scans.source})`;
}

/** Passen die gescannten Codes zum Formatteil des Schritts? */
export const scanMatches = (step: ProcedureStep, scans: StepScans | null): boolean =>
  step.part === undefined || (scans?.part === step.part.id && scans.slot === step.part.slot);

export const summarize = (p: Procedure): ProcedureSummary => ({
  id: p.id,
  version: p.version,
  title: p.title,
  from: p.from,
  to: p.to,
  plannedMinutes: p.plannedMinutes,
  stepCount: p.steps.length,
});

/** Prüft einen Ablauf über das Schema hinaus: eindeutige Schritte und Einbauplätze, echtes Zielformat. */
export function checkProcedure(p: Procedure, machineIds?: readonly string[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const slots = new Set<string>();
  for (const step of p.steps) {
    if (ids.has(step.id)) errors.push(`Schritt ${step.id} doppelt`);
    ids.add(step.id);
    if (step.part) {
      if (slots.has(step.part.slot)) errors.push(`Einbauplatz ${step.part.slot} doppelt`);
      slots.add(step.part.slot);
    }
    if (machineIds && step.machine !== null && !machineIds.includes(step.machine))
      errors.push(`Schritt ${step.id}: Maschine ${step.machine} gehört nicht zur Linie`);
  }
  if (p.from.recipe.id === p.to.recipe.id && p.from.recipe.version === p.to.recipe.version)
    errors.push('Ausgangs- und Zielrezept sind gleich');
  return errors;
}

/** Fortschritt in Prozent */
export const progress = (change: Change) =>
  Math.round((change.steps.length / change.procedure.steps.length) * 100);
