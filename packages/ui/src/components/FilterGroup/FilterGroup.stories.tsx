import { moduleCategories, partGroups } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FilterGroup } from './FilterGroup';

const alarmClasses = ['Alle', 'Störung', 'Warnung', 'Info'].map((c) => ({ value: c, label: c }));

const meta = {
  title: 'Grundlagen/FilterGroup',
  component: FilterGroup,
  args: {
    label: 'Alarmklasse filtern',
    options: alarmClasses,
    value: 'Alle',
    onChange: () => undefined,
  },
} satisfies Meta<typeof FilterGroup<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Alarmklasse: Story = {
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <FilterGroup {...args} value={value} onChange={setValue} />;
  },
};

export const Baugruppe: Story = {
  args: {
    label: 'Baugruppe filtern',
    options: partGroups.map((g) => ({ value: g, label: g })),
    value: 'Wägung',
  },
};

export const Modulkategorie: Story = {
  args: {
    label: 'Modulkategorie filtern',
    options: moduleCategories.map((c) => ({ value: c, label: c })),
  },
};
