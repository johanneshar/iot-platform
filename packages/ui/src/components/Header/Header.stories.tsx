import type { Meta, StoryObj } from '@storybook/react-vite';
import { MockupHeader } from '../../stories/mockup-shell';
import { Header, UserBadge } from './Header';

const meta = {
  title: 'Layout/Header',
  component: Header,
  args: { title: 'Linienübersicht', eyebrow: 'Linie 1 · Vials' },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NurTitel: Story = {};
export const WieImMockup: Story = { render: () => <MockupHeader title="Linienübersicht" /> };
export const Benutzer: Story = {
  render: () => <UserBadge initials="BN" name="[Benutzer]" roleLabel="Schichtleitung" />,
  parameters: { layout: 'padded' },
};
