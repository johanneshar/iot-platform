import type { Meta, StoryObj } from '@storybook/react-vite';
import { StateChip } from './StateChip';

const meta = {
  title: 'Grundlagen/StateChip',
  component: StateChip,
  args: { state: 'Execute' },
} satisfies Meta<typeof StateChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Execute: Story = {};
export const MitPräfix: Story = { args: { state: 'Execute', prefix: 'PackML:' } };
export const LinieImHeader: Story = { args: { state: 'Held', prefix: 'Linie:', dot: 'md' } };

export const FestgelegteZustände: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
      <StateChip state="Execute" />
      <StateChip state="Suspended" />
      <StateChip state="Held" />
      <StateChip state="Idle" />
      <StateChip state="Stopped" />
    </div>
  ),
};
