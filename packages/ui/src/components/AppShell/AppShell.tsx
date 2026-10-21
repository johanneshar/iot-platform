import type { ReactNode } from 'react';
import styles from './AppShell.module.css';

export interface AppShellProps {
  /** In der Regel `Sidebar` */
  sidebar: ReactNode;
  /** In der Regel `Header` */
  header: ReactNode;
  children: ReactNode;
}

/**
 * Grundlayout: Seitenleiste links, Kopf und Inhalt rechts. Auf schmalen Bildschirmen
 * bricht die Seitenleiste unter den Inhalt um (CLAUDE.md, Abschnitt 7.3).
 */
export function AppShell({ sidebar, header, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.sidebar}>{sidebar}</div>
      <div className={styles.main}>
        {header}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

export interface StackProps {
  /** Abstand zwischen Blöcken: 16, 20 oder 24 px */
  gap?: '16' | '20' | '24';
  children: ReactNode;
}

/** Senkrechte Anordnung von Blöcken im Inhaltsbereich. */
export function Stack({ gap = '24', children }: StackProps) {
  return <div className={styles[`stack-${gap}`]}>{children}</div>;
}
