import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar } from './ProgressBar';

const meta = {
  title: 'Grundlagen/ProgressBar',
  component: ProgressBar,
  args: { value: 62, label: 'Fortschritt Batch', tone: 'primary', size: 'md' },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Batch: Story = {};
export const Töne: Story = {
  render: () => (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', maxWidth: 400 }}
    >
      <ProgressBar value={86} label="In Ordnung" />
      <ProgressBar value={63} label="Beobachten" tone="warning" />
      <ProgressBar value={41} label="Tausch planen" tone="fault" />
      <ProgressBar value={70} label="Weitere Störung" tone="secondary" />
    </div>
  ),
};
