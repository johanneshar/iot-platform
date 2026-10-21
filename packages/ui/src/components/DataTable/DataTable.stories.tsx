import { auditEntries, lines, type FixtureAlarm } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Chip, type ChipTone } from '../Chip/Chip';
import { DataTable, type DataTableColumn } from './DataTable';

const alarms = lines[0]?.alarms ?? [];
const SEVERITY: Record<FixtureAlarm['severity'], { label: string; tone: ChipTone }> = {
  fault: { label: 'Störung', tone: 'fault' },
  warning: { label: 'Warnung', tone: 'warning' },
  info: { label: 'Info', tone: 'info' },
};

const alarmColumns: DataTableColumn<FixtureAlarm>[] = [
  { key: 'time', header: 'Zeit', cell: (r) => r.time, tone: 'muted', nowrap: true },
  { key: 'machine', header: 'Maschine', cell: (r) => r.machine },
  { key: 'text', header: 'Meldung', cell: (r) => r.text, tone: 'strong' },
  {
    key: 'class',
    header: 'Klasse',
    cell: (r) => <Chip tone={SEVERITY[r.severity].tone}>{SEVERITY[r.severity].label}</Chip>,
  },
  {
    key: 'action',
    header: 'Aktion',
    cell: (r) => (
      <div
        style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap', alignItems: 'center' }}
      >
        {r.tree && (
          <Button variant="outline" size="sm">
            Fehlersuche
          </Button>
        )}
        {r.active ? (
          <Button size="sm">Quittieren</Button>
        ) : (
          <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)' }}>
            Quittiert
          </span>
        )}
      </div>
    ),
  },
];

type AuditEntry = (typeof auditEntries)[number];
const auditColumns: DataTableColumn<AuditEntry>[] = [
  { key: 'time', header: 'Zeit', cell: (r) => r.time, tone: 'muted', nowrap: true },
  { key: 'user', header: 'Benutzer', cell: (r) => r.user },
  { key: 'action', header: 'Aktion', cell: (r) => r.action, tone: 'strong' },
  { key: 'change', header: 'Alt → Neu', cell: (r) => r.change },
];

const meta = {
  title: 'Grundlagen/DataTable',
  component: DataTable<FixtureAlarm>,
  args: {
    label: 'Alarmliste',
    columns: alarmColumns,
    rows: alarms,
    rowKey: (r: FixtureAlarm) => r.id,
    minWidth: 'lg',
  },
} satisfies Meta<typeof DataTable<FixtureAlarm>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Alarmliste: Story = {};

export const AuditTrail: Story = {
  render: () => (
    <DataTable
      label="Audit Trail"
      columns={auditColumns}
      rows={auditEntries}
      rowKey={(r) => `${r.time}-${r.action}`}
    />
  ),
};
