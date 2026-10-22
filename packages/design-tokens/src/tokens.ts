/**
 * Design Tokens der IoT-Plattform – einzige Quelle für Farben, Typografie und Maße.
 * Alle Werte stammen aus dem UI-Mockup (CLAUDE.md, Abschnitt 7). `tokens.css` wird
 * aus dieser Datei erzeugt (`pnpm --filter @iot/design-tokens generate`).
 */

export const color = {
  // Abschnitt 7.1
  primary: '#00847e',
  'primary-dark': '#006a65',
  'primary-tint': '#e6f3f2',
  'primary-tint-2': '#f0f9f8',
  accent: '#00ffc1',
  'on-accent': '#10403c',
  sidebar: '#4a4a49',
  text: '#3a3a39',
  'text-body': '#4a4a49',
  'text-muted': '#5d6463',
  bg: '#f2f5f5',
  surface: '#ffffff',
  border: '#dfe5e5',
  'border-subtle': '#edf1f1',
  'control-bg': '#eef2f2',
  'warning-bg': '#fff0d4',
  'warning-fg': '#7a4a00',
  'fault-bg': '#ffe1dc',
  'fault-fg': '#8a1f14',
  fault: '#c8372d',
  warning: '#d98a00',

  // Ergänzt aus dem Mockup (docs/offene-punkte.md, E-11)
  'on-primary': '#ffffff',
  'on-primary-tint': '#00625e',
  'chart-secondary': '#7fb9b6',
  'border-control': '#cfd6d6',
  'border-input': '#b4bcbb',
  'border-foreign': '#9aa1a0',
  'icon-muted': '#8a9190',
  'sidebar-text': '#eef1f1',
  'sidebar-text-locked': '#bfc6c6',
  'sidebar-section': '#c9d0d0',
  'sidebar-text-subtle': '#d3d9d9',
  'sidebar-text-muted': '#dde2e2',
  'sidebar-overlay': 'rgba(255, 255, 255, 0.08)',
  'sidebar-chip': 'rgba(255, 255, 255, 0.14)',
  // Nicht im Mockup: Abdunkelung hinter modalen Dialogen (M3b)
  'sidebar-backdrop': 'rgba(58, 58, 57, 0.55)',
} as const;

export const font = {
  family: "'Helvetica Neue LT Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const;

/** Schriftgrößen in px, benannt nach Verwendung im Mockup. */
export const fontSize = {
  overline: '11px', // Abschnittsüberschrift Navigation
  caption: '12px', // Tabellenkopf, kleine Beschriftungen
  label: '13px', // Beschriftungen, Chips
  table: '14px', // Tabellen, Listen, Sekundärtext
  body: '15px', // Fließtext, Buttons
  'card-value': '16px', // Name in Karten
  emphasis: '17px', // Werte in Maschinenkarten, Markenname
  'card-title': '18px', // Kartenüberschrift
  'detail-title': '20px',
  'detail-title-lg': '22px',
  'page-title': '24px',
  figure: '28px',
  'figure-lg': '30px',
  kpi: '34px',
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const lineHeight = {
  tight: '1.25',
  snug: '1.3',
  heading: '1.35',
  compact: '1.45',
  relaxed: '1.5',
  body: '1.55',
  loose: '1.6',
} as const;

export const letterSpacing = {
  tight: '-0.01em',
  brand: '0.01em',
  kpi: '0.02em',
  caps: '0.06em',
  overline: '0.1em',
} as const;

/** Abstände in px; der Name ist der Wert. */
export const space = {
  '0': '0',
  '1': '1px',
  '2': '2px',
  '3': '3px',
  '4': '4px',
  '5': '5px',
  '6': '6px',
  '8': '8px',
  '10': '10px',
  '12': '12px',
  '14': '14px',
  '16': '16px',
  '18': '18px',
  '20': '20px',
  '24': '24px',
  '28': '28px',
  '32': '32px',
  '40': '40px',
  '48': '48px',
} as const;

export const radius = {
  swatch: '3px',
  xs: '6px',
  sm: '8px',
  md: '10px',
  lg: '12px',
  xl: '14px',
  pill: '999px',
  round: '50%',
} as const;

export const border = {
  width: '1px',
  'width-strong': '2px',
  'width-foreign': '1.5px',
  'width-accent': '4px', // Mint-Linie unter der Haupt-KPI
} as const;

export const shadow = {
  raised: '0 1px 3px rgba(0, 0, 0, 0.12)',
  // Markierung in der 3D-Ansicht (Entwurf M5a)
  marker: '0 2px 8px rgba(58, 58, 57, 0.25)',
} as const;

export const opacity = {
  label: '0.9',
  sub: '0.85',
  disabled: '0.45',
} as const;

/** Feste Größen von Bedienelementen und Flächen. */
export const size = {
  'control-height': '44px',
  'control-height-sm': '36px',
  'segment-height': '40px',
  'choice-height': '52px',
  'choice-height-lg': '56px',
  'choice-card-height': '96px',
  'sidebar-width': '260px',
  'main-min-width': '560px',
  'content-max-width': '1400px',
  'narrow-max-width': '720px',
  // Nicht im Mockup: Anmeldung und Signaturdialog (M3b)
  'dialog-width': '440px',
  'wide-max-width': '860px',
  'text-max-width': '760px',
  'brand-mark': '40px',
  avatar: '36px',
  'locked-icon-box': '56px',
  'icon-sm': '16px',
  'icon-md': '20px',
  'icon-lg': '22px',
  'icon-xl': '28px',
  'dot-sm': '7px',
  'dot-md': '8px',
  'dot-lg': '10px',
  swatch: '12px',
  'step-dot-sm': '22px',
  'step-dot-md': '24px',
  'step-dot-lg': '28px',
  'bar-sm': '8px',
  'bar-md': '10px',
  'placeholder-sm': '88px',
  'placeholder-md': '120px',
  'placeholder-lg': '180px',
  'machine-name-min-height': '40px',
  'choice-min-width': '140px',
  'table-min-width': '600px',
  'table-min-width-lg': '720px',
  // Auswertungen der Maschinen-Detailseite (M5a)
  'timeline-height': '36px',
  'chart-height': '200px',
  'trend-height': '56px',
  'model-height-md': '340px',
  'model-height-lg': '420px',
  'marker-badge': '34px',
} as const;

/** Mindestbreiten für automatische Raster (`repeat(auto-fit, minmax(…, 1fr))`). */
export const grid = {
  'kpi-min': '180px',
  'value-min': '160px',
  'tile-min': '200px',
  'machine-min': '200px',
  'choice-min': '220px',
  'part-min': '240px',
  'card-min': '260px',
  // Mindestbreiten nebeneinanderliegender Karten (flex-basis)
  'column-side': '300px',
  'column-steps': '320px',
  'column-half': '380px',
  'column-main': '480px',
  'column-main-md': '520px',
  'column-main-lg': '560px',
  'column-main-xl': '600px',
} as const;

export const tokens = {
  color,
  font,
  'font-size': fontSize,
  'font-weight': fontWeight,
  'line-height': lineHeight,
  'letter-spacing': letterSpacing,
  space,
  radius,
  border,
  shadow,
  opacity,
  size,
  grid,
} as const;

/** Liefert `var(--group-name)` für die Verwendung in TypeScript (z. B. Inline-SVG). */
export function cssVar<G extends keyof typeof tokens>(
  group: G,
  name: keyof (typeof tokens)[G] & string,
): string {
  return `var(--${group}-${name})`;
}
