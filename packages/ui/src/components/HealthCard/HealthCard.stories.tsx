import { components } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { HealthCard, type HealthStatus } from './HealthCard';

// Schwellen wie im Mockup; im Modul Condition Monitoring festgelegt
const statusOf = (health: number): HealthStatus =>
  health < 50 ? 'replace' : health < 70 ? 'watch' : 'ok';

const [first] = components;

const meta = {
  title: 'Instandhaltung/HealthCard',
  component: HealthCard,
  args: {
    name: first?.name ?? '',
    machine: first?.machine ?? '',
    health: first?.health ?? 0,
    status: statusOf(first?.health ?? 0),
    hint: first?.hint ?? '',
    actionLabel: `Ersatzteil ${first?.part ?? ''} anzeigen`,
  },
} satisfies Meta<typeof HealthCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InOrdnung: Story = {};

export const AlleKomponenten: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-card-min), 1fr))',
        gap: 'var(--space-16)',
      }}
    >
      {components.map((c) => (
        <HealthCard
          key={c.name}
          name={c.name}
          machine={c.machine}
          health={c.health}
          status={statusOf(c.health)}
          hint={c.hint}
          actionLabel={`Ersatzteil ${c.part} anzeigen`}
        />
      ))}
    </div>
  ),
};
