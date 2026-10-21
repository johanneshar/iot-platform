import type { Meta, StoryObj } from '@storybook/react-vite';
import { ICON_NAMES, Icon } from './Icon';

const meta = {
  title: 'Grundlagen/Icon',
  component: Icon,
  args: { name: 'alarms', size: 'md' },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Einzeln: Story = {};
export const Alle: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-24)',
        color: 'var(--color-text)',
      }}
    >
      {ICON_NAMES.map((name) => (
        <div
          key={name}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-8)',
            fontSize: 'var(--font-size-caption)',
          }}
        >
          <Icon name={name} size="xl" />
          {name}
        </div>
      ))}
    </div>
  ),
};
