import {
  useAlarms,
  useDeepLinkTargets,
  useLine,
  useMachines,
  useNavigate,
  useTranslation,
  type LocalizedText,
} from '@iot/module-sdk';
import {
  Button,
  Card,
  CardHeader,
  Chip,
  DataTable,
  FilterGroup,
  ProgressBar,
  type ChipTone,
  type DataTableColumn,
  type FilterOption,
} from '@iot/ui';
import { useMemo, useState } from 'react';
import type { AlarmClass, AlarmOccurrence, TopFault } from '../../shared/alarm-history';
import { MODULE_ID } from '../module-id';
import { filterAlarms, mergeAlarms, type AlarmFilter, type AlarmRow } from '../rows';
import { useModuleData } from '../useModuleData';
import styles from './AlarmsPage.module.css';

const TROUBLESHOOTING_MODULE = 'troubleshooting';
const COMMON_FAULT = 'COMMON-FAULT';
// Einsprungpunkt der Fehlersuche: Alarme mit Fehlerbaum
const ALARM_TARGET = 'alarm';
const HISTORY_PATH = 'history?days=1';
const TOP_FAULTS_PATH = 'top-faults?days=7';
const HISTORY_REFRESH_MS = 30_000;
const TOP_FAULTS_REFRESH_MS = 60_000;
const FILTERS: readonly AlarmFilter[] = ['all', 'fault', 'warning', 'info'];
const TONE: Record<AlarmClass, ChipTone> = { fault: 'fault', warning: 'warning', info: 'info' };

const formatTime = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('de-DE', { timeZone, hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );

/** Alarme nach Mockup: Alarmliste mit Filter und Top-Störungen. Quittiert wird nur an der Maschine (E-32). */
export function AlarmsPage() {
  const { t, i18n } = useTranslation(MODULE_ID);
  const line = useLine();
  const machines = useMachines();
  const active = useAlarms();
  const navigate = useNavigate();
  const hasTarget = useDeepLinkTargets();
  const [filter, setFilter] = useState<AlarmFilter>('all');
  const history = useModuleData<AlarmOccurrence[]>(HISTORY_PATH, HISTORY_REFRESH_MS);
  const top = useModuleData<TopFault[]>(TOP_FAULTS_PATH, TOP_FAULTS_REFRESH_MS);

  const machineName = (id: string) =>
    machines.find((m) => m.machineId === id)?.identity?.type ?? id;
  const alarmText = (alarmId: string, text: LocalizedText | null | undefined) =>
    alarmId === COMMON_FAULT
      ? t('commonFault')
      : ((text as Record<string, string | undefined> | null | undefined)?.[i18n.language] ??
        text?.de ??
        alarmId);

  const rows = useMemo(
    () => filterAlarms(mergeAlarms(active, history.data ?? []), filter),
    [active, history.data, filter],
  );
  const options: FilterOption<AlarmFilter>[] = FILTERS.map((f) => ({
    value: f,
    label: t(`filter.${f}`),
  }));

  const status = (r: AlarmRow) => {
    if (r.clearedAt) return t('status.cleared', { time: formatTime(r.clearedAt, line.timeZone) });
    if (r.acknowledged)
      return r.acknowledgedBy
        ? t('status.acknowledgedBy', { user: r.acknowledgedBy })
        : t('status.acknowledged');
    return t('status.active');
  };

  const columns: DataTableColumn<AlarmRow>[] = [
    {
      key: 'time',
      header: t('column.time'),
      cell: (r) => formatTime(r.raisedAt, line.timeZone),
      tone: 'muted',
      nowrap: true,
    },
    { key: 'machine', header: t('column.machine'), cell: (r) => machineName(r.machineId) },
    {
      key: 'text',
      header: t('column.text'),
      cell: (r) => alarmText(r.alarmId, r.text),
      tone: 'strong',
    },
    {
      key: 'class',
      header: t('column.class'),
      cell: (r) => <Chip tone={TONE[r.class]}>{t(`filter.${r.class}`)}</Chip>,
    },
    {
      key: 'action',
      header: t('column.action'),
      cell: (r) => (
        <div className={styles.action}>
          {r.clearedAt === null && hasTarget(TROUBLESHOOTING_MODULE, ALARM_TARGET, r.alarmId) && (
            <Button
              variant="outline"
              size="sm"
              aria-label={t('troubleshootLabel', { text: alarmText(r.alarmId, r.text) })}
              onClick={() => {
                navigate(TROUBLESHOOTING_MODULE, { alarmId: r.alarmId, machine: r.machineId });
              }}
            >
              {t('troubleshoot')}
            </Button>
          )}
          <span className={styles.status}>{status(r)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.row}>
      <Card gap="18" className={styles.wide}>
        <div className={styles.head}>
          <CardHeader title={t('list.title')} subtitle={t('list.subtitle')} />
          <FilterGroup
            label={t('list.filter')}
            options={options}
            value={filter}
            onChange={setFilter}
          />
        </div>
        {history.failed && (
          <p role="status" className={styles.muted}>
            {t('list.historyError')}
          </p>
        )}
        {rows.length === 0 ? (
          <p className={styles.muted}>{t('list.none')}</p>
        ) : (
          <DataTable
            label={t('list.label')}
            columns={columns}
            rows={rows}
            rowKey={(r) => r.key}
            minWidth="md"
          />
        )}
      </Card>
      <Card gap="18" className={styles.narrow}>
        <CardHeader title={t('top.title')} subtitle={t('top.subtitle')} />
        {top.failed && !top.data && (
          <p role="status" className={styles.muted}>
            {t('top.error')}
          </p>
        )}
        {top.data?.length === 0 && <p className={styles.muted}>{t('top.none')}</p>}
        {top.data && top.data.length > 0 && (
          <ul className={styles.faults}>
            {top.data.map((f, index) => {
              const max = top.data?.[0]?.minutes ?? 0;
              const text = alarmText(f.alarmId, f.text);
              return (
                <li key={`${f.machineId}-${f.alarmId}`} className={styles.fault}>
                  <div className={styles.faultHead}>
                    <span className={styles.faultText}>{text}</span>
                    <span className={styles.faultValue}>
                      {t('top.minutes', { value: f.minutes })}
                    </span>
                  </div>
                  <ProgressBar
                    value={max > 0 ? (f.minutes / max) * 100 : 0}
                    label={t('top.bar', { text, value: f.minutes })}
                    tone={index === 0 ? 'fault' : 'secondary'}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
