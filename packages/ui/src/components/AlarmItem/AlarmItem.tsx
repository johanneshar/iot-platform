import type { ReactNode } from 'react';
import { useUiTranslation } from '../../i18n/translations';
import { cx } from '../../utils/cx';
import utils from '../../styles/utils.module.css';
import styles from './AlarmItem.module.css';

export type AlarmSeverity = 'fault' | 'warning' | 'info';

export interface AlarmItemProps {
  severity: AlarmSeverity;
  text: string;
  /** z. B. „Füll- und Verschließmaschine · 13:48“ */
  meta: string;
  /** z. B. Button „Fehlersuche starten“ */
  action?: ReactNode;
}

/** Eintrag in der Liste anstehender Alarme. */
export function AlarmItem({ severity, text, meta, action }: AlarmItemProps) {
  const t = useUiTranslation();
  return (
    <div className={styles.item}>
      <span className={cx(styles.dot, styles[severity])} aria-hidden="true" />
      <div className={styles.body}>
        <div className={styles.text}>
          <span className={utils.srOnly}>{t(`alarm.severity.${severity}`)}: </span>
          {text}
        </div>
        <div className={styles.meta}>{meta}</div>
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </div>
  );
}
