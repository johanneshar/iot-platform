import { cx } from '../../utils/cx';
import utils from '../../styles/utils.module.css';
import { stateTone, type PackMLState } from '../StateChip/StateChip';
import styles from './StateTimeline.module.css';

export interface TimelineSegment {
  state: PackMLState;
  /** Dauer oder Anteil – die Breite ergibt sich aus dem Verhältnis */
  duration: number;
  /** Text für Screenreader, z. B. „Held ab 10:52, 18 min“ */
  description: string;
}

export interface StateTimelineProps {
  /** Beschreibung, z. B. „Zustandsverlauf seit 06:00“ */
  label: string;
  segments: readonly TimelineSegment[];
  /** Beschriftung der Zeitachse, gleichmäßig verteilt */
  ticks?: readonly string[];
}

/** Zeitbalken der PackML-Zustände (Maschinen-Detailseite). Farben wie `StateChip`. */
export function StateTimeline({ label, segments, ticks = [] }: StateTimelineProps) {
  const total = segments.reduce((sum, s) => sum + s.duration, 0);
  return (
    <figure className={styles.figure}>
      <div className={styles.bar} aria-hidden="true">
        {segments.map((s, index) => {
          const share = total > 0 ? s.duration / total : 0;
          return (
            <div
              key={`${String(index)}-${s.state}`}
              className={cx(styles.segment, styles[stateTone(s.state)])}
              style={{ flexGrow: s.duration }}
              title={s.description}
            >
              {share > 0.12 ? s.state : ''}
            </div>
          );
        })}
      </div>
      {ticks.length > 0 && (
        <div className={styles.ticks} aria-hidden="true">
          {ticks.map((tick, index) => (
            <span key={`${String(index)}-${tick}`}>{tick}</span>
          ))}
        </div>
      )}
      <figcaption className={utils.srOnly}>
        {label}
        <ul>
          {segments.map((s, index) => (
            <li key={`${String(index)}-${s.state}`}>{s.description}</li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
