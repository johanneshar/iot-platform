import { useUiTranslation } from '../../i18n/translations';
import { cx } from '../../utils/cx';
import { Chip } from '../Chip/Chip';
import { StateChip, type PackMLState } from '../StateChip/StateChip';
import styles from './MachineCard.module.css';

export interface MachineCardProps {
  name: string;
  /** own: eigene Maschine · foreign: Fremdmaschine (gestrichelter Rahmen) */
  kind: 'own' | 'foreign';
  /** Integrationsstufe als Text, z. B. „Standard“ (nur Fremdmaschine) */
  levelLabel?: string;
  state: PackMLState;
  /** Leistung in Stück pro Minute, bereits formatiert */
  rate: string;
  /** OEE in Prozent, bereits formatiert */
  oee: string;
  bottleneck?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

/** Maschinenkarte im Linienfluss. */
export function MachineCard({
  name,
  kind,
  levelLabel = '',
  state,
  rate,
  oee,
  bottleneck = false,
  selected = false,
  onSelect,
}: MachineCardProps) {
  const t = useUiTranslation();
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cx(styles.card, styles[kind], selected && styles.selected)}
    >
      <span className={styles.top}>
        <span className={cx(styles.kind, styles[`kind-${kind}`])}>
          {kind === 'own' ? t('machine.own') : t('machine.foreign', { level: levelLabel })}
        </span>
        {bottleneck && (
          <Chip tone="darkAccent" size="sm">
            {t('machine.bottleneck')}
          </Chip>
        )}
      </span>
      <span className={styles.name}>{name}</span>
      <StateChip state={state} />
      <span className={styles.metrics}>
        <span>
          <span className={styles.metricLabel}>{t('machine.rate')}</span>
          <span className={styles.metricValue}>
            {rate} <span className={styles.metricUnit}>{t('machine.perMinute')}</span>
          </span>
        </span>
        <span>
          <span className={styles.metricLabel}>{t('machine.oee')}</span>
          <span className={styles.metricValue}>
            {oee} <span className={styles.metricUnit}>{t('machine.percent')}</span>
          </span>
        </span>
      </span>
    </button>
  );
}
