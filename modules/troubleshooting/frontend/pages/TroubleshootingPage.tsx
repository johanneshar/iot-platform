import {
  useAlarms,
  useDeepLinkParams,
  useLine,
  useMachines,
  useModuleApi,
  useNavigate,
  usePermission,
  useTranslation,
  type LineAlarm,
} from '@iot/module-sdk';
import {
  Button,
  Card,
  CardHeader,
  Chip,
  ChoiceButton,
  Panel,
  Placeholder,
  StepTrail,
  SuccessNote,
} from '@iot/ui';
import { useEffect, useMemo, useState } from 'react';
import { localized, type FaultTree, type TreeSummary } from '../../shared/fault-tree';
import { answer, back, currentNode, startFlow, type FlowState } from '../flow';
import { MODULE_ID } from '../module-id';
import styles from './TroubleshootingPage.module.css';

const SPARES_MODULE = 'spares';

const formatTime = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('de-DE', { timeZone, hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );

/** Geführte Fehlersuche nach Mockup: Einstieg zu aktivem Alarm oder nach Symptom, dann Schritt für Schritt. */
export function TroubleshootingPage() {
  const { t } = useTranslation(MODULE_ID);
  const api = useModuleApi();
  const params = useDeepLinkParams();
  const [summaries, setSummaries] = useState<TreeSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState<{
    tree: FaultTree;
    alarm: LineAlarm | null;
    state: FlowState;
  } | null>(null);
  const alarms = useAlarms();

  useEffect(() => {
    let cancelled = false;
    api.get<TreeSummary[]>('trees').then(
      (list) => {
        if (!cancelled) setSummaries(list);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api]);

  const open = async (treeId: string, alarm: LineAlarm | null) => {
    const tree = await api.get<FaultTree>(`trees/${encodeURIComponent(treeId)}`);
    setActive({ tree, alarm, state: startFlow(tree) });
  };

  // Deep Link: ?alarmId=… (aus Alarmen, Dashboard, 3D-Ansicht) oder ?tree=…
  const deepLink =
    params['tree'] ??
    (params['alarmId']
      ? summaries?.find((s) => s.alarmIds.includes(params['alarmId'] ?? ''))?.id
      : undefined);
  const deepLinkAlarm =
    alarms.find(
      (a) =>
        a.alarmId === params['alarmId'] &&
        (!params['machine'] || a.machineId === params['machine']),
    ) ?? null;
  const [handledLink, setHandledLink] = useState<string | null>(null);
  const linkKey = `${params['tree'] ?? ''}|${params['alarmId'] ?? ''}`;
  if (deepLink && summaries && handledLink !== linkKey) {
    setHandledLink(linkKey);
    void open(deepLink, deepLinkAlarm);
  }

  if (failed) return <Card role="alert">{t('loadError')}</Card>;
  if (!summaries) return <Card>{t('loading')}</Card>;
  if (params['alarmId'] && !deepLink && !active) return <Card>{t('noTreeForAlarm')}</Card>;

  if (active) {
    return (
      <TreeRun
        tree={active.tree}
        alarm={active.alarm}
        state={active.state}
        onChange={(state) => {
          setActive({ ...active, state });
        }}
        onExit={() => {
          setActive(null);
        }}
      />
    );
  }
  return (
    <Choose summaries={summaries} alarms={alarms} onOpen={(id, alarm) => void open(id, alarm)} />
  );
}

function Choose({
  summaries,
  alarms,
  onOpen,
}: {
  summaries: TreeSummary[];
  alarms: LineAlarm[];
  onOpen: (treeId: string, alarm: LineAlarm | null) => void;
}) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const line = useLine();
  const machines = useMachines();
  const types = useMemo(() => new Set(machines.map((m) => m.identity?.type)), [machines]);
  const name = (id: string) => machines.find((m) => m.machineId === id)?.identity?.type ?? id;
  const withTree = alarms.filter((a) => summaries.some((s) => s.alarmIds.includes(a.alarmId)));
  const lineTrees = summaries.filter((s) => types.has(s.machineType));

  return (
    <div className={styles.row}>
      <Card gap="12" className={styles.half}>
        <CardHeader title={t('choose.alarmTitle')} subtitle={t('choose.alarmText')} />
        {withTree.length === 0 && <p className={styles.muted}>{t('choose.noAlarm')}</p>}
        {withTree.map((a) => (
          <ChoiceButton
            key={`${a.machineId}-${a.alarmId}`}
            title={localized(a.text, i18n.language) || t('commonFault')}
            subtitle={`${name(a.machineId)} · ${formatTime(a.raisedAt, line.timeZone)}`}
            onClick={() => {
              const tree = summaries.find((s) => s.alarmIds.includes(a.alarmId));
              if (tree) onOpen(tree.id, a);
            }}
          />
        ))}
      </Card>
      <Card gap="12" className={styles.half}>
        <CardHeader title={t('choose.symptomTitle')} subtitle={t('choose.symptomText')} />
        {lineTrees.length === 0 && <p className={styles.muted}>{t('choose.noTrees')}</p>}
        {lineTrees.map((s) => (
          <ChoiceButton
            key={s.id}
            title={localized(s.title, i18n.language)}
            onClick={() => {
              onOpen(s.id, null);
            }}
          />
        ))}
      </Card>
    </div>
  );
}

interface TreeRunProps {
  tree: FaultTree;
  alarm: LineAlarm | null;
  state: FlowState;
  onChange: (state: FlowState) => void;
  onExit: () => void;
}

function TreeRun({ tree, alarm, state, onChange, onExit }: TreeRunProps) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const lang = i18n.language;
  const api = useModuleApi();
  const navigate = useNavigate();
  const canDocument = usePermission('troubleshooting.document');
  const [documented, setDocumented] = useState<'no' | 'yes' | 'error'>('no');
  const node = currentNode(tree, state);

  const document = async () => {
    try {
      await api.post('solutions', {
        treeId: tree.id,
        path: state.path,
        resultNode: state.node,
        alarmId: alarm?.alarmId ?? null,
        machineId: alarm?.machineId ?? null,
      });
      setDocumented('yes');
    } catch {
      setDocumented('error');
    }
  };

  const go = (next: FlowState) => {
    setDocumented('no');
    onChange(next);
  };

  return (
    <div className={styles.row}>
      <Card padding="lg" gap="18" className={styles.wide}>
        <CardHeader
          eyebrow={tree.machineType}
          title={localized(tree.title, lang)}
          size="detail"
          aside={<Chip>{t('step.number', { number: state.path.length + 1 })}</Chip>}
        />
        {node?.type === 'question' && (
          <>
            <Panel title={localized(node.text, lang)}>
              {node.hint && <div>{t('step.hint', { hint: localized(node.hint, lang) })}</div>}
              <Placeholder label={t('step.media')} />
            </Panel>
            <div className={styles.actions}>
              <Button
                className={styles.answer}
                onClick={() => {
                  go(answer(tree, state, true));
                }}
              >
                {t('step.yes')}
              </Button>
              <Button
                variant="outline"
                className={styles.answer}
                onClick={() => {
                  go(answer(tree, state, false));
                }}
              >
                {t('step.no')}
              </Button>
            </div>
          </>
        )}
        {node?.type === 'result' && (
          <>
            <Panel tone="solution" label={t('step.solution')} title={localized(node.text, lang)}>
              {localized(node.detail, lang)}
            </Panel>
            <div className={styles.actions}>
              {node.part && (
                <Button
                  variant="outline"
                  onClick={() => {
                    navigate(SPARES_MODULE, { search: node.part ?? '' });
                  }}
                >
                  {t('step.part', { part: node.part })}
                </Button>
              )}
              {canDocument && documented !== 'yes' && (
                <Button onClick={() => void document()}>{t('step.document')}</Button>
              )}
            </div>
            {documented === 'yes' && (
              <SuccessNote title={t('step.documented')}>{t('step.documentedText')}</SuccessNote>
            )}
            {documented === 'error' && (
              <p role="alert" className={styles.muted}>
                {t('step.documentError')}
              </p>
            )}
          </>
        )}
        <div className={styles.footer}>
          {state.path.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                go(back(tree, state));
              }}
            >
              {t('step.back')}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              go(startFlow(tree));
            }}
          >
            {t('step.restart')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onExit}>
            {t('step.exit')}
          </Button>
        </div>
      </Card>
      <Card gap="12" className={styles.narrow}>
        <CardHeader title={t('trail.title')} />
        {state.path.length === 0 ? (
          <p className={styles.muted}>{t('trail.empty')}</p>
        ) : (
          <StepTrail
            label={t('trail.label')}
            steps={state.path.map((step, index) => {
              const asked = tree.nodes[step.node];
              return {
                id: String(index),
                question: asked?.type === 'question' ? localized(asked.text, lang) : step.node,
                answer: step.answer === 'yes' ? t('trail.yes') : t('trail.no'),
              };
            })}
          />
        )}
      </Card>
    </div>
  );
}
