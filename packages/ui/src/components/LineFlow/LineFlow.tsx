import { Icon } from '../../icons/Icon';
import { useUiTranslation } from '../../i18n/translations';
import { Card, CardHeader } from '../Card/Card';
import { MachineCard, type MachineCardProps } from '../MachineCard/MachineCard';
import styles from './LineFlow.module.css';

export interface LineFlowMachine extends Omit<MachineCardProps, 'selected' | 'onSelect'> {
  id: string;
}

export interface LineFlowProps {
  title: string;
  subtitle?: string;
  machines: readonly LineFlowMachine[];
  selectedId?: string;
  onSelect?: (machineId: string) => void;
}

/** Linienfluss: Maschinen in Reihenfolge der Linie mit Legende eigene/fremde Maschine. */
export function LineFlow({ title, subtitle, machines, selectedId, onSelect }: LineFlowProps) {
  const t = useUiTranslation();
  const legend = (
    <div className={styles.legend}>
      <span className={styles.legendItem}>
        <span className={styles.swatchOwn} aria-hidden="true" />
        {t('lineFlow.legendOwn')}
      </span>
      <span className={styles.legendItem}>
        <span className={styles.swatchForeign} aria-hidden="true" />
        {t('lineFlow.legendForeign')}
      </span>
    </div>
  );

  return (
    <Card gap="20">
      <CardHeader title={title} subtitle={subtitle} aside={legend} />
      <div className={styles.flow}>
        {machines.map(({ id, ...machine }, index) => (
          <div key={id} className={styles.step}>
            <MachineCard
              {...machine}
              selected={id === selectedId}
              onSelect={() => onSelect?.(id)}
            />
            {index < machines.length - 1 && <Icon name="arrow-right" className={styles.arrow} />}
          </div>
        ))}
      </div>
    </Card>
  );
}
