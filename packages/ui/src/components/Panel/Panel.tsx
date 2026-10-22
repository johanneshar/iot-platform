import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import styles from './Panel.module.css';

export interface PanelProps {
  /** neutral: graue Fläche (Frage) · solution: Petrol-Tönung mit Rahmen (Lösung) */
  tone?: 'neutral' | 'solution';
  /** Kleine Überschrift in Versalien, z. B. „Lösung“ */
  label?: string;
  /** Haupttext, 20 px fett */
  title?: ReactNode;
  children?: ReactNode;
}

/** Hervorgehobene Fläche innerhalb einer Karte, z. B. Frage und Lösung der geführten Fehlersuche. */
export function Panel({ tone = 'neutral', label, title, children }: PanelProps) {
  return (
    <div className={cx(styles.panel, styles[tone])}>
      {label && <div className={styles.label}>{label}</div>}
      {title && <div className={styles.title}>{title}</div>}
      {children}
    </div>
  );
}
