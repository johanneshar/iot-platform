import { cx } from '../../utils/cx';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  /** 0–100 */
  value: number;
  /** Beschreibung für Screenreader, z. B. „Fortschritt Batch“ */
  label: string;
  /** primary: Petrol · secondary: helles Petrol · warning · fault */
  tone?: 'primary' | 'secondary' | 'warning' | 'fault';
  /** sm 8 px · md 10 px */
  size?: 'sm' | 'md';
}

export function ProgressBar({ value, label, tone = 'primary', size = 'sm' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cx(styles.track, styles[size])}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <div className={cx(styles.fill, styles[tone])} style={{ width: `${String(clamped)}%` }} />
    </div>
  );
}
