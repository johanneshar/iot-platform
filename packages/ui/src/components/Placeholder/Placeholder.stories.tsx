import type { Meta, StoryObj } from '@storybook/react-vite';
import { Placeholder } from './Placeholder';

const meta = {
  title: 'Grundlagen/Placeholder',
  component: Placeholder,
  args: { label: '[Bild oder 3D-Ansicht der Baugruppe]', size: 'md' },
} satisfies Meta<typeof Placeholder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BildOder3D: Story = {};
export const Teilebild: Story = { args: { label: '[Teilebild]', size: 'sm' } };
export const Video: Story = {
  args: { label: '[Video oder Bildfolge zum Arbeitsschritt]', size: 'lg' },
};
