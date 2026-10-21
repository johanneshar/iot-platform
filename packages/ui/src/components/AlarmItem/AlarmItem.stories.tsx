import { lines } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { AlarmItem } from './AlarmItem';

const active = (lines[0]?.alarms ?? []).filter((a) => a.active);

const meta = {
  title: 'Linie/AlarmItem',
  component: AlarmItem,
  args: {
    severity: 'fault',
    text: 'Wägezelle 3: Tara-Abweichung',
    meta: 'Füll- und Verschließmaschine · 13:48',
  },
} satisfies Meta<typeof AlarmItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Störung: Story = {
  args: {
    action: (
      <Button variant="outline" size="sm">
        Fehlersuche starten
      </Button>
    ),
  },
};
export const Warnung: Story = {
  args: {
    severity: 'warning',
    text: 'Auslauf gestaut – Pufferband voll',
    meta: 'Inspektionsmaschine · 14:12',
  },
};

export const AnstehendeAlarme: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      {active.map((a) => (
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
    </div>
  ),
};
