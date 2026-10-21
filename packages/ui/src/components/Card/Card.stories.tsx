import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip } from '../Chip/Chip';
import { StateChip } from '../StateChip/StateChip';
import { Card, CardHeader } from './Card';

const meta = {
  title: 'Grundlagen/Card',
  component: Card,
  args: { padding: 'md', gap: '14', children: null },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MitÜberschrift: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader title="Batchbericht" />
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
        Enthält Prozesswerte aller Maschinen der Linie mit Quelle, Quellzeitstempel und
        Qualitätsstatus.
      </p>
    </Card>
  ),
};

export const MitUntertitel: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader title="Top-Störungen" subtitle="Stillstandszeit der letzten 7 Tage" />
    </Card>
  ),
};

export const MitChipRechts: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader title="Anstehende Alarme" aside={<Chip>3 aktiv</Chip>} />
    </Card>
  ),
};

export const Detailtitel: Story = {
  render: (args) => (
    <Card {...args} gap="18">
      <CardHeader
        eyebrow="Maschinendetails"
        title="Füll- und Verschließmaschine"
        size="detail"
        aside={<StateChip state="Execute" prefix="PackML:" />}
      />
    </Card>
  ),
};

export const DetailtitelGroß: Story = {
  render: (args) => (
    <Card {...args} gap="20">
      <CardHeader
        eyebrow="Laufender Batch"
        title="B-2026-1042"
        detail="[Produktname] · Rezept Vial 10 ml · v3"
        size="detailLg"
        aside={<Chip tone="accent">In Produktion</Chip>}
      />
    </Card>
  ),
};

export const Hervorgehoben: Story = {
  args: { highlighted: true, padding: 'sm' },
  render: (args) => (
    <Card {...args}>
      <CardHeader title="Ausgewählt" />
    </Card>
  ),
};
