import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip } from './Chip';

const meta = {
  title: 'Grundlagen/Chip',
  component: Chip,
  args: { children: 'Beispieldaten', tone: 'neutral' },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const AlleTöne: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-8)', alignItems: 'center' }}>
      <Chip>3 aktiv</Chip>
      <Chip tone="accent">In Produktion</Chip>
      <Chip tone="warning">Warnung</Chip>
      <Chip tone="fault">Störung</Chip>
      <Chip tone="info">Info</Chip>
      <Chip tone="primary">Kern</Chip>
      <Chip tone="dark">GxP</Chip>
      <Chip tone="darkAccent" size="sm">
        Engpass
      </Chip>
      <Chip tone="accent" dot="md">
        Linie: Execute
      </Chip>
    </div>
  ),
};

export const InDerSeitenleiste: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-8)',
        padding: 'var(--space-16)',
        background: 'var(--color-sidebar)',
      }}
    >
      <Chip tone="accent" size="badge">
        3
      </Chip>
      <Chip tone="translucent" size="badge">
        11/14
      </Chip>
    </div>
  ),
};
