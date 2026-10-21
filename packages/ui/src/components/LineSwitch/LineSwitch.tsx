import { cx } from '../../utils/cx';
import styles from './LineSwitch.module.css';

export interface LineOption {
  id: string;
  label: string;
}

export interface LineSwitchProps {
  /** Beschreibung der Gruppe, z. B. „Linie wählen“ */
  label: string;
  lines: readonly LineOption[];
  value: string;
  onChange: (lineId: string) => void;
}

/** Segment-Schalter zur Linienwahl im Header. */
export function LineSwitch({ label, lines, value, onChange }: LineSwitchProps) {
  return (
    <div role="group" aria-label={label} className={styles.group}>
      {lines.map((line) => {
        const active = line.id === value;
        return (
          <button
            key={line.id}
            type="button"
            aria-pressed={active}
            className={cx(styles.segment, active ? styles.active : styles.inactive)}
            onClick={() => {
              onChange(line.id);
            }}
          >
            {line.label}
          </button>
        );
      })}
    </div>
  );
}
