import { cx } from '../../utils/cx';
import styles from './FilterGroup.module.css';

export interface FilterOption<V extends string> {
  value: V;
  label: string;
}

export interface FilterGroupProps<V extends string> {
  /** Beschreibung der Gruppe, z. B. „Alarmklasse filtern“ */
  label: string;
  options: readonly FilterOption<V>[];
  value: V;
  onChange: (value: V) => void;
}

/** Filterschalter (Alarmklasse, Baugruppe, Modulkategorie). */
export function FilterGroup<V extends string>({
  label,
  options,
  value,
  onChange,
}: FilterGroupProps<V>) {
  return (
    <div role="group" aria-label={label} className={styles.group}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            className={cx(styles.option, active ? styles.on : styles.off)}
            onClick={() => {
              onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
