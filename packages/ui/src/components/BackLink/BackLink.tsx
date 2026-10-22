import type { MouseEvent, ReactNode } from 'react';
import styles from './BackLink.module.css';

export interface BackLinkProps {
  /** Ziel für „in neuem Tab öffnen“ und Screenreader */
  href: string;
  /** Navigation über die Shell; ohne Angabe folgt der Browser dem Link */
  onNavigate?: () => void;
  children: ReactNode;
}

/** „← Linienübersicht“: zurück zur übergeordneten Seite. */
export function BackLink({ href, onNavigate, children }: BackLinkProps) {
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    onNavigate();
  };
  return (
    <a href={href} className={styles.link} onClick={click}>
      <span aria-hidden="true">←</span>
      {children}
    </a>
  );
}
