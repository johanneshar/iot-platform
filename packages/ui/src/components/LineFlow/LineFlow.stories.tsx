import { lines } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { LineFlow, type LineFlowMachine } from './LineFlow';

function toFlow(lineIndex: number): LineFlowMachine[] {
  return (lines[lineIndex]?.machines ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    kind: m.kind,
    levelLabel: m.level,
    state: m.state,
    rate: m.rate,
    oee: m.oee,
    bottleneck: m.bottleneck ?? false,
  }));
}

const meta = {
  title: 'Linie/LineFlow',
  component: LineFlow,
  args: {
    title: 'Linienfluss',
    subtitle: 'Maschine anklicken für Details · Engpass bestimmt die Linienleistung',
    machines: toFlow(0),
    selectedId: 'l1-fill',
  },
} satisfies Meta<typeof LineFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Linie1Vials: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState(args.selectedId);
    return <LineFlow {...args} selectedId={selected} onSelect={setSelected} />;
  },
};

export const Linie2Spritzen: Story = {
  args: { machines: toFlow(1), selectedId: 'l2-fill' },
};
