import { cx } from '../../utils/cx';
import styles from './Placeholder.module.css';

export interface PlaceholderProps {
  /** Beschreibung des fehlenden Inhalts, z. B. „[Teilebild]“ */
  label: string;
  /** sm: Teilebild (88 px, Fläche) · md: Bild/3D (120 px) · lg: Video (180 px) */
  size?: 'sm' | 'md' | 'lg';
}

/** Platzhalter für Bilder und Videos, bis echte Medien vorliegen. */
export function Placeholder({ label, size = 'md' }: PlaceholderProps) {
  return <div className={cx(styles.placeholder, styles[size])}>{label}</div>;
}
