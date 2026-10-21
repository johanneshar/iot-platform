import { cx } from '../../utils/cx';
import styles from './KpiTile.module.css';

export interface KpiTileProps {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  /** Haupt-KPI: Petrol-Fläche mit Mint-Linie unten */
  variant?: 'default' | 'main';
}

export function KpiTile({ label, value, unit, sub, variant = 'default' }: KpiTileProps) {
  return (
    <div className={cx(styles.tile, styles[variant])}>
      <div className={styles.label}>{label}</div>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  );
}
