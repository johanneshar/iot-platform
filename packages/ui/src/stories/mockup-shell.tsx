import { lines, modules } from '@iot/simulator/fixtures/mockup';
import { Chip } from '../components/Chip/Chip';
import { Header, UserBadge } from '../components/Header/Header';
import { LineSwitch } from '../components/LineSwitch/LineSwitch';
import { Sidebar, SidebarStatus, type SidebarSection } from '../components/Sidebar/Sidebar';
import { StateChip } from '../components/StateChip/StateChip';
import type { IconName } from '../icons/Icon';

/** Seitenleiste und Kopf wie im Mockup – nur für Stories. */
const booked = (id: string) => modules.find((m) => m.id === id)?.booked ?? false;

export function mockupSections(active: string): SidebarSection[] {
  const item = (id: string, label: string, icon: IconName, badge: number | null = null) => ({
    id,
    label,
    icon,
    active: active === id,
    locked: !booked(id),
    badge,
  });
  const activeAlarms = lines[0]?.alarms.filter((a) => a.active).length ?? 0;
  const bookedCount = modules.filter((m) => m.booked).length;
  return [
    {
      id: 'line',
      label: 'Linie',
      items: [
        item('dashboard', 'Linienübersicht', 'overview'),
        item('alarms', 'Alarme', 'alarms', activeAlarms),
        item('batch', 'Batch-Reporting', 'batch'),
        item('condition-monitoring', 'Condition Monitoring', 'condition'),
        item('predictive-maintenance', 'Predictive Maintenance', 'prediction'),
      ],
    },
    {
      id: 'service',
      label: 'Service',
      items: [
        item('troubleshooting', 'Geführte Fehlersuche', 'troubleshooting'),
        item('format', 'Formatwechsel', 'format'),
        item('spares', 'Ersatzteilkatalog', 'spares'),
      ],
    },
    {
      id: 'platform',
      label: 'Plattform',
      items: [
        {
          id: 'modules',
          label: 'Baukasten',
          icon: 'modules',
          active: active === 'modules',
          badge: `${String(bookedCount)}/${String(modules.length)}`,
          badgeTone: 'subtle' as const,
        },
      ],
    },
  ];
}

export function MockupSidebar({ active = 'dashboard' }: { active?: string }) {
  return (
    <Sidebar
      title="IoT Plattform"
      subtitle="[Firmenlogo]"
      navLabel="Hauptnavigation"
      sections={mockupSections(active)}
      footer={
        <SidebarStatus
          title="Edge Device online"
          online
          lines={[lines[0]?.name ?? '', 'IEM verbunden · Zeit synchron']}
        />
      }
    />
  );
}

export function MockupHeader({ title }: { title: string }) {
  const line = lines[0];
  return (
    <Header title={title} eyebrow={line?.name}>
      <LineSwitch
        label="Linie wählen"
        lines={lines.map((l) => ({ id: l.id, label: l.name }))}
        value="l1"
        onChange={() => undefined}
      />
      <StateChip state={line?.state ?? 'Execute'} prefix="Linie:" dot="md" />
      <Chip>Beispieldaten</Chip>
      <UserBadge initials="BN" name="[Benutzer]" roleLabel="Schichtleitung" />
    </Header>
  );
}
