import { useUiTranslation } from '../../i18n/translations';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { Chip, type ChipTone } from '../Chip/Chip';
import { ProgressBar, type ProgressBarProps } from '../ProgressBar/ProgressBar';
import styles from './HealthCard.module.css';

export type HealthStatus = 'ok' | 'watch' | 'replace';

const STATUS_TONE: Record<HealthStatus, { chip: ChipTone; bar: ProgressBarProps['tone'] }> = {
  ok: { chip: 'accent', bar: 'primary' },
  watch: { chip: 'warning', bar: 'warning' },
  replace: { chip: 'fault', bar: 'fault' },
};

export interface HealthCardProps {
  name: string;
  machine: string;
  /** Zustand 0–100 % */
  health: number;
  /** Bewertung; die Schwellen legt das Modul fest */
  status: HealthStatus;
  hint: string;
  /** z. B. „Ersatzteil ET-10233 anzeigen“ */
  actionLabel?: string;
  onAction?: () => void;
}

/** Zustandskarte einer verschleißrelevanten Komponente (Condition Monitoring). */
export function HealthCard({
  name,
  machine,
  health,
  status,
  hint,
  actionLabel,
  onAction,
}: HealthCardProps) {
  const t = useUiTranslation();
  const tone = STATUS_TONE[status];
  return (
    <Card padding="sm" gap="12">
      <div className={styles.top}>
        <div>
          <h3 className={styles.name}>{name}</h3>
          <div className={styles.machine}>{machine}</div>
        </div>
        <Chip tone={tone.chip}>{t(`health.status.${status}`)}</Chip>
      </div>
      <div className={styles.valueRow}>
        <span className={styles.value}>{health}</span>
        <span className={styles.unit}>{t('health.unit')}</span>
      </div>
      <ProgressBar value={health} tone={tone.bar} label={`${name}: ${t('health.unit')}`} />
      <div className={styles.hint}>{hint}</div>
      {actionLabel && (
        <Button variant="outline" size="sm" className={styles.action} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
