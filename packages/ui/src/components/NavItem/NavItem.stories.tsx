import type { Meta, StoryObj } from '@storybook/react-vite';
import { NavItem } from './NavItem';

const meta = {
  title: 'Layout/NavItem',
  component: NavItem,
  args: { icon: 'alarms', label: 'Alarme', active: false, locked: false, badge: 3 },
  decorators: [
    (Story) => (
      <div
        style={{
          width: 'var(--size-sidebar-width)',
          padding: 'var(--space-16)',
          background: 'var(--color-sidebar)',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NavItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MitBadge: Story = {};
export const Aktiv: Story = {
  args: { icon: 'overview', label: 'Linienübersicht', active: true, badge: null },
};
export const Gesperrt: Story = {
  args: { icon: 'condition', label: 'Condition Monitoring', locked: true, badge: null },
};
export const MitInfoZähler: Story = {
  args: { icon: 'modules', label: 'Baukasten', badge: '11/14', badgeTone: 'subtle' },
};
