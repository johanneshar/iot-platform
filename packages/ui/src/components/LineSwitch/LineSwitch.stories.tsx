import { lines } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { LineSwitch } from './LineSwitch';

const options = lines.map((l) => ({ id: l.id, label: l.name }));

const meta = {
  title: 'Layout/LineSwitch',
  component: LineSwitch,
  args: { label: 'Linie wählen', lines: options, value: 'l1', onChange: () => undefined },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <LineSwitch {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof LineSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ZweiLinien: Story = {};

/** Mehr Linien als im Mockup – Namen sind Platzhalter, keine echten Daten. */
export const VieleLinien: Story = {
  args: {
    lines: [
      ...options,
      { id: 'l3', label: '[Linie 3]' },
      { id: 'l4', label: '[Linie 4]' },
      { id: 'l5', label: '[Linie 5]' },
    ],
  },
};
