import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import styles from './ValueTrend.module.css';

export interface ValueTrendProps {
  name: string;
  /** aktueller Wert, formatiert, z. B. „10,02“ */
  value: string;
  unit: string;
  /** Verlauf (Mittelwerte), älteste zuerst */
  points: readonly number[];
  /** Grenzen aus dem Wertekatalog (S-06) */
  min?: number | null;
  max?: number | null;
  /** Zusatzkennzeichen neben dem Namen, z. B. Chip „GxP“ */
  badge?: ReactNode;
  /** Zeile unter dem Verlauf, z. B. „Ø 10,01 g · Grenzen 9,95 – 10,10“ */
  summary: string;
  /** Beschreibung des Verlaufs für Screenreader */
  label: string;
  /** Wert außerhalb der Grenzen */
  outOfLimits?: boolean;
}

const W = 240;
const H = 56;

/** Prozesswert mit Verlauf und Grenzband (Maschinen-Detailseite). */
export function ValueTrend({
  name,
  value,
  unit,
  points,
  min = null,
  max = null,
  badge,
  summary,
  label,
  outOfLimits = false,
}: ValueTrendProps) {
  const all = [...points, ...(min === null ? [] : [min]), ...(max === null ? [] : [max])];
  const lo = all.length ? Math.min(...all) : 0;
  const hi = all.length ? Math.max(...all) : 1;
  const pad = (hi - lo || 1) * 0.15;
  const y = (v: number) => H - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * H;
  const x = (i: number) => (points.length > 1 ? (i / (points.length - 1)) * W : W / 2);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p).toFixed(1)}`)
    .join(' ');
  return (
    <div className={cx(styles.card, outOfLimits && styles.alert)}>
      <div className={styles.head}>
        <span className={styles.name}>{name}</span>
        {badge}
      </div>
      <div>
        <span className={styles.value}>{value}</span> <span className={styles.unit}>{unit}</span>
      </div>
      <svg
        className={styles.trend}
        viewBox={`0 0 ${String(W)} ${String(H)}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
      >
        {min !== null && max !== null && (
          <rect className={styles.band} x="0" y={y(max)} width={W} height={y(min) - y(max)} />
        )}
        {max !== null && <line className={styles.limit} x1="0" x2={W} y1={y(max)} y2={y(max)} />}
        {min !== null && <line className={styles.limit} x1="0" x2={W} y1={y(min)} y2={y(min)} />}
        {points.length > 0 && <path className={styles.line} d={path} />}
      </svg>
      <div className={styles.summary}>{summary}</div>
    </div>
  );
}
