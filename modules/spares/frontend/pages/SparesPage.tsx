import {
  ModuleApiError,
  useDeepLinkParams,
  useModuleApi,
  useModuleData,
  usePermission,
  useTranslation,
} from '@iot/module-sdk';
import {
  Button,
  Card,
  CardHeader,
  Chip,
  FilterGroup,
  PartCard,
  SearchInput,
  SuccessNote,
  type FilterOption,
} from '@iot/ui';
import { useState } from 'react';
import type { CatalogResponse, MachineInfo, Part, SpareRequest, Text } from '../../shared/spares';
import { MODULE_ID } from '../module-id';
import { requestList, useRequestList } from '../request-list';
import styles from './SparesPage.module.css';

const ALL = '';
const REMOVE_MARK = '✕';

const localized = (text: Text, language: string) => text[language] ?? text.de;

/** Treffer: Teilenummer oder Bezeichnung enthält den Suchbegriff (ohne Groß-/Kleinschreibung) */
export function matches(part: Part, query: string, language: string): boolean {
  const q = query.trim().toLowerCase();
  return (
    !q ||
    part.id.toLowerCase().includes(q) ||
    localized(part.name, language).toLowerCase().includes(q)
  );
}

/** Maschine der Anfrage: gewählte Maschine, sonst die eine Maschine, in der alle Teile verbaut sind */
export function requestMachine(parts: readonly Part[], selected: string | null): string | null {
  if (selected) return selected;
  const common = parts.reduce<string[] | null>(
    (acc, p) => (acc === null ? p.machines : acc.filter((m) => p.machines.includes(m))),
    null,
  );
  return common?.length === 1 ? (common[0] ?? null) : null;
}

/** Ersatzteilkatalog nach Mockup: Suche, Baugruppen, Bestand und Anfrage an den Service (M7). */
export function SparesPage() {
  const { t, i18n } = useTranslation(MODULE_ID);
  const params = useDeepLinkParams();
  const catalog = useModuleData<CatalogResponse>('catalog');
  // Einsprung per Deep Link: `search` (Teilenummer) und `machine` (nur Teile dieser Maschine)
  const [search, setSearch] = useState(params['search'] ?? '');
  const [group, setGroup] = useState(ALL);
  const [machineId, setMachineId] = useState<string | null>(params['machine'] ?? null);

  if (catalog.failed && !catalog.data) return <Card role="alert">{t('loadError')}</Card>;
  if (!catalog.data) return <Card>{t('loading')}</Card>;
  const data = catalog.data;
  const language = i18n.language;
  const machine = machineId ? (data.machines.find((m) => m.machineId === machineId) ?? null) : null;

  const groups: FilterOption<string>[] = [
    { value: ALL, label: t('groups.all') },
    ...data.groups.map((g) => ({ value: g, label: g })),
  ];
  const parts = data.parts.filter(
    (p) =>
      (group === ALL || p.group === group) &&
      (machineId === null || p.machines.includes(machineId)) &&
      matches(p, search, language),
  );
  const exact = search.trim().toLowerCase();

  return (
    <div className={styles.page}>
      <Card padding="md" gap="16" className={styles.catalog}>
        <SearchInput
          label={t('search.label')}
          placeholder={t('search.placeholder')}
          value={search}
          onChange={setSearch}
        />
        <FilterGroup label={t('groups.label')} options={groups} value={group} onChange={setGroup} />
        <div className={styles.scope}>
          <span>
            {t('count', { count: parts.length })} ·{' '}
            {machine?.name ?? machineId ?? t('scope.allMachines')}
          </span>
          {machineId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMachineId(null);
              }}
            >
              {t('scope.showAll')}
            </Button>
          )}
        </div>
        {machine && !machine.own ? (
          <p className={styles.muted}>{t('scope.foreign')}</p>
        ) : (
          <PartGrid parts={parts} highlight={exact} />
        )}
        {parts.length === 0 && (machine?.own ?? true) && (
          <p className={styles.muted}>{t('none')}</p>
        )}
      </Card>
      <RequestCard catalog={data} machine={machine} />
    </div>
  );
}

function PartGrid({ parts, highlight }: { parts: readonly Part[]; highlight: string }) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const canRequest = usePermission('spares.request');
  const list = useRequestList();
  return (
    <div className={styles.grid}>
      {parts.map((part) => (
        <PartCard
          key={part.id}
          id={part.id}
          name={localized(part.name, i18n.language)}
          group={part.group}
          stock={part.stock}
          leadTime={
            part.leadDays === null ? t('lead.none') : t('lead.days', { count: part.leadDays })
          }
          inRequest={list.includes(part.id)}
          highlighted={highlight !== '' && part.id.toLowerCase() === highlight}
          {...(canRequest
            ? {
                onToggle: () => {
                  requestList.toggle(part.id);
                },
              }
            : {})}
        />
      ))}
    </div>
  );
}

function RequestCard({
  catalog,
  machine,
}: {
  catalog: CatalogResponse;
  machine: MachineInfo | null;
}) {
  const { t, i18n } = useTranslation(MODULE_ID);
  const api = useModuleApi();
  const canRequest = usePermission('spares.request');
  const list = useRequestList();
  const [sent, setSent] = useState<SpareRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = list
    .map((id) => catalog.parts.find((p) => p.id === id))
    .filter((p): p is Part => p !== undefined);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const machineId = requestMachine(items, machine?.own ? machine.machineId : null);
      const result = await api.post<SpareRequest>('requests', {
        items: items.map((p) => p.id),
        ...(machineId ? { machineId } : {}),
      });
      requestList.clear();
      setSent(result);
    } catch (e) {
      setError(
        e instanceof ModuleApiError && e.status === 403
          ? t('request.forbidden')
          : t('request.error'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="md" gap="14" className={styles.request}>
      <CardHeader
        title={t('request.title')}
        aside={<Chip tone="neutral">{t('count', { count: items.length })}</Chip>}
      />
      {items.length === 0 && !sent && <p className={styles.muted}>{t('request.empty')}</p>}
      {items.length > 0 && (
        <ul className={styles.items}>
          {items.map((part) => {
            const name = localized(part.name, i18n.language);
            return (
              <li key={part.id} className={styles.item}>
                <div className={styles.itemText}>
                  <div className={styles.itemName}>{name}</div>
                  <div className={styles.itemId}>{part.id}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t('request.remove', { name })}
                  onClick={() => {
                    requestList.remove(part.id);
                  }}
                >
                  {REMOVE_MARK}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 0 &&
        (canRequest ? (
          <Button disabled={busy} onClick={() => void send()}>
            {t('request.send')}
          </Button>
        ) : (
          <p className={styles.muted}>{t('request.noPermission')}</p>
        ))}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {sent && items.length === 0 && (
        <SuccessNote title={t('request.sent')}>
          {t('request.sentText', { ticket: sent.ticket })}
        </SuccessNote>
      )}
    </Card>
  );
}
