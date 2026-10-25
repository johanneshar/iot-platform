import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useUiTranslation } from '../../i18n/translations';
import { cx } from '../../utils/cx';
import styles from './ScanInput.module.css';

export type ScanSource = 'scanner' | 'manual';

/** Handscanner tippen schneller als Menschen: mittlerer Abstand der Zeichen darunter → Scanner */
const SCANNER_MAX_INTERVAL_MS = 35;
const SCANNER_MIN_LENGTH = 4;
const ENTER = 'Enter';

/** Woher ein Code kam – nach dem Abstand der Tastendrücke (Handscanner als Tastatur, E-17). */
export function scanSource(times: readonly number[]): ScanSource {
  if (times.length < SCANNER_MIN_LENGTH) return 'manual';
  const first = times[0] ?? 0;
  const last = times[times.length - 1] ?? 0;
  return (last - first) / (times.length - 1) <= SCANNER_MAX_INTERVAL_MS ? 'scanner' : 'manual';
}

export interface ScanInputProps {
  /** Beschriftung, z. B. „Code am Formatteil“ */
  label: string;
  /** Code bestätigt (Enter, wie vom Handscanner gesendet) */
  onScan: (code: string, source: ScanSource) => void;
  /** Ergebnis der Prüfung unter dem Feld */
  status?: { tone: 'ok' | 'error'; message: string };
  disabled?: boolean;
}

/** Eingabefeld für Handscanner (Tastatureingabe) mit Prüfergebnis; Enter bestätigt den Code. */
export function ScanInput({ label, onScan, status, disabled = false }: ScanInputProps) {
  const t = useUiTranslation();
  const id = useId();
  const [value, setValue] = useState('');
  const times = useRef<number[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === ENTER) {
      event.preventDefault();
      const code = value.trim();
      if (code) onScan(code, scanSource(times.current));
      setValue('');
      times.current = [];
      return;
    }
    if (event.key.length === 1) times.current.push(event.timeStamp);
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        value={value}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        placeholder={t('scan.placeholder')}
        aria-describedby={status ? `${id}-status` : undefined}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          if (event.target.value === '') times.current = [];
          setValue(event.target.value);
        }}
      />
      {status && (
        <div
          id={`${id}-status`}
          role={status.tone === 'error' ? 'alert' : 'status'}
          className={cx(styles.status, styles[status.tone])}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
