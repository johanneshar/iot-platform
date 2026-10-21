import { useId } from 'react';
import { Icon } from '../../icons/Icon';
import utils from '../../styles/utils.module.css';
import styles from './LineSwitch.module.css';

export interface LineOption {
  id: string;
  label: string;
}

export interface LineSwitchProps {
  /** Beschriftung für Screenreader, z. B. „Linie wählen“ */
  label: string;
  lines: readonly LineOption[];
  value: string;
  onChange: (lineId: string) => void;
}

/**
 * Linienwahl im Header als Auswahlliste – bleibt auch bei vielen Linien schmal.
 * Natives `<select>`: auf HMI und Tablet öffnet sich die Systemauswahl.
 */
export function LineSwitch({ label, lines, value, onChange }: LineSwitchProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={utils.srOnly}>
        {label}
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {lines.map((line) => (
          <option key={line.id} value={line.id}>
            {line.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" size="sm" className={styles.chevron} />
    </div>
  );
}
