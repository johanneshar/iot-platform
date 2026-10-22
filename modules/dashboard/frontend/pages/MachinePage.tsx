import {
  findBottleneck,
  useAlarms,
  useDeepLinkParams,
  useDeepLinkTargets,
  useLine,
  useLineData,
  useMachines,
  useModuleData,
  useNavigate,
  usePageTitle,
  useTranslation,
  type LocalizedText,
  type MachineSnapshot,
} from '@iot/module-sdk';
import {
  BackLink,
  BarChart,
  Button,
  Card,
  CardHeader,
  Chip,
  DataTable,
  FilterGroup,
  InfoTile,
  KpiTile,
  ProgressBar,
  StateChip,
  StateTimeline,
  ValueTrend,
  type DataTableColumn,
} from '@iot/ui';
import { useState } from 'react';
import type { MachineAnalysis, PeriodOption, Stop } from '../../shared/analysis';
import { durationParts, formatDateTime, formatNumber, formatPercent, formatTime } from '../format';
import { MODULE_ID } from '../module-id';
import { useNow } from '../useNow';
import styles from './MachinePage.module.css';

type T = ReturnType<typeof useTranslation>['t'];

// Ziele der Deep Links (Modul-IDs, CLAUDE.md Abschnitt 4)
const ALARMS_MODULE = 'alarms';
const SPARES_MODULE = 'spares';
const FORMAT_MODULE = 'format';
const PREDICTION_MODULE = 'predictive-maintenance';
const TROUBLESHOOTING_MODULE = 'troubleshooting';
const ALARM_TARGET = 'alarm';
const COMMON_FAULT = 'COMMON-FAULT';
const ANALYSIS_REFRESH_MS = 30_000;
const TICKS = 5;
const HOUR_MS = 3_600_000;

const text = (value: LocalizedText | null | undefined, language: string, fallback: string) =>
  (value as Record<string, string | undefined> | null | undefined)?.[language] ??
  value?.de ??
  fallback;

const duration = (ms: number, t: T) => {
  const d = durationParts(ms);
  return t(`duration.${d.key}`, { h: d.h, m: d.m });
};

const bucketName = (ms: number, t: T) =>
  t(
    ms < HOUR_MS
      ? 'machine.bucket.5min'
      : ms <= HOUR_MS
        ? 'machine.bucket.hour'
        : 'machine.bucket.day',
  );

/** Maschinen-Detailseite nach Mockup „M5a · Maschinendetail“: Auswertungen im gewählten Zeitraum. */
export function MachinePage() {
  const { t } = useTranslation(MODULE_ID);
  const params = useDeepLinkParams();
  const navigate = useNavigate();
  const machines = useMachines();
  const machineId = params['id'] ?? '';
  const machine = machines.find((m) => m.machineId === machineId);
  usePageTitle(machine?.identity?.type ?? null);

  const periods = useModuleData<PeriodOption[]>('periods', 5 * 60_000);
  const [chosen, setChosen] = useState<string | null>(params['period'] ?? null);
  const period = chosen ?? periods.data?.[0]?.id ?? null;
  const analysis = useModuleData<MachineAnalysis>(
    machine && period
      ? `machines/${encodeURIComponent(machineId)}/analysis?period=${encodeURIComponent(period)}`
      : null,
    ANALYSIS_REFRESH_MS,
  );
  const back = () => {
    navigate(MODULE_ID);
  };

  if (machines.length > 0 && !machine) {
    return (
      <div className={styles.page}>
        <BackLink href={`/${MODULE_ID}`} onNavigate={back}>
          {t('machine.back')}
        </BackLink>
        <Card>{t('machine.unknown')}</Card>
      </div>
    );
  }
  if (!machine) return <Card>{t('waiting')}</Card>;

  return (
    <div className={styles.page}>
      <Toolbar
        machine={machine}
        periods={periods.data ?? []}
        period={period}
        onPeriod={setChosen}
        onBack={back}
      />
      {analysis.failed && !analysis.data && <Card role="alert">{t('machine.loadError')}</Card>}
      {!analysis.data && !analysis.failed && <Card>{t('machine.loading')}</Card>}
      {analysis.data && <Analysis machine={machine} analysis={analysis.data} />}
    </div>
  );
}

function Toolbar({
  machine,
  periods,
  period,
  onPeriod,
  onBack,
}: {
  machine: MachineSnapshot;
  periods: PeriodOption[];
  period: string | null;
  onPeriod: (id: string) => void;
  onBack: () => void;
}) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const data = useLineData();
  const now = useNow();
  const own = machine.identity?.manufacturer === 'own';
  const level = machine.identity ? t(`level.${machine.identity.conformance}`) : '';
  const bottleneck = data ? findBottleneck(data, now) === machine.machineId : false;
  return (
    <div className={styles.toolbar}>
      <div className={styles.chips}>
        <BackLink href={`/${MODULE_ID}`} onNavigate={onBack}>
          {t('machine.back')}
        </BackLink>
        <Chip tone={own ? 'primary' : 'neutral'}>
          {own ? t('machine.own') : t('machine.foreign', { level })}
        </Chip>
        {machine.state && <StateChip state={machine.state.state} prefix={t('details.packml')} />}
        {bottleneck && <Chip tone="darkAccent">{t('machine.bottleneck')}</Chip>}
        {machine.quality !== 'good' && (
          <Chip tone={machine.quality === 'bad' ? 'fault' : 'warning'}>
            {t(`quality.${machine.quality}`)}
          </Chip>
        )}
        <span className={styles.source}>
          {[machine.identity?.source, level].filter(Boolean).join(' · ')}
        </span>
      </div>
      {periods.length > 1 && period && (
        <FilterGroup
          label={t('machine.period')}
          options={periods.map((p) => ({ value: p.id, label: text(p.label, i18n.language, p.id) }))}
          value={period}
          onChange={onPeriod}
        />
      )}
    </div>
  );
}

function Analysis({ machine, analysis }: { machine: MachineSnapshot; analysis: MachineAnalysis }) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const lang = i18n.language;
  const line = useLine();
  const data = useLineData();
  const empty = t('noValue');
  const k = analysis.kpis;
  const executeMinutes = k.executeMs / 60_000;
  const rate = executeMinutes > 0 ? k.total / executeMinutes : null;
  const basic = machine.identity?.conformance === 'basic';

  const partial = Date.parse(analysis.observedFrom) > Date.parse(analysis.from) + 60_000;
  return (
    <>
      {partial && (
        <p className={styles.note} role="status">
          {t('machine.observedFrom', {
            time: formatDateTime(analysis.observedFrom, line.timeZone),
          })}
        </p>
      )}
      <div className={styles.kpis}>
        <KpiTile
          variant="main"
          label={t('machine.kpi.oee')}
          value={formatPercent(k.oee, lang, empty)}
          unit={t('kpi.percent')}
          sub={
            data?.oeeTarget == null
              ? t('machine.kpi.noTarget')
              : t('machine.kpi.target', { value: formatNumber(data.oeeTarget, lang) })
          }
        />
        <KpiTile
          label={t('machine.kpi.availability')}
          value={formatPercent(k.availability, lang, empty)}
          unit={t('kpi.percent')}
          sub={t('machine.kpi.executeOf', {
            execute: duration(k.executeMs, t),
            planned: duration(k.plannedMs, t),
          })}
        />
        <KpiTile
          label={t('machine.kpi.performance')}
          value={formatPercent(k.performance, lang, empty)}
          unit={t('kpi.percent')}
          sub={t('machine.kpi.rateOfNominal', {
            rate: rate === null ? empty : formatNumber(rate, lang),
            nominal: k.nominalRate === null ? empty : formatNumber(k.nominalRate, lang),
          })}
        />
        <KpiTile
          label={t('machine.kpi.quality')}
          value={formatPercent(k.quality, lang, empty)}
          unit={t('kpi.percent')}
          sub={t('machine.kpi.reject', {
            value: formatPercent(k.quality === null ? null : 1 - k.quality, lang, empty),
          })}
        />
        <KpiTile
          label={t('machine.kpi.good')}
          value={formatNumber(k.good, lang)}
          unit={t('machine.kpi.goodUnit')}
          sub={t('machine.kpi.badSub', { value: formatNumber(k.bad, lang) })}
        />
      </div>

      <States analysis={analysis} timeZone={line.timeZone} />

      <div className={styles.row}>
        <Card gap="12" className={styles.half}>
          <CardHeader
            title={t('machine.rate.title')}
            subtitle={t('machine.rate.subtitle', { bucket: bucketName(analysis.bucketMs, t) })}
          />
          <BarChart
            label={t('machine.rate.label', { bucket: bucketName(analysis.bucketMs, t) })}
            bars={analysis.buckets.map((b) => ({
              label: axisLabel(b.start, analysis.bucketMs, line.timeZone),
              value: b.rate,
              display: b.rate === null ? empty : formatNumber(b.rate, lang),
            }))}
            {...(k.nominalRate === null
              ? {}
              : {
                  reference: {
                    value: k.nominalRate,
                    label: t('machine.rate.nominal', { value: formatNumber(k.nominalRate, lang) }),
                  },
                })}
          />
        </Card>
        <Card gap="12" className={styles.half}>
          <CardHeader
            title={t('machine.reject.title')}
            subtitle={t('machine.reject.subtitle', { bucket: bucketName(analysis.bucketMs, t) })}
          />
          <BarChart
            tone="secondary"
            label={t('machine.reject.label', { bucket: bucketName(analysis.bucketMs, t) })}
            bars={analysis.buckets.map((b) => ({
              label: axisLabel(b.start, analysis.bucketMs, line.timeZone),
              value: b.rejectShare === null ? null : b.rejectShare * 100,
              display: formatPercent(b.rejectShare, lang, empty),
            }))}
          />
        </Card>
      </div>

      {analysis.values.length > 0 && <Values analysis={analysis} />}

      <div className={styles.row}>
        <MachineAlarms machine={machine} analysis={analysis} />
        <More machine={machine} />
      </div>
      {basic && <p className={styles.note}>{t('machine.basicNote')}</p>}
    </>
  );
}

/** Achsenbeschriftung: Uhrzeit, bei Tagesabschnitten das Datum. */
function axisLabel(iso: string, bucketMs: number, timeZone: string) {
  return bucketMs > HOUR_MS ? formatDateTime(iso, timeZone).slice(0, 6) : formatTime(iso, timeZone);
}

function States({ analysis, timeZone }: { analysis: MachineAnalysis; timeZone: string }) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const lang = i18n.language;
  const from = Date.parse(analysis.from);
  const to = Date.parse(analysis.to);
  const long = to - from > 24 * HOUR_MS;
  const fmt = (iso: string) => (long ? formatDateTime(iso, timeZone) : formatTime(iso, timeZone));
  const ticks = Array.from({ length: TICKS }, (_, i) =>
    fmt(new Date(from + ((to - from) * i) / (TICKS - 1)).toISOString()),
  );
  const columns: DataTableColumn<Stop>[] = [
    {
      key: 'start',
      header: t('machine.states.col.start'),
      cell: (s) => fmt(s.start),
      tone: 'muted',
      nowrap: true,
    },
    {
      key: 'duration',
      header: t('machine.states.col.duration'),
      cell: (s) => duration(s.durationMs, t),
      tone: 'strong',
      nowrap: true,
    },
    {
      key: 'state',
      header: t('machine.states.col.state'),
      cell: (s) => <StateChip state={s.state} />,
    },
    {
      key: 'reason',
      header: t('machine.states.col.reason'),
      cell: (s) => s.reason ?? t('noValue'),
    },
    {
      key: 'alarm',
      header: t('machine.states.col.alarm'),
      cell: (s) => (s.alarm ? alarmText(s.alarm.alarmId, s.alarm.text, lang, t) : t('noValue')),
    },
  ];
  const totals = Object.entries(analysis.stateTotals).sort((a, b) => b[1] - a[1]);
  return (
    <Card gap="16">
      <div className={styles.head}>
        <CardHeader
          title={t('machine.states.title')}
          subtitle={t('machine.states.subtitle', {
            from: fmt(analysis.from),
            to: fmt(analysis.to),
          })}
        />
        <ul className={styles.totals}>
          {totals.map(([state, ms]) => (
            <li key={state}>
              <strong className={styles.strong}>{duration(ms, t)}</strong> {state}
            </li>
          ))}
        </ul>
      </div>
      <StateTimeline
        label={t('machine.states.label', { from: fmt(analysis.from), to: fmt(analysis.to) })}
        ticks={ticks}
        segments={analysis.segments.map((s) => {
          const ms = Date.parse(s.end) - Date.parse(s.start);
          return {
            state: s.state,
            duration: ms,
            description: [
              t('machine.states.segment', {
                state: s.state,
                time: fmt(s.start),
                duration: duration(ms, t),
              }),
              s.reason,
            ]
              .filter(Boolean)
              .join(' · '),
          };
        })}
      />
      <h3 className={styles.subTitle}>{t('machine.states.stops')}</h3>
      {analysis.stops.length === 0 ? (
        <p className={styles.muted}>{t('machine.states.noStops')}</p>
      ) : (
        <DataTable
          label={t('machine.states.stops')}
          columns={columns}
          rows={analysis.stops}
          rowKey={(s) => s.start}
        />
      )}
    </Card>
  );
}

function alarmText(alarmId: string, value: LocalizedText | null, language: string, t: T) {
  return alarmId === COMMON_FAULT ? t('alarms.commonFault') : text(value, language, alarmId);
}

function Values({ analysis }: { analysis: MachineAnalysis }) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const lang = i18n.language;
  const empty = t('noValue');
  const digits = (v: number) => Math.min(3, (String(v).split('.')[1] ?? '').length);
  const fmt = (v: number | null, d: number) => (v === null ? empty : formatNumber(v, lang, d));
  return (
    <Card gap="16">
      <CardHeader title={t('machine.values.title')} subtitle={t('machine.values.subtitle')} />
      <div className={styles.values}>
        {analysis.values.map((v) => {
          const d = Math.max(digits(v.last ?? 0), digits(v.min ?? 0), digits(v.max ?? 0));
          const name = text(v.name, lang, v.key);
          const out =
            v.last !== null &&
            ((v.min !== null && v.last < v.min) || (v.max !== null && v.last > v.max));
          const summary = [
            t('machine.values.summary', { avg: fmt(v.avg, d), unit: v.unit }),
            v.min !== null && v.max !== null
              ? t('machine.values.limits', { min: fmt(v.min, d), max: fmt(v.max, d) })
              : null,
            out ? t('machine.values.outOfLimits') : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <ValueTrend
              key={v.key}
              name={name}
              value={fmt(v.last, d)}
              unit={v.unit}
              points={v.points.map((p) => p.avg)}
              min={v.min}
              max={v.max}
              outOfLimits={out}
              summary={summary}
              label={`${t('machine.values.trend', { name })}: ${summary}`}
              {...(v.gxp
                ? {
                    badge: (
                      <Chip tone="dark" size="sm">
                        {t('machine.values.gxp')}
                      </Chip>
                    ),
                  }
                : {})}
            />
          );
        })}
      </div>
    </Card>
  );
}

function MachineAlarms({
  machine,
  analysis,
}: {
  machine: MachineSnapshot;
  analysis: MachineAnalysis;
}) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const lang = i18n.language;
  const navigate = useNavigate();
  const hasTarget = useDeepLinkTargets();
  const active = useAlarms().filter((a) => a.machineId === machine.machineId);
  const max = analysis.alarms.top[0]?.durationMs ?? 0;
  const withTree = active.filter((a) => hasTarget(TROUBLESHOOTING_MODULE, ALARM_TARGET, a.alarmId));
  return (
    <Card gap="14" className={styles.half}>
      <CardHeader
        title={t('machine.alarms.title')}
        aside={<Chip>{t('machine.alarms.active', { count: active.length })}</Chip>}
      />
      <div className={styles.tiles}>
        <InfoTile
          label={t('machine.alarms.count')}
          value={formatNumber(analysis.alarms.count, lang)}
          size="sm"
        />
        <InfoTile
          label={t('machine.alarms.faults')}
          value={formatNumber(analysis.alarms.faults, lang)}
          size="sm"
        />
        <InfoTile
          label={t('machine.alarms.downtime')}
          value={duration(analysis.alarms.faultDowntimeMs, t)}
          size="sm"
        />
      </div>
      {analysis.alarms.top.length === 0 ? (
        <p className={styles.muted}>{t('machine.alarms.none')}</p>
      ) : (
        <ul className={styles.faults}>
          {analysis.alarms.top.map((a, index) => {
            const label = alarmText(a.alarmId, a.text, lang, t);
            return (
              <li key={a.alarmId} className={styles.fault}>
                <div className={styles.faultHead}>
                  <span>{label}</span>
                  <span className={styles.strong}>
                    {t('machine.alarms.top', {
                      duration: duration(a.durationMs, t),
                      count: a.count,
                    })}
                  </span>
                </div>
                <ProgressBar
                  value={max > 0 ? (a.durationMs / max) * 100 : 0}
                  label={t('machine.alarms.bar', {
                    text: label,
                    duration: duration(a.durationMs, t),
                  })}
                  tone={index === 0 && a.class === 'fault' ? 'fault' : 'secondary'}
                />
              </li>
            );
          })}
        </ul>
      )}
      <div className={styles.actions}>
        {withTree.map((a) => (
          <Button
            key={a.alarmId}
            variant="outline"
            size="sm"
            onClick={() => {
              navigate(TROUBLESHOOTING_MODULE, { alarmId: a.alarmId, machine: a.machineId });
            }}
          >
            {t('machine.alarms.troubleshoot', {
              text: alarmText(a.alarmId, a.text ?? null, lang, t),
            })}
          </Button>
        ))}
        <a
          href={`/${ALARMS_MODULE}`}
          className={styles.link}
          onClick={(event) => {
            event.preventDefault();
            navigate(ALARMS_MODULE);
          }}
        >
          {t('machine.alarms.all')}
        </a>
      </div>
    </Card>
  );
}

function More({ machine }: { machine: MachineSnapshot }) {
  const { t } = useTranslation(MODULE_ID);
  const navigate = useNavigate();
  const own = machine.identity?.manufacturer === 'own';
  const params = { machine: machine.machineId };
  return (
    <Card gap="14" className={styles.half}>
      <CardHeader
        title={t('machine.more.title')}
        subtitle={own ? t('machine.more.subtitle') : null}
      />
      {own ? (
        <div className={styles.actions}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigate(SPARES_MODULE, params);
            }}
          >
            {t('details.spares')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigate(FORMAT_MODULE);
            }}
          >
            {t('details.format')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigate(PREDICTION_MODULE, params);
            }}
          >
            {t('details.prediction')}
          </Button>
        </div>
      ) : (
        <p className={styles.muted}>{t('machine.more.foreign')}</p>
      )}
    </Card>
  );
}
