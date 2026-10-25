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
  type MachineSnapshot,
} from '@iot/module-sdk';
import {
  Button,
  Card,
  CardHeader,
  Chip,
  ChoiceButton,
  DataTable,
  InfoTile,
  Placeholder,
  ProgressBar,
  ScanInput,
  StepList,
  SuccessNote,
  type DataTableColumn,
  type ScanSource,
  type Step,
} from '@iot/ui';
import { useState, type ChangeEvent } from 'react';
import {
  ACTIONS,
  procedureReference,
  progress,
  reference,
  scanMatches,
  stepAuditValue,
  type AuditRef,
  type Change,
  type FormatState,
  type ProcedureStep,
  type ProcedureSummary,
  type StepScans,
  type Text,
} from '../../shared/format';
import { MODULE_ID } from '../module-id';
import styles from './FormatPage.module.css';

type T = ReturnType<typeof useTranslation>['t'];

const REFRESH_MS = 5_000;
const CHECK_MARK = '✓';
const MINUTE_MS = 60_000;
const PERFORM_PATH = 'perform';
const RELEASE_PATH = 'release';

const localized = (text: Text, language: string) => text[language] ?? text.de;

const formatTime = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('de-DE', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

const signedBy = (ref: AuditRef, timeZone: string, t: T) =>
  t('signedBy', { user: ref.userName, time: formatTime(ref.ts, timeZone) });

/** Dauer in Minuten vom Start bis zur Signatur „Durchgeführt“ */
export const durationMinutes = (change: Change): number | null =>
  change.performed
    ? Math.max(
        1,
        Math.round((Date.parse(change.performed.ts) - Date.parse(change.startedAt)) / MINUTE_MS),
      )
    : null;

/** Schrittliste: erledigt bis zum aktuellen Schritt */
export function stepStatus(change: Change): Step['status'][] {
  const done = change.steps.length;
  return change.procedure.steps.map((_, i) =>
    i < done ? 'done' : i === done ? 'current' : 'upcoming',
  );
}

const machineName = (step: ProcedureStep, machines: readonly MachineSnapshot[], t: T) =>
  step.machine === null
    ? t('line')
    : (machines.find((m) => m.machineId === step.machine)?.identity?.type ?? step.machine);

/** Geführter Formatwechsel nach Mockup: Zielformat, Schritte mit Formatteil-Scan, zwei Signaturen (M7). */
export function FormatPage() {
  const { t } = useTranslation(MODULE_ID);
  const [version, setVersion] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const state = useModuleData<FormatState>(`state?v=${String(version)}`, REFRESH_MS);
  const refresh = () => {
    setVersion((v) => v + 1);
  };
  const canConfigure = usePermission(ACTIONS.imported.permission);

  if (state.failed && !state.data) return <Card role="alert">{t('loadError')}</Card>;
  if (!state.data) return <Card>{t('loading')}</Card>;
  const data = state.data;
  const finished = data.last && data.last.id !== dismissed && !data.change ? data.last : null;
  const shown = data.change ?? finished;

  return (
    <div className={styles.page}>
      {shown ? (
        <ChangeView
          change={shown}
          state={data}
          onChange={refresh}
          onDismiss={() => {
            setDismissed(shown.id);
          }}
        />
      ) : (
        <ChooseCard state={data} onChange={refresh} />
      )}
      {canConfigure && <ProceduresCard procedures={data.procedures} onChange={refresh} />}
    </div>
  );
}

function ChooseCard({ state, onChange }: { state: FormatState; onChange: () => void }) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const api = useModuleApi();
  const audit = useAudit();
  const canExecute = usePermission(ACTIONS.started.permission);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (target: ProcedureSummary) => {
    setBusy(true);
    setError(null);
    try {
      const change = await api.post<Change>('changes', { procedureId: target.id });
      await audit.record({
        action: ACTIONS.started.action,
        newValue: `${target.id} v${String(target.version)}`,
        reference: reference(change.id),
      });
      onChange();
    } catch {
      setError(t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="lg" gap="18" className={styles.choose}>
      <CardHeader
        eyebrow={t('choose.current')}
        title={state.current ? localized(state.current.format, i18n.language) : t('choose.unknown')}
        size="detailLg"
      />
      <p className={styles.text}>{t('choose.text')}</p>
      {state.targets.length === 0 && (
        <p className={styles.muted}>{state.current ? t('choose.none') : t('choose.noRecipe')}</p>
      )}
      <div className={styles.targets}>
        {state.targets.map((target) => (
          <ChoiceButton
            key={target.id}
            variant="card"
            title={localized(target.to.format, i18n.language)}
            subtitle={t('choose.subtitle', {
              count: target.stepCount,
              minutes: target.plannedMinutes,
            })}
            disabled={!canExecute || busy}
            onClick={() => void start(target)}
          />
        ))}
      </div>
      {!canExecute && state.targets.length > 0 && (
        <p className={styles.muted}>{t('choose.noPermission')}</p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </Card>
  );
}

function ChangeView({
  change,
  state,
  onChange,
  onDismiss,
}: {
  change: Change;
  state: FormatState;
  onChange: () => void;
  onDismiss: () => void;
}) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const api = useModuleApi();
  const audit = useAudit();
  const machines = useMachines();
  const canExecute = usePermission(ACTIONS.cancel.permission);
  const [error, setError] = useState<string | null>(null);
  const statuses = stepStatus(change);
  const current = change.procedure.steps[change.steps.length];
  const from = localized(change.procedure.from.format, i18n.language);
  const to = localized(change.procedure.to.format, i18n.language);
  const open = change.status === 'running' || change.status === 'performed';

  const cancel = async () => {
    setError(null);
    try {
      const receipt = await audit.record({
        action: ACTIONS.cancel.action,
        newValue: change.id,
        reference: reference(change.id),
      });
      await api.post(`changes/${change.id}/cancel`, { seq: receipt.seq });
      onChange();
    } catch {
      setError(t('error'));
    }
  };

  return (
    <>
      <Card padding="bar" className={styles.bar}>
        <div className={styles.barTitle}>
          <span className={styles.muted}>{t('change.title', { id: change.id })}</span>
          <strong className={styles.route}>
            {from} → {to}
          </strong>
        </div>
        <div className={styles.progress}>
          <div className={styles.progressText}>
            <span>
              {t('change.done', {
                done: change.steps.length,
                total: change.procedure.steps.length,
              })}
            </span>
            <strong>{t('percent', { value: progress(change) })}</strong>
          </div>
          <ProgressBar value={progress(change)} label={t('change.progress')} size="md" />
        </div>
        {open && canExecute && (
          <Button variant="outline" size="sm" onClick={() => void cancel()}>
            {t('change.cancel')}
          </Button>
        )}
      </Card>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.row}>
        <Card padding="xs" className={styles.steps}>
          <StepList
            variant="list"
            label={t('change.steps')}
            steps={change.procedure.steps.map((step, i) => ({
              id: step.id,
              label: localized(step.title, i18n.language),
              detail: machineName(step, machines, t),
              status: statuses[i] ?? 'upcoming',
            }))}
          />
        </Card>
        <Card padding="lg" gap="16" className={styles.detail}>
          {current && change.status === 'running' ? (
            <StepDetail
              key={current.id}
              change={change}
              step={current}
              line={state.line}
              target={to}
              onChange={onChange}
            />
          ) : (
            <Completion change={change} target={to} onChange={onChange} onDismiss={onDismiss} />
          )}
        </Card>
      </div>
    </>
  );
}

interface Scan {
  code: string;
  source: ScanSource;
}

function StepDetail({
  change,
  step,
  line,
  target,
  onChange,
}: {
  change: Change;
  step: ProcedureStep;
  line: FormatState['line'];
  target: string;
  onChange: () => void;
}) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const api = useModuleApi();
  const audit = useAudit();
  const machines = useMachines();
  const canExecute = usePermission(ACTIONS.step.permission);
  const [part, setPart] = useState<Scan | null>(null);
  const [slot, setSlot] = useState<Scan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const index = change.steps.length;
  const machine = step.machine ? machines.find((m) => m.machineId === step.machine) : null;
  const identity = machine?.identity ?? null;
  const foreign = identity !== null && identity.manufacturer !== 'own';

  const scans: StepScans | null =
    step.part && part && slot
      ? {
          part: part.code,
          slot: slot.code,
          // manuell, sobald einer der beiden Codes von Hand eingegeben wurde
          source: part.source === 'scanner' && slot.source === 'scanner' ? 'scanner' : 'manual',
        }
      : null;
  const scanned = scanMatches(step, scans);
  const stopped = step.check !== 'line-stopped' || line.stopped;
  const ready = scanned && stopped && canExecute && !busy;

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      onChange();
    } catch (e) {
      setError(e instanceof ModuleApiError && e.status === 409 ? t('step.conflict') : t('error'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = () =>
    run(async () => {
      const receipt = await audit.record({
        action: ACTIONS.step.action,
        newValue: stepAuditValue(step, scans),
        reference: reference(change.id),
      });
      await api.post(`changes/${change.id}/steps`, { stepId: step.id, scans, seq: receipt.seq });
    });

  const back = () =>
    run(async () => {
      const last = change.steps.at(-1);
      if (!last) return;
      const receipt = await audit.record({
        action: ACTIONS.revert.action,
        newValue: last.stepId,
        reference: reference(change.id),
      });
      await api.post(`changes/${change.id}/revert`, { seq: receipt.seq });
    });

  const status = (scan: Scan | null, expected: string) =>
    scan === null
      ? undefined
      : scan.code === expected
        ? ({ tone: 'ok', message: t('scan.ok', { code: scan.code }) } as const)
        : ({ tone: 'error', message: t('scan.wrong', { code: scan.code, expected }) } as const);

  return (
    <>
      <div className={styles.stepHead}>
        <Chip tone="accent">
          {t('step.number', { number: index + 1, total: change.procedure.steps.length })}
        </Chip>
        <span className={styles.muted}>{machineName(step, machines, t)}</span>
      </div>
      <h2 className={styles.stepTitle}>{localized(step.title, i18n.language)}</h2>
      <p className={styles.text}>{localized(step.text, i18n.language)}</p>
      {foreign && <p className={styles.muted}>{t('step.foreign')}</p>}
      {step.check === 'line-stopped' &&
        (line.stopped ? (
          <SuccessNote title={t('check.stopped')} />
        ) : (
          <InfoTile
            size="sm"
            label={t('check.title')}
            value={t('check.notStopped', { machines: line.notStopped.join(', ') })}
          />
        ))}
      {step.part && (
        <>
          <InfoTile
            size="md"
            label={t('step.part')}
            value={step.part.id}
            aside={
              scanned ? (
                <Chip tone="accent">
                  {CHECK_MARK} {t('scan.matches', { target })}
                </Chip>
              ) : undefined
            }
          />
          <div className={styles.scans}>
            <ScanInput
              label={t('scan.part')}
              status={status(part, step.part.id)}
              disabled={!canExecute}
              onScan={(code, source) => {
                setPart({ code, source });
              }}
            />
            <ScanInput
              label={t('scan.slot', { slot: step.part.slot })}
              status={status(slot, step.part.slot)}
              disabled={!canExecute}
              onScan={(code, source) => {
                setSlot({ code, source });
              }}
            />
          </div>
        </>
      )}
      <Placeholder label={t('step.media')} size="lg" />
      <div className={styles.actions}>
        <Button disabled={!ready} onClick={() => void confirm()}>
          {t('step.confirm')}
        </Button>
        {index > 0 && canExecute && (
          <Button variant="outline" disabled={busy} onClick={() => void back()}>
            {t('step.back')}
          </Button>
        )}
      </div>
      {!canExecute && <p className={styles.muted}>{t('step.noPermission')}</p>}
      {canExecute && !scanned && <p className={styles.muted}>{t('step.scanFirst')}</p>}
      {canExecute && scanned && !stopped && <p className={styles.muted}>{t('step.stopFirst')}</p>}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </>
  );
}

function Completion({
  change,
  target,
  onChange,
  onDismiss,
}: {
  change: Change;
  target: string;
  onChange: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation(MODULE_ID);
  const api = useModuleApi();
  const sign = useRequestSignature();
  const user = useUser();
  const line = useLine();
  const canPerform = usePermission(ACTIONS.perform.permission);
  const canRelease = usePermission(ACTIONS.release.permission);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subject = t('sign.subject', { id: change.id, target });

  const signStep = (step: typeof ACTIONS.perform | typeof ACTIONS.release, path: string) => {
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        const result = await sign({
          ...step,
          subject,
          newValue: change.recordHash ?? '',
          reference: reference(change.id),
        });
        if (!result) return; // abgebrochen
        await api.post(`changes/${change.id}/${path}`, { seq: result.seq });
        onChange();
      } catch (e) {
        setError(e instanceof ModuleApiError && e.status === 403 ? t('sign.fourEyes') : t('error'));
      } finally {
        setBusy(false);
      }
    })();
  };

  if (change.status === 'cancelled') return <p className={styles.text}>{t('change.cancelled')}</p>;

  if (change.status === 'released' && change.performed && change.released) {
    const check = change.recipeCheck;
    return (
      <>
        <SuccessNote title={t('released.title')}>
          {t('released.text', {
            performer: change.performed.userName,
            releaser: change.released.userName,
            minutes: durationMinutes(change),
            planned: change.procedure.plannedMinutes,
            target,
          })}
        </SuccessNote>
        <p className={styles.muted}>
          {check === null
            ? t('recipe.pending', { recipe: change.procedure.to.recipe.id })
            : check.ok
              ? t('recipe.ok', { batch: check.batchId, recipe: change.procedure.to.recipe.id })
              : t('recipe.mismatch', {
                  batch: check.batchId,
                  machines: check.machines
                    .filter((m) => m.recipe.id !== change.procedure.to.recipe.id)
                    .map((m) => `${m.machineId}: ${m.recipe.id} v${String(m.recipe.version)}`)
                    .join(', '),
                })}
        </p>
        {check && !check.ok && <Chip tone="warning">{t('recipe.deviation')}</Chip>}
        <Button variant="outline" className={styles.start} onClick={onDismiss}>
          {t('released.next')}
        </Button>
      </>
    );
  }

  const samePerformer = change.performed?.username === user.username;
  return (
    <>
      <h2 className={styles.stepTitle}>{t('done.title')}</h2>
      {change.status === 'running' && (
        <>
          <p className={styles.text}>{t('done.text', { target })}</p>
          {canPerform ? (
            <Button
              className={styles.start}
              disabled={busy}
              onClick={() => {
                signStep(ACTIONS.perform, PERFORM_PATH);
              }}
            >
              {t('done.perform')}
            </Button>
          ) : (
            <p className={styles.muted}>{t('done.waitPerform')}</p>
          )}
        </>
      )}
      {change.status === 'performed' && change.performed && (
        <>
          <SuccessNote title={t('done.performed')}>
            {signedBy(change.performed, line.timeZone, t)}
          </SuccessNote>
          <p className={styles.text}>{t('done.releaseText')}</p>
          {canRelease && !samePerformer ? (
            <Button
              className={styles.start}
              disabled={busy}
              onClick={() => {
                signStep(ACTIONS.release, RELEASE_PATH);
              }}
            >
              {t('done.release')}
            </Button>
          ) : (
            <p className={styles.muted}>
              {samePerformer ? t('sign.fourEyes') : t('done.waitRelease')}
            </p>
          )}
        </>
      )}
      {change.recordHash && (
        <div className={styles.hash}>
          <span className={styles.muted}>{t('done.hash')}</span>
          <code className={styles.code}>{change.recordHash}</code>
        </div>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </>
  );
}

function ProceduresCard({
  procedures,
  onChange,
}: {
  procedures: readonly ProcedureSummary[];
  onChange: () => void;
}) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const api = useModuleApi();
  const audit = useAudit();
  const [errors, setErrors] = useState<string[]>([]);
  const [imported, setImported] = useState<string | null>(null);

  const columns: DataTableColumn<ProcedureSummary>[] = [
    {
      key: 'title',
      header: t('procedures.name'),
      tone: 'strong',
      cell: (p) => localized(p.title, i18n.language),
    },
    {
      key: 'route',
      header: t('procedures.route'),
      cell: (p) =>
        `${localized(p.from.format, i18n.language)} → ${localized(p.to.format, i18n.language)}`,
    },
    {
      key: 'version',
      header: t('procedures.version'),
      nowrap: true,
      cell: (p) => String(p.version),
    },
    { key: 'steps', header: t('procedures.steps'), nowrap: true, cell: (p) => String(p.stepCount) },
  ];

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setErrors([]);
    setImported(null);
    let procedure: { id?: unknown; version?: unknown };
    try {
      procedure = JSON.parse(await file.text()) as { id?: unknown; version?: unknown };
    } catch {
      setErrors([t('procedures.noJson')]);
      return;
    }
    const id = typeof procedure.id === 'string' ? procedure.id : '';
    const version = typeof procedure.version === 'number' ? procedure.version : 0;
    try {
      const receipt = await audit.record({
        action: ACTIONS.imported.action,
        newValue: `${id} v${String(version)}`,
        reference: procedureReference(id),
      });
      await api.post('procedures', { procedure, seq: receipt.seq });
      setImported(`${id} v${String(version)}`);
      onChange();
    } catch (e) {
      setErrors(e instanceof ModuleApiError && e.errors.length > 0 ? e.errors : [t('error')]);
    }
  };

  return (
    <Card gap="14">
      <CardHeader title={t('procedures.title')} subtitle={t('procedures.subtitle')} />
      <DataTable
        label={t('procedures.title')}
        columns={columns}
        rows={procedures}
        rowKey={(p) => p.id}
      />
      <label className={styles.upload}>
        <span className={styles.uploadLabel}>{t('procedures.import')}</span>
        <input type="file" accept="application/json,.json" onChange={(e) => void upload(e)} />
      </label>
      {imported && <SuccessNote title={t('procedures.imported', { id: imported })} />}
      {errors.length > 0 && (
        <ul role="alert" className={styles.errors}>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
