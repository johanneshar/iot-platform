import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import styles from './ChoiceButton.module.css';

export interface ChoiceButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  title: string;
  subtitle?: string;
  /** row: Zeile mit Pfeil (Fehlersuche) · card: Kachel (Zielformat) */
  variant?: 'row' | 'card';
}

/** Auswahlschaltfläche für Listen von Einstiegen, z. B. Fehlerbäume oder Zielformate. */
export function ChoiceButton({
  title,
  subtitle,
  variant = 'row',
  type = 'button',
  className,
  ...rest
}: ChoiceButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.choice, styles[variant], subtitle && styles.withSubtitle, className)}
      {...rest}
    >
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </span>
      {variant === 'row' && (
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
      )}
    </button>
  );
}
