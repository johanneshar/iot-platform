import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../utils/cx';
import styles from './Card.module.css';

type Space = '4' | '6' | '12' | '14' | '16' | '18' | '20';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** xs 12 · sm 20 · md 24 · lg 28 px Innenabstand; `bar` 20/24 px (Kopfleiste) */
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'bar';
  /** Abstand zwischen den Kindern; ohne Angabe kein Flex-Layout */
  gap?: Space;
  /** Rahmen in Petrol (ausgewählt / aktiv) */
  highlighted?: boolean;
  as?: 'section' | 'div' | 'article';
  children: ReactNode;
}

export function Card({
  padding = 'md',
  gap,
  highlighted = false,
  as: Element = 'section',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Element
      className={cx(
        styles.card,
        styles[`padding-${padding}`],
        gap && styles.stack,
        gap && styles[`gap-${gap}`],
        highlighted && styles.highlighted,
        className,
      )}
      {...rest}
    >
      {children}
    </Element>
  );
}

const SIZE_CLASS = { card: 'sizeCard', detail: 'sizeDetail', detailLg: 'sizeDetailLg' } as const;

export interface CardHeaderProps {
  title: ReactNode;
  /** Kleine Beschriftung über dem Titel, z. B. „Maschinendetails“ */
  eyebrow?: ReactNode;
  /** Sekundärtext unter dem Titel (14 px, gedämpft) */
  subtitle?: ReactNode;
  /** Zusatzzeile unter dem Titel in Fließtextfarbe, z. B. Produkt und Rezept */
  detail?: ReactNode;
  /** card 18 px · detail 20 px · detailLg 22 px */
  size?: 'card' | 'detail' | 'detailLg';
  level?: 2 | 3;
  /** Inhalt rechts, z. B. Chip oder Legende */
  aside?: ReactNode;
  id?: string;
}

export function CardHeader({
  title,
  eyebrow,
  subtitle,
  detail,
  size = 'card',
  level = 2,
  aside,
  id,
}: CardHeaderProps) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <div
      className={cx(styles.header, eyebrow !== undefined ? styles.alignStart : styles.alignCenter)}
    >
      <div>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        <Heading
          id={id}
          className={cx(
            styles.title,
            styles[SIZE_CLASS[size]],
            eyebrow !== undefined && styles.afterEyebrow,
          )}
        >
          {title}
        </Heading>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        {detail && <div className={styles.detail}>{detail}</div>}
      </div>
      {aside}
    </div>
  );
}
