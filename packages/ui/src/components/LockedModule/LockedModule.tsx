import { Icon } from '../../icons/Icon';
import { useUiTranslation } from '../../i18n/translations';
import { Button } from '../Button/Button';
import styles from './LockedModule.module.css';

export interface LockedModuleProps {
  /** Name des Moduls aus dem Manifest */
  moduleName: string;
  /** Beschreibung aus dem Manifest, ohne Schlusspunkt */
  description: string;
  /** Nur für den Admin des Kunden; ohne Handler erscheint der Button nicht */
  onActivate?: () => void;
  onOpenCatalog: () => void;
}

/** Sperrbildschirm für ein Modul, das auf dieser Linie nicht gebucht ist. */
export function LockedModule({
  moduleName,
  description,
  onActivate,
  onOpenCatalog,
}: LockedModuleProps) {
  const t = useUiTranslation();
  return (
    <section className={styles.locked}>
      <div className={styles.iconBox}>
        <Icon name="lock" size="xl" strokeWidth={1.8} className={styles.icon} />
      </div>
      <h2 className={styles.title}>{t('locked.title', { name: moduleName })}</h2>
      <p className={styles.text}>{t('locked.text', { description })}</p>
      <div className={styles.actions}>
        {onActivate && <Button onClick={onActivate}>{t('locked.activate')}</Button>}
        <Button variant="outline" onClick={onOpenCatalog}>
          {t('locked.toCatalog')}
        </Button>
      </div>
    </section>
  );
}
