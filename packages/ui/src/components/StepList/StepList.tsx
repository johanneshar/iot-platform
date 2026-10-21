import { useUiTranslation } from '../../i18n/translations';
import { cx } from '../../utils/cx';
import utils from '../../styles/utils.module.css';
import styles from './StepList.module.css';

/** Markierung erledigter Schritte (kein Text, daher ohne Übersetzung) */
const DONE_MARK = '✓';

export type StepStatus = 'done' | 'current' | 'upcoming';

export interface Step {
  id: string;
  label: string;
  /** Zusatzzeile, z. B. betroffene Maschine (nur Variante `list`) */
  detail?: string;
  status: StepStatus;
}

export interface StepListProps {
  /** Beschreibung der Schrittfolge für Screenreader */
  label: string;
  steps: readonly Step[];
  /** pills: Batch-Verlauf (waagrecht) · list: Formatwechsel (senkrecht) */
  variant?: 'pills' | 'list';
}

/** Schrittfolge mit erledigten, aktuellem und offenen Schritten. */
export function StepList({ label, steps, variant = 'pills' }: StepListProps) {
  const t = useUiTranslation();
  return (
    <ol aria-label={label} className={cx(styles.steps, styles[variant])}>
      {steps.map((step, index) => (
        <li
          key={step.id}
          aria-current={step.status === 'current' ? 'step' : undefined}
          className={cx(styles.step, styles[step.status])}
        >
          <span className={styles.dot} aria-hidden="true">
            {step.status === 'done' ? DONE_MARK : String(index + 1)}
          </span>
          {variant === 'list' ? (
            <span className={styles.text}>
              <span className={styles.title}>{step.label}</span>
              {step.detail && <span className={styles.detail}>{step.detail}</span>}
            </span>
          ) : (
            step.label
          )}
          {step.status === 'done' && <span className={utils.srOnly}>, {t('step.done')}</span>}
        </li>
      ))}
    </ol>
  );
}

export interface TrailStep {
  id: string;
  question: string;
  answer: string;
}

export interface StepTrailProps {
  label: string;
  steps: readonly TrailStep[];
}

/** Bisheriger Weg einer geführten Fehlersuche: Frage und gegebene Antwort. */
export function StepTrail({ label, steps }: StepTrailProps) {
  return (
    <ol aria-label={label} className={styles.trail}>
      {steps.map((step, index) => (
        <li key={step.id} className={styles.trailStep}>
          <span className={styles.trailDot} aria-hidden="true">
            {String(index + 1)}
          </span>
          <span>
            {step.question} <strong className={styles.answer}>{step.answer}</strong>
          </span>
        </li>
      ))}
    </ol>
  );
}
