import {
  findBottleneck,
  useAlarms,
  useLine,
  useLineData,
  useMachines,
  useNavigate,
  useTranslation,
  useValues,
  type LineAlarm,
  type MachineSnapshot,
} from '@iot/module-sdk';
import {
  AlarmItem,
  Button,
  Card,
  CardHeader,
  Chip,
  InfoTile,
  KpiTile,
  LineFlow,
  StateChip,
  type LineFlowMachine,
} from '@iot/ui';
import { useState } from 'react';
import { formatNumber, formatPercent, formatTime, formatValue } from '../format';
import { lineKpis, machineKpis } from '../kpi/kpi';
import { MODULE_ID } from '../module-id';
import { useNow } from '../useNow';
import styles from './OverviewPage.module.css';

type T = ReturnType<typeof useTranslation>['t'];

// Ziele der Deep Links (Modul-IDs, CLAUDE.md Abschnitt 4)
const ALARMS_MODULE = 'alarms';
const SPARES_MODULE = 'spares';
const FORMAT_MODULE = 'format';
const PREDICTION_MODULE = 'predictive-maintenance';

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
  const [selected, setSelected] = useState<string | null>(null);

  if (!data || machines.length === 0) {
    return <Card>{t('waiting')}</Card>;
  }

  const empty = t('noValue');
  const showAllAlarms = () => {
    navigate(ALARMS_MODULE);
  };
  const kpi = lineKpis(data, now);
  const bottleneck = findBottleneck(data, now);
  const current =
    machines.find((m) => m.machineId === selected) ??
    machines.find((m) => m.machineId === bottleneck) ??
    machines[0];

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
        {...(current ? { selectedId: current.machineId } : {})}
        onSelect={setSelected}
      />

      <div className={styles.row}>
        {current && <MachineDetails machine={current} onNavigate={navigate} />}
        <ActiveAlarms
          alarms={alarms}
          machines={machines}
          timeZone={line.timeZone}
          onShowAll={showAllAlarms}
        />
      </div>
    </div>
  );
}

function MachineDetails({
  machine,
  onNavigate,
}: {
  machine: MachineSnapshot;
  onNavigate: ReturnType<typeof useNavigate>;
}) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const lang = i18n.language;
  const values = useValues(machine.machineId);
  const own = machine.identity?.manufacturer === 'own';
  const basic = machine.identity?.conformance === 'basic';
  const notice = qualityNotice(machine, t);
  const params = { machine: machine.machineId };
  const openSpares = () => {
    onNavigate(SPARES_MODULE, params);
  };
  const openFormat = () => {
    onNavigate(FORMAT_MODULE);
  };
  const openPrediction = () => {
    onNavigate(PREDICTION_MODULE, params);
  };

  const entries: { label: string; value: string }[] = [];
  if (basic && machine.state)
    entries.push({ label: t('details.state'), value: machine.state.state });
  if (machine.state?.reason)
    entries.push({ label: t('details.reason'), value: machine.state.reason });
  for (const v of values) {
    const name = (v.name as Record<string, string | undefined>)[lang] ?? v.name.de;
    entries.push({ label: name, value: formatValue(v.value, v.unit, lang) });
  }
  if (machine.counters && !own)
    entries.push({
      label: t('details.goodCount'),
      value: formatNumber(machine.counters.good, lang),
    });
  if (basic) {
    const fault = machine.alarms.some((a) => a.alarmId === 'COMMON-FAULT');
    entries.push({
      label: t('details.commonFault'),
      value: fault ? t('details.yes') : t('details.no'),
    });
  }

  return (
    <Card gap="18" className={styles.wide}>
      <CardHeader
        eyebrow={t('details.eyebrow')}
        title={machine.identity?.type ?? machine.machineId}
        size="detail"
        aside={
          <div className={styles.chips}>
            {machine.state && (
              <StateChip state={machine.state.state} prefix={t('details.packml')} />
            )}
            {notice && <Chip tone={notice.tone}>{notice.label}</Chip>}
          </div>
        }
      />
      <div className={styles.tiles}>
        <InfoTile
          label={t('details.manufacturer')}
          value={own ? t('details.ownMachine') : (machine.identity?.manufacturer ?? t('noValue'))}
          size="sm"
        />
        <InfoTile
          label={t('details.level')}
          value={machine.identity ? t(`level.${machine.identity.conformance}`) : t('noValue')}
          size="sm"
        />
      </div>
      {entries.length > 0 && (
        <dl className={styles.values}>
          {entries.map((e) => (
            <div key={e.label} className={styles.value}>
              <dt className={styles.valueLabel}>{e.label}</dt>
              <dd className={styles.valueText}>{e.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {own ? (
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={openSpares}>
            {t('details.spares')}
          </Button>
          <Button variant="outline" size="sm" onClick={openFormat}>
            {t('details.format')}
          </Button>
          <Button variant="outline" size="sm" onClick={openPrediction}>
            {t('details.prediction')}
          </Button>
        </div>
      ) : (
        <p className={styles.note}>{t('details.foreignNote')}</p>
      )}
    </Card>
  );
}

interface ActiveAlarmsProps {
  alarms: LineAlarm[];
  machines: MachineSnapshot[];
  timeZone: string;
  onShowAll: () => void;
}

function ActiveAlarms({ alarms, machines, timeZone, onShowAll }: ActiveAlarmsProps) {
  const { t, i18n } = useTranslation(MODULE_ID);
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
