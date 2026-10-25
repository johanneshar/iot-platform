import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { PartCard } from './PartCard';

const meta = {
  title: 'Instandhaltung/PartCard',
  component: PartCard,
  args: {
    id: 'ET-10233',
    name: 'Pumpenkopf Dosierpumpe',
    group: 'Dosierung',
    stock: 2,
    leadTime: '3 Tage',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 280 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PartCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vorraetig: Story = {
  render: function Render(args) {
    const [inRequest, setInRequest] = useState(false);
    return (
      <PartCard
        {...args}
        inRequest={inRequest}
        onToggle={() => {
          setInRequest((v) => !v);
        }}
      />
    );
  },
};
export const InDerAnfrageliste: Story = { args: { inRequest: true, onToggle: () => undefined } };
export const NichtVorraetig: Story = {
  args: {
    id: 'ET-20418',
    name: 'Magnetkupplung Verschließkopf',
    group: 'Verschließen',
    stock: 0,
    leadTime: '10 Tage',
    onToggle: () => undefined,
  },
};
export const OhneAnfrageRecht: Story = {};
