import { Icon } from '../../icons/Icon';
import { useUiTranslation } from '../../i18n/translations';
import { cx } from '../../utils/cx';
import { Button } from '../Button/Button';
import { Chip } from '../Chip/Chip';
import styles from './ModuleCard.module.css';

export interface ModuleCardProps {
  name: string;
  description: string;
  /** Kategorie als Text, z. B. „Produktion“ */
  categoryLabel: string;
  /** Kernmodul: immer enthalten, nicht abbestellbar */
  core?: boolean;
  gxp?: boolean;
  booked: boolean;
  /** Buchen/Abbestellen nur für den Admin des Kunden */
  canToggle?: boolean;
  onToggle?: () => void;
  /** Öffnen-Button, wenn das Modul gebucht ist und eine Seite hat */
  onOpen?: () => void;
}

/** Kachel eines Moduls im Baukasten. */
export function ModuleCard({
  name,
  description,
  categoryLabel,
  core = false,
  gxp = false,
  booked,
  canToggle = true,
  onToggle,
  onOpen,
}: ModuleCardProps) {
  const t = useUiTranslation();
  return (
    <section className={cx(styles.card, booked && styles.booked)}>
      <div className={styles.chips}>
        <Chip tone={core ? 'primary' : 'neutral'}>{categoryLabel}</Chip>
        {gxp && <Chip tone="dark">{t('module.gxp')}</Chip>}
      </div>
      <h3 className={styles.name}>{name}</h3>
      <div className={styles.description}>{description}</div>
      {core ? (
        <div className={styles.included}>
          <Icon name="check" size="sm" className={styles.check} />
          {t('module.alwaysIncluded')}
        </div>
      ) : (
        <div className={styles.actions}>
          <Button
            variant={booked ? 'accent' : 'outline'}
            aria-pressed={booked}
            disabled={!canToggle}
            onClick={onToggle}
          >
            {booked ? t('module.deactivate') : t('module.book')}
          </Button>
          {booked && onOpen && (
            <Button variant="outline" onClick={onOpen}>
              {t('module.open')}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
