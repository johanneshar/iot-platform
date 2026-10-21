/**
 * Beispieldaten aus dem UI-Mockup „IoT-Plattform Mockup“ (Claude Design), unverändert
 * übernommen. Maschinen-IDs nach docs/offene-punkte.md, S-01; Modul-IDs nach CLAUDE.md.
 * Grundlage für Storybook, Tests und ab M2 für den Simulator.
 */

export type FixtureSeverity = 'fault' | 'warning' | 'info';
export type FixtureState = 'Execute' | 'Suspended' | 'Held' | 'Idle' | 'Stopped';

export interface FixtureKpi {
  label: string;
  value: string;
  unit: string;
  sub: string;
  main?: boolean;
}

export interface FixtureMachine {
  id: string;
  name: string;
  kind: 'own' | 'foreign';
  level: string;
  state: FixtureState;
  rate: string;
  oee: string;
  bottleneck?: boolean;
  source: string;
  values: { label: string; value: string }[];
}

export interface FixtureAlarm {
  id: string;
  time: string;
  machine: string;
  text: string;
  severity: FixtureSeverity;
  active: boolean;
  tree?: string;
}

export interface FixtureLine {
  id: string;
  name: string;
  state: FixtureState;
  format: string;
  targets: { name: string; time: string }[];
  kpis: FixtureKpi[];
  machines: FixtureMachine[];
  alarms: FixtureAlarm[];
  faults: { label: string; minutes: number }[];
  batch: { id: string; recipe: string; good: string; bad: string; start: string; progress: number };
}

export const lines: FixtureLine[] = [
  {
    id: 'l1',
    name: 'Linie 1 · Vials',
    state: 'Execute',
    format: 'Vial 10 ml',
    targets: [
      { name: 'Vial 20 ml', time: '45 min' },
      { name: 'Vial 6 ml', time: '50 min' },
    ],
    kpis: [
      { label: 'Linien-OEE', value: '78,4', unit: '%', sub: 'Ziel 82 %', main: true },
      { label: 'Verfügbarkeit', value: '91,2', unit: '%', sub: 'Schicht seit 06:00' },
      { label: 'Leistung', value: '89,5', unit: '%', sub: '286 von 320 /min' },
      { label: 'Qualität', value: '96,0', unit: '%', sub: 'Ausschuss 4,0 %' },
      { label: 'Ausbringung', value: '17.160', unit: 'Stk/h', sub: 'Gutteile' },
    ],
    machines: [
      {
        id: 'l1-wash',
        name: 'Waschmaschine',
        kind: 'foreign',
        level: 'Standard',
        state: 'Execute',
        rate: '312',
        oee: '86,3',
        source: 'OPC UA · Mapping im Common Configurator',
        values: [
          { label: 'Wassertemperatur', value: '82,1 °C' },
          { label: 'Leitfähigkeit WFI', value: '0,8 µS/cm' },
          { label: 'Druckluft', value: '6,1 bar' },
          { label: 'Zähler gut', value: '58.410' },
        ],
      },
      {
        id: 'l1-tunnel',
        name: 'Sterilisationstunnel',
        kind: 'foreign',
        level: 'Basis',
        state: 'Execute',
        rate: '310',
        oee: '88,9',
        source: 'S7-Connector · Basissignale',
        values: [
          { label: 'Betriebszustand', value: 'Execute' },
          { label: 'Zähler gut', value: '58.020' },
          { label: 'Sammelstörung', value: 'Nein' },
          { label: 'Integration', value: 'Basis' },
        ],
      },
      {
        id: 'l1-fill',
        name: 'Füll- und Verschließmaschine',
        kind: 'own',
        level: 'Voll (GxP)',
        state: 'Execute',
        rate: '286',
        oee: '79,1',
        bottleneck: true,
        source: 'S7-1500 · IIoT-Datenbaustein (OPC UA)',
        values: [
          { label: 'Füllgewicht Ø', value: '10,02 g' },
          { label: 'Standardabw.', value: '0,031 g' },
          { label: 'Differenzdruck Isolator', value: '18 Pa' },
          { label: 'Verschlussmoment Ø', value: '1,42 Nm' },
        ],
      },
      {
        id: 'l1-insp',
        name: 'Inspektionsmaschine',
        kind: 'foreign',
        level: 'Standard',
        state: 'Suspended',
        rate: '0',
        oee: '81,7',
        source: 'OPC UA · PackML-Tags',
        values: [
          { label: 'Grund', value: 'Auslauf gestaut' },
          { label: 'Ausschussquote', value: '3,8 %' },
          { label: 'Kameras aktiv', value: '6 / 6' },
          { label: 'Zähler gut', value: '55.130' },
        ],
      },
    ],
    alarms: [
      {
        id: 'a1',
        time: '14:12',
        machine: 'Inspektionsmaschine',
        text: 'Auslauf gestaut – Pufferband voll',
        severity: 'warning',
        active: true,
      },
      {
        id: 'a2',
        time: '14:05',
        machine: 'Füll- und Verschließmaschine',
        text: 'Verschlusszuführung: Füllstand niedrig',
        severity: 'warning',
        active: true,
        tree: 'verschluss',
      },
      {
        id: 'a3',
        time: '13:48',
        machine: 'Füll- und Verschließmaschine',
        text: 'Wägezelle 3: Tara-Abweichung',
        severity: 'fault',
        active: true,
        tree: 'waage',
      },
      {
        id: 'a4',
        time: '13:20',
        machine: 'Waschmaschine',
        text: 'Düsendruck Station 2 unter Grenzwert',
        severity: 'fault',
        active: false,
      },
      {
        id: 'a5',
        time: '12:57',
        machine: 'Sterilisationstunnel',
        text: 'Sammelstörung',
        severity: 'fault',
        active: false,
      },
      {
        id: 'a6',
        time: '12:30',
        machine: 'Füll- und Verschließmaschine',
        text: 'Rezept „Vial 10 ml“ v3 geladen',
        severity: 'info',
        active: false,
      },
    ],
    faults: [
      { label: 'Verschlusszuführung leer', minutes: 74 },
      { label: 'Wägezelle Tara-Abweichung', minutes: 52 },
      { label: 'Auslauf gestaut', minutes: 41 },
      { label: 'Glasbruch Einlauf', minutes: 23 },
      { label: 'Düsendruck Waschmaschine', minutes: 12 },
    ],
    batch: {
      id: 'B-2026-1042',
      recipe: 'Vial 10 ml · v3',
      good: '61.880',
      bad: '2.580',
      start: '06:14',
      progress: 62,
    },
  },
  {
    id: 'l2',
    name: 'Linie 2 · Spritzen',
    state: 'Held',
    format: 'Spritze 1 ml',
    targets: [{ name: 'Spritze 2,25 ml', time: '55 min' }],
    kpis: [
      { label: 'Linien-OEE', value: '64,7', unit: '%', sub: 'Ziel 80 %', main: true },
      { label: 'Verfügbarkeit', value: '76,8', unit: '%', sub: 'Schicht seit 06:00' },
      { label: 'Leistung', value: '87,0', unit: '%', sub: '348 von 400 /min' },
      { label: 'Qualität', value: '96,8', unit: '%', sub: 'Ausschuss 3,2 %' },
      { label: 'Ausbringung', value: '20.210', unit: 'Stk/h', sub: 'Gutteile' },
    ],
    machines: [
      {
        id: 'l2-detub',
        name: 'Tub-Entdeckler',
        kind: 'foreign',
        level: 'Basis',
        state: 'Idle',
        rate: '0',
        oee: '74,2',
        source: 'S7-Connector · Basissignale',
        values: [
          { label: 'Betriebszustand', value: 'Idle' },
          { label: 'Zähler gut', value: '412 Tubs' },
          { label: 'Sammelstörung', value: 'Nein' },
          { label: 'Integration', value: 'Basis' },
        ],
      },
      {
        id: 'l2-fill',
        name: 'Füll- und Verschließmaschine',
        kind: 'own',
        level: 'Voll (GxP)',
        state: 'Held',
        rate: '0',
        oee: '63,5',
        bottleneck: true,
        source: 'S7-1500 · IIoT-Datenbaustein (OPC UA)',
        values: [
          { label: 'Grund', value: 'Stopfensetzer blockiert' },
          { label: 'Füllvolumen Ø', value: '1,002 ml' },
          { label: 'Differenzdruck Isolator', value: '20 Pa' },
          { label: 'Stillstand seit', value: '13:51' },
        ],
      },
      {
        id: 'l2-label',
        name: 'Etikettierer',
        kind: 'foreign',
        level: 'Standard',
        state: 'Idle',
        rate: '0',
        oee: '82,0',
        source: 'OPC UA · PackML-Tags',
        values: [
          { label: 'Etikettenrolle', value: '64 %' },
          { label: 'Lesequote Code', value: '99,7 %' },
          { label: 'Ausschuss', value: '0,4 %' },
          { label: 'Zähler gut', value: '40.150' },
        ],
      },
    ],
    alarms: [
      {
        id: 'b1',
        time: '13:51',
        machine: 'Füll- und Verschließmaschine',
        text: 'Stopfensetzer: Blockade erkannt',
        severity: 'fault',
        active: true,
        tree: 'stopfen',
      },
      {
        id: 'b2',
        time: '13:40',
        machine: 'Etikettierer',
        text: 'Etikettenrolle bald leer',
        severity: 'warning',
        active: false,
      },
      {
        id: 'b3',
        time: '12:02',
        machine: 'Tub-Entdeckler',
        text: 'Sammelstörung',
        severity: 'fault',
        active: false,
      },
    ],
    faults: [
      { label: 'Stopfensetzer Blockade', minutes: 96 },
      { label: 'Tub-Zuführung leer', minutes: 38 },
      { label: 'Etikettenwechsel', minutes: 21 },
      { label: 'Isolator Handschuhtest', minutes: 15 },
    ],
    batch: {
      id: 'B-2026-0987',
      recipe: 'Spritze 1 ml · v5',
      good: '84.300',
      bad: '2.790',
      start: '05:58',
      progress: 47,
    },
  },
];

export const batchSteps = [
  'Rüsten',
  'Linienfreigabe',
  'Produktion',
  'Linienräumung',
  'Bericht & Freigabe',
] as const;

export const auditEntries = [
  {
    time: '14:20',
    user: '[Schichtleitung]',
    action: 'Sollfüllgewicht geändert',
    change: '10,00 g → 10,02 g · Grund: Dichtekorrektur',
  },
  { time: '14:02', user: '[Bediener]', action: 'Rezept geladen', change: '— → Vial 10 ml · v3' },
  { time: '13:58', user: '[QA]', action: 'Linienfreigabe erteilt (e-Signatur)', change: '—' },
  { time: '13:41', user: 'System', action: 'Batch angelegt', change: '— → B-2026-1042' },
  {
    time: '13:12',
    user: 'System',
    action: 'Zeitsynchronisation geprüft',
    change: 'Abweichung < 1 ms',
  },
];

export const components = [
  {
    name: 'Dosierpumpe Station 1',
    machine: 'Füll- und Verschließmaschine',
    health: 86,
    hint: 'Nächster Tausch in ca. 1.900 Betriebsstunden',
    part: 'ET-10240',
  },
  {
    name: 'Dosierpumpe Station 3',
    machine: 'Füll- und Verschließmaschine',
    health: 41,
    hint: 'Tausch beim nächsten Formatwechsel empfohlen',
    part: 'ET-10233',
  },
  {
    name: 'Servo Hauptachse',
    machine: 'Füll- und Verschließmaschine',
    health: 92,
    hint: 'Lastprofil unauffällig',
    part: 'ET-20430',
  },
  {
    name: 'Verschließkopf 2',
    machine: 'Füll- und Verschließmaschine',
    health: 63,
    hint: 'Drehmomentstreuung steigt leicht an',
    part: 'ET-20418',
  },
];

export const predictions = [
  {
    id: 'p1',
    comp: 'Dosierpumpe Station 3',
    machine: 'Füll- und Verschließmaschine',
    prob: 68,
    window: 'in 14 Tagen',
    cause: 'Förderleistung sinkt seit 9 Tagen um 4 %',
    action: 'Pumpenkopf tauschen',
    part: 'ET-10233',
    slot: 'Fr, 23.10.',
  },
  {
    id: 'p2',
    comp: 'Verschließkopf 2',
    machine: 'Füll- und Verschließmaschine',
    prob: 35,
    window: 'in 30 Tagen',
    cause: 'Drehmomentstreuung 18 % über Referenz',
    action: 'Magnetkupplung prüfen',
    part: 'ET-20418',
    slot: 'Mo, 02.11.',
  },
  {
    id: 'p3',
    comp: 'Vakuumpumpe Stopfensetzer',
    machine: 'Füll- und Verschließmaschine',
    prob: 22,
    window: 'in 45 Tagen',
    cause: 'Evakuierungszeit steigt langsam an',
    action: 'Vakuumpumpe überholen',
    part: 'ET-30871',
    slot: 'Mo, 16.11.',
  },
];

export const parts = [
  { id: 'ET-10233', name: 'Pumpenkopf Dosierpumpe', group: 'Dosierung', stock: 2, lead: '3 Tage' },
  {
    id: 'ET-10240',
    name: 'Dichtungssatz Dosierpumpe',
    group: 'Dosierung',
    stock: 6,
    lead: '2 Tage',
  },
  {
    id: 'ET-20418',
    name: 'Magnetkupplung Verschließkopf',
    group: 'Verschließen',
    stock: 0,
    lead: '10 Tage',
  },
  {
    id: 'ET-20430',
    name: 'Greiferbacken Verschließkopf',
    group: 'Verschließen',
    stock: 8,
    lead: '3 Tage',
  },
  { id: 'ET-50100', name: 'Wägezelle 0–50 g', group: 'Wägung', stock: 1, lead: '14 Tage' },
  { id: 'ET-50112', name: 'Anschlusskabel Wägezelle', group: 'Wägung', stock: 4, lead: '2 Tage' },
  {
    id: 'ET-30871',
    name: 'Vakuumpumpe Stopfensetzer',
    group: 'Stopfensetzen',
    stock: 0,
    lead: '21 Tage',
  },
  {
    id: 'ET-30905',
    name: 'Saugnapf-Set Stopfensetzer',
    group: 'Stopfensetzen',
    stock: 12,
    lead: '2 Tage',
  },
  { id: 'FT-2041', name: 'Einlaufstern Format 20 ml', group: 'Formatteile', stock: 1, lead: '—' },
  { id: 'FT-3110', name: 'Füllnadel-Set 1,2 mm', group: 'Formatteile', stock: 2, lead: '—' },
];

export const partGroups = [
  'Alle',
  'Dosierung',
  'Verschließen',
  'Wägung',
  'Stopfensetzen',
  'Formatteile',
] as const;

export const formatChangeSteps = (target: string) => [
  {
    title: 'Linie leerfahren',
    machine: 'Linie',
    text: 'Restbehälter ausschleusen und die Linie in den Zustand „Stopped“ bringen. Die Plattform prüft den Zustand aller Maschinen automatisch.',
  },
  {
    title: 'Einlaufstern tauschen',
    machine: 'Füll- und Verschließmaschine',
    text: `Einlaufstern über beide Rändelschrauben lösen und das Formatteil für ${target} einsetzen.`,
    part: 'FT-2041',
  },
  {
    title: 'Füllnadeln wechseln',
    machine: 'Füll- und Verschließmaschine',
    text: 'Füllnadeln an allen vier Stationen tauschen. Nadeltyp gemäß Rezept.',
    part: 'FT-3110',
  },
  {
    title: 'Verschließköpfe umrüsten',
    machine: 'Füll- und Verschließmaschine',
    text: 'Verschließköpfe auf den neuen Kappendurchmesser einstellen und Höhe anpassen.',
    part: 'FT-4520',
  },
  {
    title: 'Fremdmaschinen umstellen',
    machine: 'Waschmaschine, Tunnel, Inspektion',
    text: 'Format an den Fremdmaschinen gemäß deren Herstelleranleitung umstellen und hier bestätigen.',
  },
  {
    title: 'Rezept laden',
    machine: 'Linie',
    text: `Rezept „${target}“ laden. Die Plattform vergleicht die Sollwerte mit der letzten freigegebenen Version.`,
  },
  {
    title: 'Testlauf',
    machine: 'Linie',
    text: '50 Behälter fahren, Füllgewicht und Verschlussmoment prüfen. Testbehälter werden automatisch ausgeschleust.',
  },
];

/** Fehlerbaum „Wägezelle 3: Tara-Abweichung“ aus dem Mockup. */
export const weighCellTree = {
  title: 'Wägezelle 3: Tara-Abweichung',
  machine: 'Füll- und Verschließmaschine',
  questions: [
    {
      q: 'Ist die Wägezelle frei von Glasbruch und Produktresten?',
      hint: 'Sichtprüfung über den Handschuheingriff am Isolator',
    },
    {
      q: 'Liegt die Abweichung nach erneutem Tarieren weiterhin über 0,05 g?',
      hint: 'Tarieren über HMI › Wägung › Tara',
    },
    {
      q: 'Sind Anschlusskabel und Stecker der Wägezelle unbeschädigt?',
      hint: 'Stecker X12 am Wägemodul prüfen',
    },
  ],
  result: {
    res: 'Wägezelle tauschen',
    detail: 'Wägezelle tauschen und mit Prüfgewichten kalibrieren; Freigabe durch QA.',
    part: 'ET-50100',
  },
};

export const troubleTrees = [
  'Wägezelle 3: Tara-Abweichung',
  'Verschlusszuführung: Füllstand niedrig',
  'Stopfensetzer: Blockade erkannt',
];

export interface FixtureModule {
  id: string;
  category: 'Kern' | 'Produktion' | 'Instandhaltung' | 'Integration';
  name: string;
  description: string;
  core?: boolean;
  gxp?: boolean;
  /** Buchungsstand wie im Mockup */
  booked: boolean;
  hasPage?: boolean;
}

export const modules: FixtureModule[] = [
  {
    id: 'core',
    category: 'Kern',
    name: 'Datenkern',
    description: 'Connectoren, Databus, IIH-Asset-Modell und kanonisches Linienmodell',
    core: true,
    gxp: true,
    booked: true,
  },
  {
    id: 'audit',
    category: 'Kern',
    name: 'Benutzer & Audit Trail',
    description: 'Rollen, Anmeldung, unveränderbarer Audit Trail, Zeitsynchronisation',
    core: true,
    gxp: true,
    booked: true,
  },
  {
    id: 'dashboard',
    category: 'Produktion',
    name: 'Linien-Dashboard',
    description: 'PackML-Zustände, Linien-OEE und Engpassanalyse',
    booked: true,
    hasPage: true,
  },
  {
    id: 'alarms',
    category: 'Produktion',
    name: 'Alarm-Analytics',
    description: 'Alarmliste, Häufigkeit, Dauer und Top-Störungen',
    booked: true,
    hasPage: true,
  },
  {
    id: 'batch',
    category: 'Produktion',
    name: 'Batch-Reporting',
    description: 'Batchdaten über die ganze Linie, Bericht mit elektronischer Signatur',
    gxp: true,
    booked: true,
    hasPage: true,
  },
  {
    id: 'format',
    category: 'Produktion',
    name: 'Geführter Formatwechsel',
    description: 'Schritt-für-Schritt-Anleitung mit Formatteil-Prüfung und Signatur',
    gxp: true,
    booked: true,
    hasPage: true,
  },
  {
    id: 'condition-monitoring',
    category: 'Instandhaltung',
    name: 'Condition Monitoring',
    description: 'Aktueller Zustand von Pumpen, Servos und Verschleißteilen',
    booked: false,
    hasPage: true,
  },
  {
    id: 'predictive-maintenance',
    category: 'Instandhaltung',
    name: 'Predictive Maintenance',
    description: 'Ausfallprognosen mit Empfehlung für das passende Wartungsfenster',
    booked: false,
    hasPage: true,
  },
  {
    id: 'troubleshooting',
    category: 'Instandhaltung',
    name: 'Geführte Fehlersuche',
    description: 'Fehlerbäume zu Alarmen, Schritt für Schritt bis zur Lösung',
    booked: true,
    hasPage: true,
  },
  {
    id: 'spares',
    category: 'Instandhaltung',
    name: 'Ersatzteilkatalog',
    description: 'Teile suchen, Bestand sehen und Anfrage direkt an den Service senden',
    booked: true,
    hasPage: true,
  },
  {
    id: 'remote-service',
    category: 'Instandhaltung',
    name: 'Remote-Service',
    description: 'Sicherer Fernzugriff und Diagnose durch unseren Service',
    booked: false,
  },
  {
    id: 'energy-monitoring',
    category: 'Integration',
    name: 'Energie-Monitoring',
    description: 'Verbräuche je Maschine und Linie',
    booked: false,
  },
  {
    id: 'mes-integration',
    category: 'Integration',
    name: 'Integration MES/ERP',
    description: 'Datenabgabe an MES, SAP und LIMS über REST, GraphQL, OPC UA',
    booked: true,
  },
  {
    id: 'data-export',
    category: 'Integration',
    name: 'Datenexport (Data Act)',
    description: 'Kundenzugriff auf alle erzeugten Daten in offenen Formaten',
    booked: true,
  },
];

export const moduleCategories = [
  'Alle',
  'Kern',
  'Produktion',
  'Instandhaltung',
  'Integration',
] as const;
