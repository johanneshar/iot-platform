import { lines } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MachineCard } from './MachineCard';

const [wash, , fill, insp] = lines[0]?.machines ?? [];

const meta = {
  title: 'Linie/MachineCard',
  component: MachineCard,
  args: {
    name: fill?.name ?? '',
    kind: 'own',
    state: 'Execute',
    rate: fill?.rate ?? '',
    oee: fill?.oee ?? '',
    bottleneck: true,
    selected: true,
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', maxWidth: 260 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MachineCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EigeneAusgewählt: Story = {};
export const Fremdmaschine: Story = {
  args: {
    name: wash?.name ?? '',
    kind: 'foreign',
    levelLabel: wash?.level ?? '',
    rate: wash?.rate ?? '',
    oee: wash?.oee ?? '',
    bottleneck: false,
    selected: false,
  },
};
export const FremdmaschineSuspended: Story = {
  args: {
    name: insp?.name ?? '',
    kind: 'foreign',
    levelLabel: insp?.level ?? '',
    state: 'Suspended',
    rate: insp?.rate ?? '',
    oee: insp?.oee ?? '',
    bottleneck: false,
    selected: false,
  },
};

export const DatenUnsicher: Story = {
  args: {
    selected: false,
    bottleneck: false,
    notice: { tone: 'warning', label: 'Daten unsicher' },
  },
};
