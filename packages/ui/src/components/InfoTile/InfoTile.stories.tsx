import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { InfoTile } from './InfoTile';

const meta = {
  title: 'Grundlagen/InfoTile',
  component: InfoTile,
  args: { label: 'Gutteile', value: '61.880', size: 'lg' },
} satisfies Meta<typeof InfoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Groß: Story = {};
export const Klein: Story = {
  args: { label: 'Datenquelle', value: 'S7-1500 · IIoT-Datenbaustein (OPC UA)', size: 'sm' },
};
export const MitAktion: Story = {
  args: {
    label: 'Formatteil',
    value: 'FT-2041',
    size: 'md',
    aside: (
      <Button variant="outline" size="sm">
        Formatteil scannen
      </Button>
    ),
  },
};
