import type { ReactNode } from 'react';
import { Icon } from '../../icons/Icon';
import styles from './SuccessNote.module.css';

export interface SuccessNoteProps {
  /** Fett gesetzter Anfang, z. B. „Signiert“ oder „Anfrage übermittelt.“ */
  title: string;
  children?: ReactNode;
}

/** Erfolgsmeldung mit Häkchen auf Petrol-Tönung. */
export function SuccessNote({ title, children }: SuccessNoteProps) {
  return (
    <div className={styles.note} role="status">
      <Icon name="check" className={styles.icon} />
      <div>
        <strong>{title}</strong> {children}
      </div>
    </div>
  );
}
