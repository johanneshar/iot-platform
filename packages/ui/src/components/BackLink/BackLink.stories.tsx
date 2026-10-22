import type { Meta, StoryObj } from '@storybook/react-vite';
import { BackLink } from './BackLink';

const meta = {
  title: 'Grundlagen/BackLink',
  component: BackLink,
  args: { href: '/dashboard', children: 'Linienübersicht', onNavigate: () => undefined },
} satisfies Meta<typeof BackLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {};
