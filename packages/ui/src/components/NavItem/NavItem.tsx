import { Icon, type IconName } from '../../icons/Icon';
import { useUiTranslation } from '../../i18n/translations';
import { cx } from '../../utils/cx';
import { Chip } from '../Chip/Chip';
import styles from './NavItem.module.css';

export interface NavItemProps {
  icon: IconName;
  label: string;
  active?: boolean;
  /** Modul nicht gebucht: Schloss und gedämpfte Schrift */
  locked?: boolean;
  /** Zähler rechts, z. B. aktive Alarme; `null` blendet ihn aus */
  badge?: string | number | null;
  /** accent: Mint (Hinweis) · subtle: halbtransparent (Info, z. B. „11/14“) */
  badgeTone?: 'accent' | 'subtle';
  onClick?: () => void;
}

/** Eintrag der Seitenleiste. */
export function NavItem({
  icon,
  label,
  active = false,
  locked = false,
  badge = null,
  badgeTone = 'accent',
  onClick,
}: NavItemProps) {
  const t = useUiTranslation();
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={cx(styles.item, active ? styles.active : locked ? styles.locked : styles.idle)}
    >
      <Icon name={icon} />
      <span className={styles.label}>{label}</span>
      {badge !== null && (
        // Halbtransparent auf Petrol unterschreitet 4,5:1 – im aktiven Eintrag daher dunkel (O-13)
        <Chip
          tone={badgeTone === 'accent' ? 'accent' : active ? 'dark' : 'translucent'}
          size="badge"
        >
          {badge}
        </Chip>
      )}
      {locked && <Icon name="lock" size="sm" label={t('nav.locked')} />}
    </button>
  );
}
