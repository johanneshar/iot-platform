import { useUiTranslation } from '../../i18n/translations';
import { cx } from '../../utils/cx';
import { Button } from '../Button/Button';
import { Chip } from '../Chip/Chip';
import { Placeholder } from '../Placeholder/Placeholder';
import styles from './PartCard.module.css';

/** Markierung „in der Anfrageliste“ (kein Text, daher ohne Übersetzung) */
const CHECK_MARK = '✓';

export interface PartCardProps {
  /** Teilenummer, z. B. „ET-10233“ */
  id: string;
  name: string;
  /** Baugruppe, z. B. „Dosierung“ */
  group: string;
  /** Bestand vor Ort; 0 = nicht vorrätig */
  stock: number;
  /** Lieferzeit als Text, z. B. „3 Tage“ oder „—“ */
  leadTime: string;
  /** Teil steht in der Anfrageliste */
  inRequest?: boolean;
  /** Rahmen in Petrol, z. B. Treffer einer exakten Suche */
  highlighted?: boolean;
  /** ohne Angabe kein Button (z. B. ohne Recht spares.request) */
  onToggle?: () => void;
}

/** Ersatzteil im Katalog: Bild, Nummer, Bestand, Lieferzeit und Anfrage (Mockup „Ersatzteilkatalog“). */
export function PartCard({
  id,
  name,
  group,
  stock,
  leadTime,
  inRequest = false,
  highlighted = false,
  onToggle,
}: PartCardProps) {
  const t = useUiTranslation();
  return (
    <article
      aria-label={name}
      className={cx(styles.card, (inRequest || highlighted) && styles.highlighted)}
    >
      <Placeholder label={t('part.image')} size="sm" />
      <div className={styles.meta}>
        {id} · {group}
      </div>
      <div className={styles.name}>{name}</div>
      <div className={styles.row}>
        <Chip tone={stock > 0 ? 'info' : 'warning'}>
          {stock > 0 ? t('part.stock', { count: stock }) : t('part.outOfStock')}
        </Chip>
        <span className={styles.lead}>{t('part.lead', { lead: leadTime })}</span>
      </div>
      {onToggle && (
        <Button
          size="sm"
          variant={inRequest ? 'accent' : 'outline'}
          aria-pressed={inRequest}
          onClick={onToggle}
        >
          {inRequest ? `${CHECK_MARK} ${t('part.added')}` : t('part.add')}
        </Button>
      )}
    </article>
  );
}
