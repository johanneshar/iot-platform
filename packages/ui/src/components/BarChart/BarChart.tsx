import { cx } from '../../utils/cx';
import utils from '../../styles/utils.module.css';
import styles from './BarChart.module.css';

const MAX_AXIS_LABELS = 9;

export interface BarChartBar {
  /** Beschriftung unter dem Balken, z. B. „06:00“ */
  label: string;
  /** `null` = kein Wert (z. B. keine Laufzeit) */
  value: number | null;
  /** Anzeige über dem Balken, z. B. „286“ */
  display: string;
  /** hervorheben, z. B. über der Grenze */
  highlight?: boolean;
}

export interface BarChartProps {
  /** Beschreibung für Screenreader und Tabellenüberschrift */
  label: string;
  bars: readonly BarChartBar[];
  /** Obergrenze der Skala; ohne Angabe der größte Wert bzw. die Referenz */
  max?: number;
  /** Soll- oder Grenzlinie */
  reference?: { value: number; label: string; tone?: 'neutral' | 'warning' };
  /** primary: Petrol · secondary: helles Petrol */
  tone?: 'primary' | 'secondary';
}

/** Balkendiagramm je Zeitabschnitt mit optionaler Soll- oder Grenzlinie (Maschinen-Detailseite). */
export function BarChart({ label, bars, max, reference, tone = 'primary' }: BarChartProps) {
  const scale = max ?? Math.max(reference?.value ?? 0, ...bars.map((b) => b.value ?? 0), 1) * 1.08;
  const pct = (v: number) => `${String(Math.min(100, (v / scale) * 100))}%`;
  // Bei vielen Abschnitten nur jede n-te Achsenbeschriftung, damit nichts abgeschnitten wird
  const every = Math.ceil(bars.length / MAX_AXIS_LABELS);
  return (
    <div className={styles.chart}>
      <div className={styles.plot} aria-hidden="true">
        {reference && (
          <div
            className={cx(
              styles.reference,
              reference.tone === 'warning' && styles.referenceWarning,
            )}
            style={{ bottom: pct(reference.value) }}
          >
            <span className={styles.referenceLabel}>{reference.label}</span>
          </div>
        )}
        {bars.map((b, index) => (
          <div
            key={`${String(index)}-${b.label}`}
            className={styles.column}
            title={`${b.label}: ${b.display}`}
          >
            <span className={styles.value}>
              {bars.length > MAX_AXIS_LABELS * 1.5 ? '' : b.display}
            </span>
            <div
              className={cx(styles.bar, styles[tone], b.highlight && styles.highlight)}
              style={{ height: pct(b.value ?? 0) }}
            />
          </div>
        ))}
      </div>
      <div className={styles.axis} aria-hidden="true">
        {bars.map((b, index) => (
          <span key={`${String(index)}-${b.label}`} className={styles.axisLabel}>
            {index % every === 0 ? b.label : ''}
          </span>
        ))}
      </div>
      <table className={utils.srOnly}>
        <caption>{label}</caption>
        <tbody>
          {bars.map((b, index) => (
            <tr key={`${String(index)}-${b.label}`}>
              <th scope="row">{b.label}</th>
              <td>{b.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
