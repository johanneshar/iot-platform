import type { Meta, StoryObj } from '@storybook/react-vite';
import { SuccessNote } from './SuccessNote';

const meta = {
  title: 'Grundlagen/SuccessNote',
  component: SuccessNote,
  args: {
    title: 'Anfrage übermittelt.',
    children: 'Mit Maschinen-Nr., Linie und aktuellem Zustand – Ticket [Nr.]',
  },
} satisfies Meta<typeof SuccessNote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Anfrage: Story = {};
export const Signiert: Story = {
  args: {
    title: 'Signiert',
    children: (
      <>
        von [Benutzer]
        <br />
        Bedeutung: Freigabe · im Audit Trail erfasst
      </>
    ),
  },
};
