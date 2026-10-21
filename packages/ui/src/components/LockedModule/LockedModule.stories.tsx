import { modules } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LockedModule } from './LockedModule';

const cm = modules.find((m) => m.id === 'condition-monitoring');

const meta = {
  title: 'Plattform/LockedModule',
  component: LockedModule,
  args: {
    moduleName: cm?.name ?? '',
    description: cm?.description ?? '',
    onActivate: () => undefined,
    onOpenCatalog: () => undefined,
  },
} satisfies Meta<typeof LockedModule>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FürAdmin: Story = {};
export const OhneAdminRecht: Story = { args: { onActivate: undefined } };
