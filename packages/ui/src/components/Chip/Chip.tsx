import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import styles from './Chip.module.css';

export type ChipTone =
  | 'neutral'
  | 'accent'
  | 'warning'
  | 'fault'
  | 'info'
  | 'primary'
  | 'dark'
  | 'darkAccent'
  | 'translucent';

export interface ChipProps {
  tone?: ChipTone;
  /** sm: 12 px (z. B. „Engpass“) · badge: kompakt für Zähler in der Navigation */
  size?: 'md' | 'sm' | 'badge';
  /** Punkt in Textfarbe vor dem Inhalt (sm 7 px, md 8 px) */
  dot?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}

export function Chip({ tone = 'neutral', size = 'md', dot, children, className }: ChipProps) {
  return (
    <span className={cx(styles.chip, styles[tone], size !== 'md' && styles[size], className)}>
      {dot && <span className={cx(styles.dot, styles[`dot-${dot}`])} aria-hidden="true" />}
      {children}
    </span>
  );
}
