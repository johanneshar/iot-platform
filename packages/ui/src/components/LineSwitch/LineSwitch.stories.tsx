import { lines } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { LineSwitch } from './LineSwitch';

const options = lines.map((l) => ({ id: l.id, label: l.name }));

const meta = {
  title: 'Layout/LineSwitch',
  component: LineSwitch,
  args: { label: 'Linie wählen', lines: options, value: 'l1', onChange: () => undefined },
} satisfies Meta<typeof LineSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ZweiLinien: Story = {
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <LineSwitch {...args} value={value} onChange={setValue} />;
  },
};
