import type { Meta, StoryObj } from '@storybook/react-vite';
import { MockupSidebar } from '../../stories/mockup-shell';

const meta = {
  title: 'Layout/Sidebar',
  component: MockupSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ width: 'var(--size-sidebar-width)', minHeight: '100vh', display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MockupSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WieImMockup: Story = {};
export const BaukastenAktiv: Story = { args: { active: 'modules' } };
