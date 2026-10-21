import type { ReactNode } from 'react';
import styles from './Header.module.css';

export interface HeaderProps {
  /** Seitentitel (h1) */
  title: string;
  /** Zeile darüber, z. B. Linienname */
  eyebrow?: string;
  /** Rechte Seite: Linienwahl, Zustand, Benutzer … */
  children?: ReactNode;
}

/** Weißer Seitenkopf mit Titel und Werkzeugleiste. */
export function Header({ title, eyebrow, children }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleBlock}>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {children && <div className={styles.tools}>{children}</div>}
    </header>
  );
}

export interface UserBadgeProps {
  /** Initialen im Kreis, z. B. „BN“ */
  initials: string;
  name: string;
  /** Rolle des Benutzers, z. B. „Schichtleitung“ */
  roleLabel: string;
}

/** Angemeldeter Benutzer im Header. */
export function UserBadge({ initials, name, roleLabel }: UserBadgeProps) {
  return (
    <div className={styles.user}>
      <div className={styles.avatar} aria-hidden="true">
        {initials}
      </div>
      <div className={styles.userText}>
        <div className={styles.userName}>{name}</div>
        <div className={styles.userRole}>{roleLabel}</div>
      </div>
    </div>
  );
}
