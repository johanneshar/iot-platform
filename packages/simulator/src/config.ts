import { lines as fixtureLines, type FixtureLine, type FixtureMachine } from '../fixtures/mockup';
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
  'l1-wash': {
    values: [
      { key: 'waterTemperature', label: 'Wassertemperatur', unit: '°C', gxp: false },
      { key: 'wfiConductivity', label: 'Leitfähigkeit WFI', unit: 'µS/cm', gxp: false },
      { key: 'compressedAir', label: 'Druckluft', unit: 'bar', gxp: false },
    ],
  },
  'l1-tunnel': { values: [] },
  'l1-fill': {
    values: [
      { key: 'fillWeightAvg', label: 'Füllgewicht Ø', unit: 'g', gxp: true, min: 9.9, max: 10.1 },
      { key: 'fillWeightStdDev', label: 'Standardabw.', unit: 'g', gxp: true },
      { key: 'isolatorDiffPressure', label: 'Differenzdruck Isolator', unit: 'Pa', gxp: false },
      { key: 'closingTorqueAvg', label: 'Verschlussmoment Ø', unit: 'Nm', gxp: false },
    ],
  },
  'l1-insp': {
    values: [
      { key: 'rejectRate', label: 'Ausschussquote', unit: '%', gxp: false },
      { key: 'camerasActive', label: 'Kameras aktiv', unit: '', gxp: false },
    ],
    rejectLabel: 'Ausschussquote',
  },
  'l2-detub': { values: [] },
  'l2-fill': {
    values: [
      { key: 'fillVolumeAvg', label: 'Füllvolumen Ø', unit: 'ml', gxp: true },
      { key: 'isolatorDiffPressure', label: 'Differenzdruck Isolator', unit: 'Pa', gxp: false },
    ],
  },
  'l2-label': {
    values: [
      { key: 'labelRollLevel', label: 'Etikettenrolle', unit: '%', gxp: false },
      { key: 'codeReadRate', label: 'Lesequote Code', unit: '%', gxp: false },
      { key: 'rejectRate', label: 'Ausschuss', unit: '%', gxp: false },
    ],
    rejectLabel: 'Ausschuss',
  },
};

// Stabile alarmIds und Textschlüssel: im Mockup nicht enthalten, hier festgelegt.
// FILL-WGT-0003 stammt aus der Spezifikation.
const ALARMS: AlarmConfig[] = [
  {
    fixtureId: 'a1',
    alarmId: 'INSP-OUT-0001',
    textKey: 'alarm.inspection.outfeedJam',
    subsystem: 'Auslauf',
  },
  {
    fixtureId: 'a2',
    alarmId: 'FILL-CAP-0001',
    textKey: 'alarm.capFeed.levelLow',
    subsystem: 'Verschließen',
  },
  {
    fixtureId: 'a3',
    alarmId: 'FILL-WGT-0003',
    textKey: 'alarm.weighcell.tare',
    subsystem: 'Wägung',
  },
  {
    fixtureId: 'a4',
    alarmId: 'WASH-NOZ-0002',
    textKey: 'alarm.washer.nozzlePressureLow',
    subsystem: 'Düsen',
  },
  { fixtureId: 'a5', alarmId: 'COMMON-FAULT' },
  {
    fixtureId: 'a6',
    alarmId: 'FILL-RCP-0001',
    textKey: 'alarm.recipe.loaded',
    subsystem: 'Rezept',
  },
  {
    fixtureId: 'b1',
    alarmId: 'FILL-STP-0001',
    textKey: 'alarm.stopperSetter.blocked',
    subsystem: 'Stopfensetzen',
  },
  {
    fixtureId: 'b2',
    alarmId: 'LBL-ROL-0001',
    textKey: 'alarm.labeler.rollLow',
    subsystem: 'Etiketten',
  },
  { fixtureId: 'b3', alarmId: 'COMMON-FAULT' },
];

/** Batch-Rezepte: l1 aus der Spezifikation; l2 aus dem Mockup-Text „Spritze 1 ml · v5“ abgeleitet. */
const RECIPES: Record<string, { id: string; version: number; formatParts: string[] }> = {
  l1: { id: 'vial-10ml', version: 3, formatParts: ['FT-2041', 'FT-3110'] },
  l2: { id: 'syringe-1ml', version: 5, formatParts: [] },
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

/** Sollleistung der Linie aus der KPI „Leistung“, z. B. „286 von 320 /min“ → 320. */
function lineNominalRate(line: FixtureLine): number {
  const sub = line.kpis.find((k) => k.label === 'Leistung')?.sub ?? '';
  const match = /von ([\d.]+)/.exec(sub);
  if (!match?.[1]) throw new Error(`Sollleistung für ${line.id} nicht im Mockup gefunden`);
  return parseGermanNumber(match[1]);
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
    nominalRate: lineNominalRate(line),
    state: machine.state,
    ...(stateSince ? { stateSince } : {}),
    reason: fixtureValue(machine, 'Grund') ?? null,
    rate: parseGermanNumber(machine.rate),
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
