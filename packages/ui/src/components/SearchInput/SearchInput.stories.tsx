import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SearchInput } from './SearchInput';

const meta = {
  title: 'Grundlagen/SearchInput',
  component: SearchInput,
  args: {
    label: 'Suche',
    value: '',
    placeholder: 'Teilenummer oder Bezeichnung',
    onChange: () => undefined,
  },
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Leer: Story = {
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <SearchInput {...args} value={value} onChange={setValue} />;
  },
};
export const MitSuchbegriff: Story = { args: { value: 'ET-10233' } };
