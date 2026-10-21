import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import styles from './InfoTile.module.css';

export interface InfoTileProps {
  label: string;
  value: ReactNode;
  /** sm: 14 px · md: 16 px · lg: 22 px Wert */
  size?: 'sm' | 'md' | 'lg';
  /** Inhalt rechts neben dem Wert, z. B. ein Button */
  aside?: ReactNode;
}

/** Graue Kachel mit Beschriftung und Wert (Datenquelle, Gutteile, Formatteil …). */
export function InfoTile({ label, value, size = 'lg', aside }: InfoTileProps) {
  return (
    <div
      className={cx(
        styles.tile,
        size === 'sm' && styles.compact,
        aside !== undefined && styles.withAside,
      )}
    >
      <div>
        <div className={styles.label}>{label}</div>
        <div className={cx(styles.value, styles[size])}>{value}</div>
      </div>
      {aside}
    </div>
  );
}
