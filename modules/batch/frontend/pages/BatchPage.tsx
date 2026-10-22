import {
  ModuleApiError,
  useAudit,
  useLine,
  useMachines,
  useModuleApi,
  useModuleData,
  usePermission,
  useRequestSignature,
  useTranslation,
  useUser,
} from '@iot/module-sdk';
import {
  Button,
  Card,
  CardHeader,
  Chip,
  DataTable,
  InfoTile,
  ProgressBar,
  StepList,
  SuccessNote,
  type ChipTone,
  type DataTableColumn,
  type Step,
} from '@iot/ui';
import { useState } from 'react';
import type {
  AuditRef,
  BatchDetail,
  BatchStatus,
  BatchSummary,
  PendingLineRelease,
} from '../../shared/batch';
import { MODULE_ID } from '../module-id';
import { useNow } from '../useNow';
import styles from './BatchPage.module.css';

type T = ReturnType<typeof useTranslation>['t'];

// Vorgänge und Bedeutungen wie im Backend (backend/app.ts, STEPS) – Bedeutungen sind Teil des GxP-Datensatzes
const LINE_RELEASE = {
  action: 'batch.line-released',
  meaning: 'Linienfreigabe',
  permission: 'batch.sign',
};
const CLEARANCE_ACTION = 'batch.line-cleared';
const REVIEW = { action: 'batch.report-reviewed', meaning: 'Geprüft', permission: 'batch.review' };
const RELEASE = { action: 'batch.report-released', meaning: 'Freigabe', permission: 'batch.sign' };
const EXPORT_ACTION = 'batch.report-exported';
const REVIEW_PATH = 'review';
const RELEASE_PATH = 'release';
const LINE_RELEASE_REFERENCE = 'batch:line-release';
const PDF_TYPE = 'application/pdf';
const REFRESH_MS = 10_000;

const reference = (batchId: string) => `batch:${batchId}`;
/** Hashes in der Tabelle gekürzt; vollständig in der Berichtskarte und im PDF */
const HASH_PREFIX = 'sha256:';
const short = (value: string) =>
  value.startsWith(HASH_PREFIX) ? `${value.slice(0, HASH_PREFIX.length + 12)}…` : value;

const STATUS_TONE: Record<BatchStatus, ChipTone> = {
  running: 'accent',
  ended: 'warning',
  frozen: 'warning',
  reviewed: 'warning',
  released: 'primary',
};

const formatDateTime = (iso: string | null, timeZone: string, empty: string) =>
  iso === null
    ? empty
    : new Intl.DateTimeFormat('de-DE', {
        timeZone,
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));

const formatNumber = (value: number, language: string) =>
  new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'de-DE').format(value);

function steps(batch: BatchSummary, t: T): Step[] {
  const order: BatchStatus[] = ['running', 'ended', 'frozen', 'reviewed', 'released'];
  const at = order.indexOf(batch.status);
  return [
    { id: 'setup', label: t('steps.setup'), status: 'done' },
    {
      id: 'lineRelease',
      label: t('steps.lineRelease'),
      status: batch.lineRelease ? 'done' : at === 0 ? 'current' : 'upcoming',
    },
    { id: 'production', label: t('steps.production'), status: at === 0 ? 'current' : 'done' },
    {
      id: 'clearance',
      label: t('steps.clearance'),
      status: at === 1 ? 'current' : at > 1 ? 'done' : 'upcoming',
    },
    {
      id: 'report',
      label: t('steps.report'),
      status: at === 4 ? 'done' : at >= 2 ? 'current' : 'upcoming',
    },
  ];
}

/** Batch-Reporting nach Mockup: laufender Batch, Audit Trail, Batchbericht mit Signaturen (M6). */
export function BatchPage() {
  const { t } = useTranslation(MODULE_ID);
  const [chosen, setChosen] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  // nach jedem Schritt Liste und Batch neu laden
  const list = useModuleData<BatchSummary[]>(`batches?v=${String(version)}`, REFRESH_MS);
  const current =
    chosen ?? list.data?.find((b) => b.status === 'running')?.batchId ?? list.data?.[0]?.batchId;
  const detail = useModuleData<BatchDetail>(
    current ? `batches/${encodeURIComponent(current)}?v=${String(version)}` : null,
    REFRESH_MS,
  );
  const refresh = () => {
    setVersion((v) => v + 1);
  };

  if (list.failed && !list.data) return <Card role="alert">{t('loadError')}</Card>;
  if (!list.data) return <Card>{t('loading')}</Card>;
  const running = list.data.some((b) => b.status === 'running');

  return (
    <div className={styles.page}>
      {!running && <NextBatch onChange={refresh} />}
      {detail.data && <BatchCard batch={detail.data} />}
      {detail.data && (
        <div className={styles.row}>
          <AuditCard batch={detail.data} />
          <ReportCard batch={detail.data} onChange={refresh} />
        </div>
      )}
      {list.data.length === 0 && <Card>{t('none')}</Card>}
      {list.data.length > 0 && (
        <BatchList batches={list.data} current={current ?? null} onOpen={setChosen} />
      )}
    </div>
  );
}

function BatchCard({ batch }: { batch: BatchDetail }) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const line = useLine();
  const machines = useMachines();
  const now = useNow();
  const empty = t('noValue');
  // Mengen am Linienende: letzte Maschine des Batches in der Reihenfolge der Linie
  const last = [...batch.counts].sort(
    (a, b) =>
      (machines.find((m) => m.machineId === b.machineId)?.identity?.position ?? 0) -
      (machines.find((m) => m.machineId === a.machineId)?.identity?.position ?? 0),
  )[0];
  const runtimeMs =
    (batch.endedAt ? Date.parse(batch.endedAt) : now.getTime()) - Date.parse(batch.startedAt);
  const minutes = Math.max(0, Math.round(runtimeMs / 60_000));
  // Fortschritt aus Gutteilen am Linienende und Sollmenge der Maschine (S-10)
  const progress =
    batch.targetQuantity && last ? Math.min(100, (last.good / batch.targetQuantity) * 100) : null;
  return (
    <Card gap="20">
      <CardHeader
        eyebrow={batch.status === 'running' ? t('batch.running') : t('batch.selected')}
        title={batch.batchId}
        detail={[
          batch.productName,
          t('batch.recipe', { id: batch.recipe.id, version: batch.recipe.version }),
        ]
          .filter(Boolean)
          .join(' · ')}
        size="detailLg"
        aside={<Chip tone={STATUS_TONE[batch.status]}>{t(`status.${batch.status}`)}</Chip>}
      />
      <div className={styles.tiles}>
        <InfoTile
          label={t('batch.good')}
          value={last ? formatNumber(last.good, i18n.language) : empty}
        />
        <InfoTile
          label={t('batch.bad')}
          value={last ? formatNumber(last.bad, i18n.language) : empty}
        />
        <InfoTile
          label={t('batch.started')}
          value={formatDateTime(batch.startedAt, line.timeZone, empty)}
        />
        {progress === null ? (
          <InfoTile
            label={t('batch.runtime')}
            value={t('batch.minutes', { value: formatNumber(minutes, i18n.language) })}
          />
        ) : (
          <InfoTile
            label={t('batch.progress')}
            value={t('batch.percent', { value: formatNumber(Math.round(progress), i18n.language) })}
          />
        )}
      </div>
      {progress !== null && (
        <ProgressBar
          value={progress}
          size="md"
          label={t('batch.progressLabel', {
            good: formatNumber(last?.good ?? 0, i18n.language),
            target: formatNumber(batch.targetQuantity ?? 0, i18n.language),
          })}
        />
      )}
      <StepList label={t('steps.label')} steps={steps(batch, t)} />
      {batch.lineRelease === null && (
        <p className={styles.warning} role="status">
          <Chip tone="warning">{t('lineRelease.missingChip')}</Chip> {t('lineRelease.missing')}
        </p>
      )}
      {batch.lineRelease?.afterStart && (
        <p className={styles.warning} role="status">
          <Chip tone="warning">{t('lineRelease.lateChip')}</Chip> {t('lineRelease.late')}
        </p>
      )}
      {batch.counts.some((c) => c.implausible > 0) && (
        <p className={styles.warning} role="status">
          <Chip tone="warning">{t('implausibleChip')}</Chip> {t('implausible')}
        </p>
      )}
    </Card>
  );
}

function AuditCard({ batch }: { batch: BatchDetail }) {
  const { t } = useTranslation(MODULE_ID);
  const line = useLine();
  const empty = t('noValue');
  const columns: DataTableColumn<BatchDetail['audit'][number]>[] = [
    {
      key: 'time',
      header: t('audit.time'),
      cell: (r) => formatDateTime(r.ts, line.timeZone, empty),
      tone: 'muted',
      nowrap: true,
    },
    { key: 'user', header: t('audit.user'), cell: (r) => r.userName },
    {
      key: 'action',
      header: t('audit.action'),
      cell: (r) => t(`audit.actions.${r.action.replace('batch.', '')}`, { defaultValue: r.action }),
      tone: 'strong',
    },
    {
      key: 'change',
      header: t('audit.change'),
      cell: (r) =>
        [
          r.meaning ? t('audit.meaning', { meaning: r.meaning }) : null,
          r.oldValue
            ? `${short(r.oldValue)} → ${short(r.newValue ?? empty)}`
            : r.newValue
              ? short(r.newValue)
              : null,
        ]
          .filter(Boolean)
          .join(' · ') || empty,
    },
  ];
  return (
    <Card gap="16" className={styles.wide}>
      <CardHeader title={t('audit.title')} subtitle={t('audit.subtitle')} />
      {batch.audit.length === 0 ? (
        <p className={styles.muted}>{t('audit.none')}</p>
      ) : (
        <DataTable
          label={t('audit.title')}
          columns={columns}
          rows={[...batch.audit].reverse()}
          rowKey={(r) => String(r.seq)}
        />
      )}
    </Card>
  );
}

function signedBy(ref: AuditRef, timeZone: string, t: T) {
  return t('report.signedBy', {
    user: ref.userName,
    meaning: ref.meaning ?? '',
    time: formatDateTime(ref.ts, timeZone, ''),
  });
}

function ReportCard({ batch, onChange }: { batch: BatchDetail; onChange: () => void }) {
  const { t } = useTranslation(MODULE_ID);
  const api = useModuleApi();
  const audit = useAudit();
  const sign = useRequestSignature();
  const user = useUser();
  const line = useLine();
  const canClear = usePermission('batch.clear');
  const canReview = usePermission('batch.review');
  const canRelease = usePermission(RELEASE.permission);
  const canExport = usePermission('batch.export');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = reference(batch.batchId);
  const subject = t('report.subject', { id: batch.batchId });

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      onChange();
    } catch (e) {
      setError(
        e instanceof ModuleApiError && e.status === 403 ? t('report.forbidden') : t('report.error'),
      );
    } finally {
      setBusy(false);
    }
  };

  const clear = () =>
    run(async () => {
      const receipt = await audit.record({
        action: CLEARANCE_ACTION,
        newValue: batch.batchId,
        reference: ref,
      });
      await api.post(`batches/${encodeURIComponent(batch.batchId)}/clearance`, {
        seq: receipt.seq,
      });
    });

  const signReport = (step: typeof REVIEW | typeof RELEASE, path: string) =>
    run(async () => {
      const result = await sign({
        ...step,
        subject,
        newValue: batch.reportHash ?? '',
        reference: ref,
      });
      if (!result) return; // abgebrochen
      await api.post(`batches/${encodeURIComponent(batch.batchId)}/${path}`, { seq: result.seq });
    });

  const exportPdf = () =>
    run(async () => {
      await audit.record({
        action: EXPORT_ACTION,
        newValue: batch.reportHash ?? '',
        reference: ref,
      });
      const response = await fetch(
        api.url(`batches/${encodeURIComponent(batch.batchId)}/report.pdf`),
        {
          credentials: 'same-origin',
        },
      );
      if (!response.ok) throw new ModuleApiError(response.status);
      const blob = new Blob([await response.arrayBuffer()], { type: PDF_TYPE });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = t('report.fileName', { id: batch.batchId });
      link.click();
      URL.revokeObjectURL(link.href);
    });

  const sameReviewer = batch.review?.username === user.username;

  return (
    <Card gap="14" className={styles.narrow}>
      <CardHeader title={t('report.title')} />
      <p className={styles.text}>{t('report.text')}</p>
      {batch.status === 'running' && <p className={styles.muted}>{t('report.afterEnd')}</p>}
      {batch.status === 'ended' &&
        (canClear ? (
          <Button disabled={busy} onClick={() => void clear()}>
            {t('report.clear')}
          </Button>
        ) : (
          <p className={styles.muted}>{t('report.waitClearance')}</p>
        ))}
      {batch.reportHash && (
        <div className={styles.hash}>
          <span className={styles.muted}>{t('report.hash')}</span>
          <code className={styles.code}>{batch.reportHash}</code>
        </div>
      )}
      {batch.review && (
        <SuccessNote title={t('report.reviewed')}>
          {signedBy(batch.review, line.timeZone, t)}
        </SuccessNote>
      )}
      {batch.status === 'frozen' &&
        (canReview ? (
          <Button disabled={busy} onClick={() => void signReport(REVIEW, REVIEW_PATH)}>
            {t('report.review')}
          </Button>
        ) : (
          <p className={styles.muted}>{t('report.waitReview')}</p>
        ))}
      {batch.status === 'reviewed' &&
        (canRelease && !sameReviewer ? (
          <Button disabled={busy} onClick={() => void signReport(RELEASE, RELEASE_PATH)}>
            {t('report.sign')}
          </Button>
        ) : (
          <p className={styles.muted}>
            {sameReviewer ? t('report.fourEyes') : t('report.waitRelease')}
          </p>
        ))}
      {batch.release && (
        <SuccessNote title={t('report.released')}>
          {signedBy(batch.release, line.timeZone, t)}
        </SuccessNote>
      )}
      {batch.reportHash && canExport && (
        <Button variant="outline" disabled={busy} onClick={() => void exportPdf()}>
          {t('report.export')}
        </Button>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}

function NextBatch({ onChange }: { onChange: () => void }) {
  const { t } = useTranslation(MODULE_ID);
  const api = useModuleApi();
  const sign = useRequestSignature();
  const line = useLine();
  const canRelease = usePermission(LINE_RELEASE.permission);
  const pending = useModuleData<PendingLineRelease>('line-release', REFRESH_MS);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const release = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const result = await sign({
        ...LINE_RELEASE,
        subject: t('lineRelease.subject', { line: line.name }),
        newValue: line.name,
        reference: LINE_RELEASE_REFERENCE,
      });
      if (result) await api.post('line-release', { seq: result.seq });
      onChange();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  const given = pending.data?.release ?? null;
  return (
    <Card gap="14">
      <CardHeader title={t('lineRelease.title')} subtitle={t('lineRelease.subtitle')} />
      {given ? (
        <SuccessNote title={t('lineRelease.given')}>
          {signedBy(given, line.timeZone, t)}
        </SuccessNote>
      ) : canRelease ? (
        <div>
          <Button disabled={busy} onClick={() => void release()}>
            {t('lineRelease.sign')}
          </Button>
        </div>
      ) : (
        <p className={styles.muted}>{t('lineRelease.wait')}</p>
      )}
      {failed && (
        <p className={styles.error} role="alert">
          {t('report.error')}
        </p>
      )}
    </Card>
  );
}

function BatchList({
  batches,
  current,
  onOpen,
}: {
  batches: BatchSummary[];
  current: string | null;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation(MODULE_ID);
  const line = useLine();
  const empty = t('noValue');
  const columns: DataTableColumn<BatchSummary>[] = [
    { key: 'id', header: t('list.batch'), cell: (b) => b.batchId, tone: 'strong', nowrap: true },
    {
      key: 'recipe',
      header: t('list.recipe'),
      cell: (b) => t('batch.recipe', { id: b.recipe.id, version: b.recipe.version }),
    },
    {
      key: 'start',
      header: t('list.start'),
      cell: (b) => formatDateTime(b.startedAt, line.timeZone, empty),
      tone: 'muted',
      nowrap: true,
    },
    {
      key: 'end',
      header: t('list.end'),
      cell: (b) => formatDateTime(b.endedAt, line.timeZone, empty),
      tone: 'muted',
      nowrap: true,
    },
    {
      key: 'status',
      header: t('list.status'),
      cell: (b) => <Chip tone={STATUS_TONE[b.status]}>{t(`status.${b.status}`)}</Chip>,
    },
    {
      key: 'open',
      header: t('list.action'),
      cell: (b) =>
        b.batchId === current ? (
          <span className={styles.muted}>{t('list.shown')}</span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            aria-label={t('list.openLabel', { id: b.batchId })}
            onClick={() => {
              onOpen(b.batchId);
            }}
          >
            {t('list.open')}
          </Button>
        ),
    },
  ];
  return (
    <Card gap="16">
      <CardHeader title={t('list.title')} subtitle={t('list.subtitle')} />
      <DataTable
        label={t('list.title')}
        columns={columns}
        rows={batches}
        rowKey={(b) => b.batchId}
        minWidth="lg"
      />
    </Card>
  );
}
