import { flexfillLine } from '../fixtures/flexfill';
import type { FixtureLine, FixtureMachine } from '../fixtures/mockup';

/**
 * Linie des Simulators: Linie 3 · Flexfill (E-47). Die Linien des Mockups bleiben Gestaltungsvorlage für
 * Storybook (fixtures/mockup.ts) und werden nicht mehr simuliert.
 */
const fixtureLines: readonly FixtureLine[] = [flexfillLine];
import { parseGermanNumber } from './parse';

/**
 * Abbildung der Mockup-Daten auf die Schnittstelle. Alles, was das Mockup nicht enthält, ist hier als
 * Annahme gekennzeichnet und in docs/anleitungen/simulator.md aufgeführt.
 */

export type Conformance = 'basic' | 'standard' | 'full';

/** Annahme: Standort der Beispiellinien (Anzeige- und Ortszeit, E-19). */
export const SITE_TIME_ZONE = 'Europe/Berlin';
/** Annahme: Beginn der Schicht laut Mockup „Schicht seit 06:00“ – Rücksetzzeitpunkt der Zähler. */
export const SHIFT_START = '06:00';
/**
 * Annahme (O-24): Maschinen, die im Mockup stehen, wechseln zwischen ihrem Zustand aus dem Mockup und
 * Execute – 1 min Stillstand, 9 min Lauf (≈ 90 % Verfügbarkeit, angelehnt an 91,2 % im Mockup).
 */
export const STOP_PHASE_MS = 60_000;
export const RUN_PHASE_MS = 9 * 60_000;
/**
 * Annahme (M6): Batch-Zyklus für die Entwicklung – ein Batch läuft 15 min, nach 2 min Pause beginnt der
 * nächste mit fortlaufender Nummer (B-2026-1042 → B-2026-1043); die Zähler der eigenen Maschinen beginnen
 * dann bei null (resetAt = Batchstart).
 */
export const BATCH_RUN_MS = 15 * 60_000;
export const BATCH_PAUSE_MS = 2 * 60_000;
/** Produktname laut Mockup (Platzhalter, S-10) */
export const PRODUCT_NAME = '[Produktname]';

const LEVEL: Record<string, Conformance> = {
  Basis: 'basic',
  Standard: 'standard',
  'Voll (GxP)': 'full',
};

export interface ValueConfig {
  key: string;
  /** Beschriftung im Mockup – daraus kommen Name und Wert */
  label: string;
  unit: string;
  gxp: boolean;
  min?: number;
  max?: number;
}

export interface AlarmConfig {
  /** ID des Alarms in den Fixtures */
  fixtureId: string;
  /** Stabile alarmId; Basis-Maschinen melden nur COMMON-FAULT (S-04) */
  alarmId: string;
  textKey?: string;
  subsystem?: string;
}

interface MachineExtras {
  values: ValueConfig[];
  /** Ausschussquote, falls im Mockup angegeben – Grundlage für den Schlechtzähler */
  rejectLabel?: string;
}

// Schlüssel und Einheiten aus den Beschriftungen des Mockups abgeleitet (Frage 3 zu M2, 2026-10-22).
// GxP-Kennzeichnung: nur das Füllgewicht ist in der Spezifikation als GxP markiert (offen: O-16).
const EXTRAS: Record<string, MachineExtras> = {
  // Linie 3 · Flexfill – Schlüssel, Einheiten und Grenzen sind Annahmen (O-28)
  'l3-iso': { values: [] },
  'l3-debag': { values: [{ key: 'tubBuffer', label: 'Tubs im Puffer', unit: '', gxp: false }] },
  'l3-delid': {
    values: [
      {
        key: 'peelForceAvg',
        label: 'Abzugskraft Folie Ø',
        unit: 'N',
        gxp: false,
        min: 10,
        max: 30,
      },
    ],
  },
  'l3-fill': {
    values: [
      { key: 'fillWeightAvg', label: 'Füllgewicht Ø', unit: 'g', gxp: true, min: 1.95, max: 2.05 },
      { key: 'fillWeightStdDev', label: 'Standardabw.', unit: 'g', gxp: true },
      {
        key: 'isolatorDiffPressure',
        label: 'Differenzdruck Isolator',
        unit: 'Pa',
        gxp: false,
        min: 10,
        max: 30,
      },
    ],
  },
  'l3-transfer': {
    values: [{ key: 'robotCycleTime', label: 'Robotertakt', unit: 's', gxp: false }],
  },
  'l3-cap': {
    values: [
      { key: 'crimpForceAvg', label: 'Bördelkraft Ø', unit: 'N', gxp: false, min: 1300, max: 1600 },
    ],
  },
};

// Stabile alarmIds und Textschlüssel: hier festgelegt (Annahmen, O-28); FILL-WGT-0003 stammt aus der
// Spezifikation, FILL-… passen zu den Fehlerbäumen.
const ALARMS: AlarmConfig[] = [
  {
    fixtureId: 'c1',
    alarmId: 'FILL-WGT-0003',
    textKey: 'alarm.weighcell.tare',
    subsystem: 'Wägung',
  },
  {
    fixtureId: 'c2',
    alarmId: 'FILL-STP-0001',
    textKey: 'alarm.stopperSetter.blocked',
    subsystem: 'Stopfensetzen',
  },
  {
    fixtureId: 'c3',
    alarmId: 'TRF-ROB-0001',
    textKey: 'alarm.transfer.robotGripper',
    subsystem: 'Roboter',
  },
  { fixtureId: 'c4', alarmId: 'COMMON-FAULT' },
  {
    fixtureId: 'c5',
    alarmId: 'CAP-INF-0001',
    textKey: 'alarm.capping.infeedEmpty',
    subsystem: 'Einlauf',
  },
];

/** Batch-Rezept der Flexfill – Annahme (O-28). */
const RECIPES: Record<string, { id: string; version: number; formatParts: string[] }> = {
  l3: { id: 'vial-nest', version: 1, formatParts: [] },
};

export interface SimAlarm {
  alarmId: string;
  class: 'fault' | 'warning' | 'info';
  text: string;
  textKey?: string;
  subsystem?: string;
  time: string;
  active: boolean;
}

export interface SimMachine {
  id: string;
  lineId: string;
  name: string;
  position: number;
  own: boolean;
  conformance: Conformance;
  nominalRate: number;
  state: FixtureMachine['state'];
  /** Uhrzeit, seit der der Zustand gilt (falls im Mockup angegeben) */
  stateSince?: string;
  reason: string | null;
  /** aktuelle Leistung in Stück pro Minute */
  rate: number;
  /** Anbindung laut Mockup, z. B. „OPC UA · PackML-Tags“ (identity.source, S-07) */
  source: string;
  /**
   * Wechsel zwischen dem Zustand aus dem Mockup und Execute (nur Maschinen, die im Mockup stehen).
   * `runRate`: Leistung im Lauf – die Linienleistung aus der KPI „Leistung“ (z. B. 286 von 320 /min).
   */
  cycle?: { runRate: number };
  counters: { good: number; bad: number; resetAt: string };
  /** Anteil Schlechtteile an der Gesamtmenge */
  rejectShare: number;
  values: (ValueConfig & { value: number })[];
  alarms: SimAlarm[];
  batch?: {
    id: string;
    start: string;
    recipe: { id: string; version: number };
    formatParts: string[];
    /** S-10; im Mockup nur der Platzhalter „[Produktname]“ */
    productName: string;
    /** S-10; Annahme: aus Menge und Fortschritt des Mockups abgeleitet */
    targetQuantity: number;
  };
}

export interface SimLine {
  id: string;
  name: string;
  machines: SimMachine[];
}

function fixtureValue(machine: FixtureMachine, label: string): string | undefined {
  return machine.values.find((v) => v.label === label)?.value;
}

/** Ist- und Sollleistung der Linie aus der KPI „Leistung“, z. B. „286 von 320 /min“. */
function lineRates(line: FixtureLine): { actual: number; nominal: number } {
  const sub = line.kpis.find((k) => k.label === 'Leistung')?.sub ?? '';
  const match = /([\d.]+) von ([\d.]+)/.exec(sub);
  if (!match?.[1] || !match[2]) throw new Error(`Leistung für ${line.id} nicht im Mockup gefunden`);
  return { actual: parseGermanNumber(match[1]), nominal: parseGermanNumber(match[2]) };
}

function buildMachine(line: FixtureLine, machine: FixtureMachine, index: number): SimMachine {
  const extras = EXTRAS[machine.id];
  if (!extras) throw new Error(`Keine Simulator-Konfiguration für ${machine.id}`);
  const conformance = LEVEL[machine.level];
  if (!conformance) throw new Error(`Unbekannte Stufe „${machine.level}“`);
  const own = machine.kind === 'own';
  const recipe = RECIPES[line.id];

  // Zähler: eigene Füllmaschine aus den Batchdaten, sonst „Zähler gut“
  const goodText = own ? line.batch.good : fixtureValue(machine, 'Zähler gut');
  if (goodText === undefined) throw new Error(`Kein Gutzähler für ${machine.id}`);
  const good = parseGermanNumber(goodText);
  const rejectText = extras.rejectLabel ? fixtureValue(machine, extras.rejectLabel) : undefined;
  const rejectShare = own
    ? parseGermanNumber(line.batch.bad) / (parseGermanNumber(line.batch.bad) + good)
    : rejectText
      ? parseGermanNumber(rejectText) / 100
      : 0; // Annahme: kein Ausschuss angegeben → 0
  const bad = own
    ? parseGermanNumber(line.batch.bad)
    : Math.round((good * rejectShare) / (1 - rejectShare));

  const lineAlarms = line.alarms.filter((a) => a.machine === machine.name);
  const alarms = lineAlarms.map((a): SimAlarm => {
    const config = ALARMS.find((c) => c.fixtureId === a.id);
    if (!config) throw new Error(`Keine alarmId für Alarm ${a.id}`);
    return {
      alarmId: config.alarmId,
      class: a.severity,
      text: a.text,
      ...(config.textKey ? { textKey: config.textKey } : {}),
      ...(config.subsystem ? { subsystem: config.subsystem } : {}),
      time: a.time,
      active: a.active,
    };
  });

  const stateSince = fixtureValue(machine, 'Stillstand seit');
  return {
    id: machine.id,
    lineId: line.id,
    name: machine.name,
    position: index + 1,
    own,
    conformance,
    // Annahme: Sollleistung je Maschine = Sollleistung der Linie (im Mockup nur für die Linie angegeben)
    nominalRate: lineRates(line).nominal,
    state: machine.state,
    ...(stateSince ? { stateSince } : {}),
    reason: fixtureValue(machine, 'Grund') ?? null,
    rate: parseGermanNumber(machine.rate),
    source: machine.source,
    ...(machine.state === 'Execute' ? {} : { cycle: { runRate: lineRates(line).actual } }),
    counters: { good, bad, resetAt: own ? line.batch.start : SHIFT_START },
    rejectShare,
    values: extras.values.map((v) => {
      const text = fixtureValue(machine, v.label);
      if (text === undefined) throw new Error(`Wert „${v.label}“ fehlt für ${machine.id}`);
      return { ...v, value: parseGermanNumber(text) };
    }),
    alarms,
    ...(conformance === 'full' && recipe
      ? {
          batch: {
            id: line.batch.id,
            start: line.batch.start,
            recipe: { id: recipe.id, version: recipe.version },
            formatParts: recipe.formatParts,
            productName: PRODUCT_NAME,
            // Annahme: Sollmenge = (gut + schlecht) ÷ Fortschritt aus dem Mockup, auf 100 gerundet
            targetQuantity:
              Math.round(
                (parseGermanNumber(line.batch.good) + parseGermanNumber(line.batch.bad)) /
                  (line.batch.progress / 100) /
                  100,
              ) * 100,
          },
        }
      : {}),
  };
}

export function buildLines(lines: readonly FixtureLine[] = fixtureLines): SimLine[] {
  return lines.map((line) => ({
    id: line.id,
    name: line.name,
    machines: line.machines.map((m, i) => buildMachine(line, m, i)),
  }));
}
