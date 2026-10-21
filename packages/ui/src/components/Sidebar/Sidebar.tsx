import { useId, type ReactNode } from 'react';
import { Icon } from '../../icons/Icon';
import { NavItem, type NavItemProps } from '../NavItem/NavItem';
import styles from './Sidebar.module.css';

export interface SidebarSection {
  id: string;
  label: string;
  items: readonly (NavItemProps & { id: string })[];
}

export interface SidebarProps {
  /** Produktname, z. B. „IoT Plattform“ */
  title: string;
  /** Zeile unter dem Namen, vorerst „[Firmenlogo]“ */
  subtitle?: string;
  /** Beschreibung der Navigation für Screenreader */
  navLabel: string;
  sections: readonly SidebarSection[];
  /** Inhalt am unteren Rand, z. B. `SidebarStatus` */
  footer?: ReactNode;
}

/** Dunkle Seitenleiste mit Marke, Navigation in Abschnitten und Statusbereich. */
export function Sidebar({ title, subtitle, navLabel, sections, footer }: SidebarProps) {
  const idPrefix = useId();
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.mark}>
          <Icon name="brand" size="lg" className={styles.markIcon} />
        </div>
        <div className={styles.brandText}>
          <div className={styles.title}>{title}</div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
      </div>

      <nav aria-label={navLabel} className={styles.nav}>
        {sections.map((section) => {
          const headingId = `${idPrefix}-${section.id}`;
          return (
            <div key={section.id} className={styles.section}>
              <div id={headingId} className={styles.sectionLabel}>
                {section.label}
              </div>
              <ul aria-labelledby={headingId} className={styles.list}>
                {section.items.map(({ id, ...item }) => (
                  <li key={id}>
                    <NavItem {...item} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {footer && <div className={styles.footer}>{footer}</div>}
    </aside>
  );
}

export interface SidebarStatusProps {
  /** z. B. „Edge Device online“ */
  title: string;
  online: boolean;
  /** Weitere Zeilen, z. B. Linienname und „IEM verbunden · Zeit synchron“ */
  lines?: readonly string[];
}

/** Statusblock am unteren Rand der Seitenleiste. */
export function SidebarStatus({ title, online, lines = [] }: SidebarStatusProps) {
  return (
    <div className={styles.status}>
      <div className={styles.statusTitle}>
        <span className={online ? styles.dotOnline : styles.dotOffline} aria-hidden="true" />
        {title}
      </div>
      {lines.length > 0 && (
        <div className={styles.statusLines}>
          {lines.map((line, index) => (
            <span key={`${String(index)}-${line}`}>
              {index > 0 && <br />}
              {line}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
