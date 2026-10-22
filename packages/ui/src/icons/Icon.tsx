import type { ReactNode } from 'react';
import styles from './Icon.module.css';

interface IconDefinition {
  strokeWidth: number;
  paths: ReactNode;
}

/** Icons aus dem Mockup (24×24, Kontur). */
const ICONS = {
  brand: {
    strokeWidth: 2,
    paths: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M14 17.5h7M17.5 14v7" />
      </>
    ),
  },
  overview: {
    strokeWidth: 1.8,
    paths: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </>
    ),
  },
  alarms: {
    strokeWidth: 1.8,
    paths: (
      <>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </>
    ),
  },
  batch: {
    strokeWidth: 1.8,
    paths: (
      <>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6" />
        <path d="M8 13h8M8 17h5" />
      </>
    ),
  },
  condition: {
    strokeWidth: 1.8,
    paths: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  },
  prediction: {
    strokeWidth: 1.8,
    paths: (
      <>
        <path d="M3 3v18h18" />
        <path d="m7 15 4-4 3 3 6-7" />
        <path d="M16 7h4v4" />
      </>
    ),
  },
  troubleshooting: {
    strokeWidth: 1.8,
    paths: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
        <path d="M11 8v3l2 2" />
      </>
    ),
  },
  format: {
    strokeWidth: 1.8,
    paths: (
      <>
        <path d="M17 3l4 4-4 4" />
        <path d="M3 7h18" />
        <path d="M7 21l-4-4 4-4" />
        <path d="M21 17H3" />
      </>
    ),
  },
  spares: {
    strokeWidth: 1.8,
    paths: (
      <>
        <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
        <path d="m3 8 9 5 9-5" />
        <path d="M12 13v8" />
      </>
    ),
  },
  modules: {
    strokeWidth: 1.8,
    paths: (
      <>
        <path d="M12 2 3 7l9 5 9-5z" />
        <path d="m3 12 9 5 9-5" />
        <path d="m3 17 9 5 9-5" />
      </>
    ),
  },
  lock: {
    strokeWidth: 2,
    paths: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
  },
  check: {
    strokeWidth: 2.2,
    paths: <path d="m5 12 5 5L20 7" />,
  },
  'arrow-right': {
    strokeWidth: 2,
    paths: <path d="M5 12h14M13 6l6 6-6 6" />,
  },
  // Nicht im Mockup: Linienwahl als Auswahlliste (Änderung vom 2026-10-22)
  'chevron-down': {
    strokeWidth: 2,
    paths: <path d="m6 9 6 6 6-6" />,
  },
  // 3D-Ansicht (Entwurf M5a)
  zoomIn: {
    strokeWidth: 2,
    paths: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5M11 8v6M8 11h6" />
      </>
    ),
  },
  zoomOut: {
    strokeWidth: 2,
    paths: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5M8 11h6" />
      </>
    ),
  },
  reset: {
    strokeWidth: 2,
    paths: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </>
    ),
  },
  fullscreen: {
    strokeWidth: 2,
    paths: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  },
} satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export interface IconProps {
  name: IconName;
  /** sm 16 px · md 20 px · lg 22 px · xl 28 px */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Strichstärke abweichend vom Standard des Icons (z. B. Schloss im Sperrbildschirm). */
  strokeWidth?: number;
  /** Ohne `label` ist das Icon dekorativ und für Screenreader verborgen. */
  label?: string;
  className?: string;
}

export function Icon({ name, size = 'md', strokeWidth, label, className }: IconProps) {
  const icon: IconDefinition = ICONS[name];
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? icon.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={[styles.icon, styles[size], className].filter(Boolean).join(' ')}
      {...a11y}
    >
      {icon.paths}
    </svg>
  );
}
