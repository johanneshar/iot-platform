import { lines } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { AlarmItem } from '../components/AlarmItem/AlarmItem';
import { AppShell, Stack } from '../components/AppShell/AppShell';
import { Button } from '../components/Button/Button';
import { Card, CardHeader } from '../components/Card/Card';
import { Chip } from '../components/Chip/Chip';
import { InfoTile } from '../components/InfoTile/InfoTile';
import { KpiTile } from '../components/KpiTile/KpiTile';
import { LineFlow } from '../components/LineFlow/LineFlow';
import { LockedModule } from '../components/LockedModule/LockedModule';
import { StateChip } from '../components/StateChip/StateChip';
import { MockupHeader, MockupSidebar } from './mockup-shell';
import styles from './views.module.css';

const line = lines[0];

/**
 * Gesamtansicht „Linienübersicht“ aus dem Mockup, zusammengesetzt aus @iot/ui.
 * Dient dem optischen Abgleich; die echte Seite entsteht in M4 im Modul `dashboard`.
 */
function Linienuebersicht() {
  const [selectedId, setSelectedId] = useState('l1-fill');
  if (!line) return null;
  const selected = line.machines.find((m) => m.id === selectedId) ?? line.machines[0];
  const activeAlarms = line.alarms.filter((a) => a.active);

  return (
    <AppShell sidebar={<MockupSidebar />} header={<MockupHeader title="Linienübersicht" />}>
      <div className={styles.kpis}>
        {line.kpis.map((kpi) => (
          <KpiTile key={kpi.label} {...kpi} variant={kpi.main ? 'main' : 'default'} />
        ))}
      </div>

      <LineFlow
        title="Linienfluss"
        subtitle="Maschine anklicken für Details · Engpass bestimmt die Linienleistung"
        machines={line.machines.map((m) => ({
          id: m.id,
          name: m.name,
          kind: m.kind,
          levelLabel: m.level,
          state: m.state,
          rate: m.rate,
          oee: m.oee,
          bottleneck: m.bottleneck ?? false,
        }))}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <div className={styles.row}>
        {selected && (
          <Card gap="18" className={styles.wide}>
            <CardHeader
              eyebrow="Maschinendetails"
              title={selected.name}
              size="detail"
              aside={<StateChip state={selected.state} prefix="PackML:" />}
            />
            <div className={styles.tiles}>
              <InfoTile label="Datenquelle" value={selected.source} size="sm" />
              <InfoTile label="Integrationsstufe" value={selected.level} size="sm" />
            </div>
            <div className={styles.values}>
              {selected.values.map((v) => (
                <div key={v.label} className={styles.value}>
                  <div className={styles.valueLabel}>{v.label}</div>
                  <div className={styles.valueText}>{v.value}</div>
                </div>
              ))}
            </div>
            {selected.kind === 'own' ? (
              <div className={styles.actions}>
                <Button variant="outline" size="sm">
                  Ersatzteile dieser Maschine
                </Button>
                <Button variant="outline" size="sm">
                  Formatwechsel starten
                </Button>
                <Button variant="outline" size="sm">
                  Wartungsprognose
                </Button>
              </div>
            ) : (
              <div className={styles.note}>
                Fremdmaschine: Ersatzteile und Service über den jeweiligen Hersteller. Datenumfang
                gemäß Integrationsstufe.
              </div>
            )}
          </Card>
        )}

        <Card gap="6" className={styles.narrow}>
          <div className={styles.alarmHead}>
            <CardHeader
              title="Anstehende Alarme"
              aside={<Chip>{`${String(activeAlarms.length)} aktiv`}</Chip>}
            />
          </div>
          {activeAlarms.map((a) => (
            <AlarmItem
              key={a.id}
              severity={a.severity}
              text={a.text}
              meta={`${a.machine} · ${a.time}`}
              action={
                a.tree ? (
                  <Button variant="outline" size="sm">
                    Fehlersuche starten
                  </Button>
                ) : undefined
              }
            />
          ))}
          <a href="#alarme" className={styles.link}>
            Alle Alarme anzeigen →
          </a>
        </Card>
      </div>
    </AppShell>
  );
}

function Sperrbildschirm() {
  return (
    <AppShell
      sidebar={<MockupSidebar active="condition-monitoring" />}
      header={<MockupHeader title="Condition Monitoring" />}
    >
      <Stack>
        <LockedModule
          moduleName="Condition Monitoring"
          description="Aktueller Zustand von Pumpen, Servos und Verschleißteilen"
          onActivate={() => undefined}
          onOpenCatalog={() => undefined}
        />
      </Stack>
    </AppShell>
  );
}

const meta = {
  title: 'Ansichten/Mockup-Abgleich',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const noArgs = { sidebar: null, header: null, children: null };

export const LinienuebersichtStory: Story = {
  name: 'Linienübersicht',
  args: noArgs,
  render: () => <Linienuebersicht />,
};

export const SperrbildschirmStory: Story = {
  name: 'Sperrbildschirm',
  args: noArgs,
  render: () => <Sperrbildschirm />,
};
