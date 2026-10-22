import type { FixtureLine } from './mockup';

/**
 * Linie 3 · Flexfill – nicht im UI-Mockup. Aufbau nach Beschreibung des Projektverantwortlichen
 * (2026-10-22): Beutelauspacker → Öffner (Delid/Delining) → Füll- und Verschließmaschine → Transfermodul
 * (Gut-/Schlechtauslauf, Roboter) → Bördelmodul; alle eigene Maschinen, Stufe Voll. Dazu der Isolator als
 * Fremdmaschine der Stufe Basis (2026-10-22), damit Fremdmaschinen und Sammelstörung im Test vorkommen.
 *
 * ANNAHMEN (bestätigt, E-48): Sollleistung, Ist-Werte, Prozesswerte, Uhrzeiten der Alarme, Batch,
 * Format. Die Alarme der Füllmaschine stammen aus den Fehlerbäumen des Mockups.
 */
export const flexfillLine: FixtureLine = {
  id: 'l3',
  name: 'Linie 3 · Flexfill',
  state: 'Execute',
  format: 'Vial im Nest',
  targets: [],
  kpis: [{ label: 'Leistung', value: '92,0', unit: '%', sub: '92 von 100 /min' }],
  machines: [
    {
      // Fremdmaschine, Stufe Basis: nur Zustand, Zähler (Durchsatz) und Sammelstörung – Annahmen (O-28)
      id: 'l3-iso',
      name: 'Isolator',
      kind: 'foreign',
      level: 'Basis',
      state: 'Execute',
      rate: '92',
      oee: '—',
      source: 'Fremdsteuerung · Basissignale über S7-Connector',
      values: [{ label: 'Zähler gut', value: '18.700' }],
    },
    {
      id: 'l3-debag',
      name: 'Beutelauspacker',
      kind: 'own',
      level: 'Voll (GxP)',
      state: 'Execute',
      rate: '92',
      oee: '—',
      source: 'S7-1500 · IIoT-Datenbaustein (OPC UA)',
      values: [{ label: 'Tubs im Puffer', value: '4' }],
    },
    {
      id: 'l3-delid',
      name: 'Öffner (Delid/Delining)',
      kind: 'own',
      level: 'Voll (GxP)',
      state: 'Execute',
      rate: '92',
      oee: '—',
      source: 'S7-1500 · IIoT-Datenbaustein (OPC UA)',
      values: [{ label: 'Abzugskraft Folie Ø', value: '18,5 N' }],
    },
    {
      id: 'l3-fill',
      name: 'Füll- und Verschließmaschine',
      kind: 'own',
      level: 'Voll (GxP)',
      state: 'Execute',
      rate: '92',
      oee: '—',
      bottleneck: true,
      source: 'S7-1500 · IIoT-Datenbaustein (OPC UA)',
      values: [
        { label: 'Füllgewicht Ø', value: '2,01 g' },
        { label: 'Standardabw.', value: '0,012 g' },
        { label: 'Differenzdruck Isolator', value: '15 Pa' },
      ],
    },
    {
      id: 'l3-transfer',
      name: 'Transfermodul',
      kind: 'own',
      level: 'Voll (GxP)',
      state: 'Execute',
      rate: '92',
      oee: '—',
      source: 'S7-1500 · IIoT-Datenbaustein (OPC UA)',
      values: [{ label: 'Robotertakt', value: '6,8 s' }],
    },
    {
      id: 'l3-cap',
      name: 'Bördelmodul',
      kind: 'own',
      level: 'Voll (GxP)',
      state: 'Suspended',
      rate: '0',
      oee: '—',
      source: 'S7-1500 · IIoT-Datenbaustein (OPC UA)',
      values: [
        { label: 'Grund', value: 'Einlauf leer' },
        { label: 'Bördelkraft Ø', value: '1.450 N' },
      ],
    },
  ],
  alarms: [
    {
      id: 'c1',
      time: '13:52',
      machine: 'Füll- und Verschließmaschine',
      text: 'Wägezelle 3: Tara-Abweichung',
      severity: 'fault',
      active: true,
      tree: 'waage',
    },
    {
      id: 'c2',
      time: '13:30',
      machine: 'Füll- und Verschließmaschine',
      text: 'Stopfensetzer: Blockade erkannt',
      severity: 'fault',
      active: false,
      tree: 'stopfen',
    },
    {
      id: 'c3',
      time: '14:01',
      machine: 'Transfermodul',
      text: 'Roboter: Greiferposition nicht erreicht',
      severity: 'warning',
      active: true,
    },
    {
      id: 'c5',
      time: '14:10',
      machine: 'Bördelmodul',
      text: 'Einlauf: keine Vials',
      severity: 'warning',
      active: true,
    },
    {
      id: 'c4',
      time: '12:40',
      machine: 'Isolator',
      text: 'Sammelstörung',
      severity: 'fault',
      active: false,
    },
  ],
  faults: [],
  batch: {
    id: 'B-2026-3001',
    recipe: 'Vial im Nest · v1',
    good: '18.400',
    bad: '310',
    start: '06:05',
    progress: 40,
  },
};
