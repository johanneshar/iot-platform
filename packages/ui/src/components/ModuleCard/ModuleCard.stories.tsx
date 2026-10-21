import { modules } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ModuleCard } from './ModuleCard';

const byId = (id: string) => modules.find((m) => m.id === id);
const batch = byId('batch');

const meta = {
  title: 'Plattform/ModuleCard',
  component: ModuleCard,
  args: {
    name: batch?.name ?? '',
    description: batch?.description ?? '',
    categoryLabel: batch?.category ?? '',
    gxp: true,
    booked: true,
    onOpen: () => undefined,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ModuleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gebucht: Story = {};
export const NichtGebucht: Story = {
  args: {
    name: byId('condition-monitoring')?.name ?? '',
    description: byId('condition-monitoring')?.description ?? '',
    categoryLabel: 'Instandhaltung',
    gxp: false,
    booked: false,
  },
};
export const Kernmodul: Story = {
  args: {
    name: byId('audit')?.name ?? '',
    description: byId('audit')?.description ?? '',
    categoryLabel: 'Kern',
    core: true,
  },
};
export const OhneAdminRecht: Story = { args: { canToggle: false } };

export const Baukasten: Story = {
  decorators: [(Story) => <Story />],
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-card-min), 1fr))',
        gap: 'var(--space-16)',
      }}
    >
      {modules.map((m) => (
        <ModuleCard
          key={m.id}
          name={m.name}
          description={m.description}
          categoryLabel={m.category}
          core={m.core ?? false}
          gxp={m.gxp ?? false}
          booked={m.booked}
          onOpen={m.hasPage ? () => undefined : undefined}
        />
      ))}
    </div>
  ),
};
