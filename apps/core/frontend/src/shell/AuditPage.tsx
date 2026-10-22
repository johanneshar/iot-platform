import { useTranslation } from '@iot/module-sdk';
import { Card, CardHeader, Chip, DataTable, type DataTableColumn } from '@iot/ui';
import { useEffect, useState } from 'react';
import { fetchAudit, verifyAudit, type AuditEntry } from '../api';
import { formatTimestamp } from '../format';
import { CORE_NAMESPACE } from '../i18n';

/** Audit Trail des Core: unveränderbar, Kette geprüft, Zeiten in Ortszeit des Standorts. */
export function AuditPage({ timeZone }: { timeZone: string }) {
  const { t, i18n } = useTranslation(CORE_NAMESPACE);
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [chain, setChain] = useState<{
    valid: boolean;
    count: number;
    brokenAt: number | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchAudit(), verifyAudit()]).then(([list, verify]) => {
      if (cancelled) return;
      setEntries(list);
      setChain(verify);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const actionLabel = (action: string) =>
    t(`audit.actions.${action.replaceAll('.', '_')}`, { defaultValue: action });

  const columns: DataTableColumn<AuditEntry>[] = [
    {
      key: 'time',
      header: t('audit.time'),
      tone: 'muted',
      nowrap: true,
      cell: (e) => formatTimestamp(e.ts, timeZone, i18n.language),
    },
    { key: 'user', header: t('audit.user'), cell: (e) => e.userName },
    {
      key: 'action',
      header: t('audit.action'),
      tone: 'strong',
      cell: (e) => actionLabel(e.action),
    },
    {
      key: 'change',
      header: t('audit.change'),
      cell: (e) => (e.oldValue || e.newValue ? `${e.oldValue ?? '—'} → ${e.newValue ?? '—'}` : '—'),
    },
    {
      key: 'note',
      header: t('audit.note'),
      cell: (e) => (e.meaning ? t('audit.signed', { meaning: e.meaning }) : (e.reason ?? '—')),
    },
  ];

  return (
    <Card gap="14">
      <CardHeader
        title={t('audit.title')}
        subtitle={t('audit.subtitle')}
        aside={
          chain && (
            <Chip tone={chain.valid ? 'accent' : 'fault'}>
              {chain.valid
                ? t('audit.valid', { count: chain.count })
                : t('audit.broken', { seq: chain.brokenAt })}
            </Chip>
          )
        }
      />
      {entries ? (
        <DataTable
          label={t('audit.label')}
          columns={columns}
          rows={entries}
          rowKey={(e) => String(e.seq)}
          minWidth="lg"
        />
      ) : (
        <p>{t('app.loading')}</p>
      )}
    </Card>
  );
}
