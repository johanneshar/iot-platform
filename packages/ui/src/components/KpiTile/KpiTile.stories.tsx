import { lines } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { KpiTile } from './KpiTile';

const line = lines[0];
const meta = {
  title: 'Grundlagen/KpiTile',
  component: KpiTile,
  args: { label: 'Verfügbarkeit', value: '91,2', unit: '%', sub: 'Schicht seit 06:00' },
} satisfies Meta<typeof KpiTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {};
export const Haupt: Story = {
  args: { label: 'Linien-OEE', value: '78,4', unit: '%', sub: 'Ziel 82 %', variant: 'main' },
};

export const KpiReihe: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-kpi-min), 1fr))',
        gap: 'var(--space-16)',
      }}
    >
      {line?.kpis.map((kpi) => (
        <KpiTile key={kpi.label} {...kpi} variant={kpi.main ? 'main' : 'default'} />
      ))}
    </div>
  ),
};
