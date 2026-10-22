import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip } from '../Chip/Chip';
import { ValueTrend } from './ValueTrend';

const meta = {
  title: 'Auswertung/ValueTrend',
  component: ValueTrend,
  args: {
    name: 'Füllgewicht Ø',
    value: '10,02',
    unit: 'g',
    min: 9.95,
    max: 10.1,
    points: [10.01, 10.0, 10.02, 10.03, 9.99, 10.01, 10.04, 10.02, 10.0, 10.02],
    summary: 'Ø 10,01 g · Grenzen 9,95 – 10,10',
    label: 'Verlauf Füllgewicht Ø innerhalb der Grenzen 9,95 bis 10,10 g',
    badge: (
      <Chip tone="dark" size="sm">
        GxP
      </Chip>
    ),
  },
} satisfies Meta<typeof ValueTrend>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MitGrenzen: Story = {};

export const OhneGrenzen: Story = {
  args: {
    name: 'Differenzdruck Isolator',
    value: '18',
    unit: 'Pa',
    min: null,
    max: null,
    badge: undefined,
    points: [17, 18, 18, 19, 18, 17, 18, 19, 18, 18],
    summary: 'Ø 18 Pa',
    label: 'Verlauf Differenzdruck Isolator',
  },
};

export const AußerhalbDerGrenzen: Story = {
  args: {
    value: '10,14',
    outOfLimits: true,
    points: [10.02, 10.04, 10.06, 10.09, 10.12, 10.14],
    summary: 'Ø 10,08 g · Grenzen 9,95 – 10,10',
  },
};
