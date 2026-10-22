import type { Meta, StoryObj } from '@storybook/react-vite';
import { BarChart } from './BarChart';

const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00'];

const meta = {
  title: 'Auswertung/BarChart',
  component: BarChart,
  args: {
    label: 'Leistung je Stunde in Stück pro Minute',
    reference: { value: 320, label: 'Soll 320' },
    bars: [301, 296, 248, 290, 287, 262, 288, 286].map((v, i) => ({
      label: hours[i] ?? '',
      value: v,
      display: String(v),
    })),
  },
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Leistung: Story = {};

export const AusschussMitGrenze: Story = {
  args: {
    label: 'Ausschuss je Stunde in Prozent',
    tone: 'secondary',
    max: 8,
    reference: { value: 5, label: '5 %', tone: 'warning' },
    bars: [3.1, 3.2, 5.4, 2.9, 3.0, 3.6, 2.8, 2.9].map((v, i) => ({
      label: hours[i] ?? '',
      value: v,
      display: v.toLocaleString('de-DE'),
      highlight: v > 5,
    })),
  },
};

export const OhneWerte: Story = {
  args: {
    bars: hours.slice(0, 4).map((label) => ({ label, value: null, display: '—' })),
  },
};
