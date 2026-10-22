import {
  findBottleneck,
  useAlarms,
  useDeepLinkTargets,
  useLine,
  useLineData,
  useMachines,
  useNavigate,
  useTranslation,
  type LineAlarm,
  type MachineSnapshot,
} from '@iot/module-sdk';
import {
  AlarmItem,
  Button,
  Card,
  CardHeader,
  Chip,
  KpiTile,
  LineFlow,
  type LineFlowMachine,
} from '@iot/ui';
import { formatNumber, formatPercent, formatTime } from '../format';
import { lineKpis, machineKpis } from '../kpi/kpi';
import { MODULE_ID } from '../module-id';
import { useNow } from '../useNow';
import styles from './OverviewPage.module.css';

type T = ReturnType<typeof useTranslation>['t'];

// Ziele der Deep Links (Modul-IDs, CLAUDE.md Abschnitt 4)
const ALARMS_MODULE = 'alarms';
const MACHINE_PATH = 'machine';
const TROUBLESHOOTING_MODULE = 'troubleshooting';
// Einsprungpunkt der Fehlersuche: Alarme mit Fehlerbaum
const ALARM_TARGET = 'alarm';

const qualityNotice = (machine: MachineSnapshot, t: T): LineFlowMachine['notice'] =>
  machine.quality === 'good'
    ? undefined
    : {
        tone: machine.quality === 'bad' ? 'fault' : 'warning',
        label: t(`quality.${machine.quality}`),
      };

/** Linienübersicht nach Mockup: KPI-Reihe, Linienfluss, Maschinendetails, anstehende Alarme. */
export function OverviewPage() {
  const { t, i18n } = useTranslation(MODULE_ID);
  const lang = i18n.language;
  const line = useLine();
  const data = useLineData();
  const machines = useMachines();
  const alarms = useAlarms();
  const navigate = useNavigate();
  const now = useNow();

  if (!data || machines.length === 0) {
    return <Card>{t('waiting')}</Card>;
  }

  const empty = t('noValue');
  const showAllAlarms = () => {
    navigate(ALARMS_MODULE);
  };
  const kpi = lineKpis(data, now);
  const bottleneck = findBottleneck(data, now);
  // Antippen öffnet die Detailseite der Maschine (E-38)
  const openMachine = (id: string) => {
    navigate(MODULE_ID, { id }, MACHINE_PATH);
  };

  const flow: LineFlowMachine[] = machines.map((m) => {
    const k = machineKpis(m, now);
    const notice = qualityNotice(m, t);
    return {
      id: m.machineId,
      name: m.identity?.type ?? m.machineId,
      kind: m.identity?.manufacturer === 'own' ? 'own' : 'foreign',
      levelLabel: m.identity ? t(`level.${m.identity.conformance}`) : '',
      state: m.state?.state ?? 'Idle',
      rate: k.rate === null ? empty : formatNumber(k.rate, lang),
      oee: formatPercent(k.oee, lang, empty),
      bottleneck: m.machineId === bottleneck,
      ...(notice ? { notice } : {}),
    };
  });

  return (
    <div className={styles.page}>
      <div className={styles.kpis}>
        <KpiTile
          variant="main"
          label={t('kpi.oee')}
          value={formatPercent(kpi.oee, lang, empty)}
          unit={t('kpi.percent')}
          sub={
            data.oeeTarget === null
              ? t('kpi.noTarget')
              : t('kpi.target', { value: formatNumber(data.oeeTarget, lang) })
          }
        />
        <KpiTile
          label={t('kpi.availability')}
          value={formatPercent(kpi.availability, lang, empty)}
          unit={t('kpi.percent')}
          sub={
            data.shift
              ? t('kpi.shiftSince', { time: formatTime(data.shift.start, line.timeZone) })
              : t('kpi.noShift')
          }
        />
        <KpiTile
          label={t('kpi.performance')}
          value={formatPercent(kpi.performance, lang, empty)}
          unit={t('kpi.percent')}
          sub={t('kpi.rateOfNominal', {
            rate: kpi.rate === null ? empty : formatNumber(kpi.rate, lang),
            nominal: kpi.nominalRate === null ? empty : formatNumber(kpi.nominalRate, lang),
          })}
        />
        <KpiTile
          label={t('kpi.quality')}
          value={formatPercent(kpi.quality, lang, empty)}
          unit={t('kpi.percent')}
          sub={t('kpi.reject', { value: formatPercent(kpi.rejectShare, lang, empty) })}
        />
        <KpiTile
          label={t('kpi.output')}
          value={kpi.goodPerHour === null ? empty : formatNumber(kpi.goodPerHour, lang)}
          unit={t('kpi.outputUnit')}
          sub={t('kpi.outputSub')}
        />
      </div>

      <LineFlow
        title={t('flow.title')}
        subtitle={t('flow.subtitle')}
        machines={flow}
        onSelect={openMachine}
      />

      <div className={styles.row}>
        <ActiveAlarms
          alarms={alarms}
          machines={machines}
          timeZone={line.timeZone}
          onShowAll={showAllAlarms}
          onNavigate={navigate}
        />
      </div>
    </div>
  );
}

interface ActiveAlarmsProps {
  alarms: LineAlarm[];
  machines: MachineSnapshot[];
  timeZone: string;
  onShowAll: () => void;
  onNavigate: ReturnType<typeof useNavigate>;
}

function ActiveAlarms({ alarms, machines, timeZone, onShowAll, onNavigate }: ActiveAlarmsProps) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const hasTarget = useDeepLinkTargets();
  const name = (id: string) => machines.find((m) => m.machineId === id)?.identity?.type ?? id;
  const text = (a: LineAlarm) =>
    a.alarmId === 'COMMON-FAULT'
      ? t('alarms.commonFault')
      : ((a.text as Record<string, string | undefined> | undefined)?.[i18n.language] ??
        a.text?.de ??
        a.alarmId);

  return (
    <Card gap="6" className={styles.narrow}>
      <div className={styles.alarmHead}>
        <CardHeader
          title={t('alarms.title')}
          aside={<Chip>{t('alarms.active', { count: alarms.length })}</Chip>}
        />
      </div>
      {alarms.length === 0 && <p className={styles.empty}>{t('alarms.none')}</p>}
      {alarms.map((a) => (
        <AlarmItem
          key={`${a.machineId}-${a.alarmId}`}
          severity={a.class}
          text={text(a)}
          meta={`${name(a.machineId)} · ${formatTime(a.raisedAt, timeZone)}`}
          {...(hasTarget(TROUBLESHOOTING_MODULE, ALARM_TARGET, a.alarmId)
            ? {
                action: (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t('alarms.troubleshootLabel', { text: text(a) })}
                    onClick={() => {
                      onNavigate(TROUBLESHOOTING_MODULE, {
                        alarmId: a.alarmId,
                        machine: a.machineId,
                      });
                    }}
                  >
                    {t('alarms.troubleshoot')}
                  </Button>
                ),
              }
            : {})}
        />
      ))}
      <a
        href="/alarms"
        className={styles.link}
        onClick={(event) => {
          event.preventDefault();
          onShowAll();
        }}
      >
        {t('alarms.all')}
      </a>
    </Card>
  );
}
