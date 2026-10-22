import type { Meta, StoryObj } from '@storybook/react-vite';
import { StateTimeline } from './StateTimeline';

const meta = {
  title: 'Auswertung/StateTimeline',
  component: StateTimeline,
  args: {
    label: 'Zustandsverlauf seit Schichtbeginn 06:00',
    ticks: ['06:00', '08:00', '10:00', '12:00', '14:00'],
    segments: [
      { state: 'Execute', duration: 118, description: 'Execute ab 06:00, 1 h 58 min' },
      { state: 'Suspended', duration: 13, description: 'Suspended ab 07:58, 13 min' },
      { state: 'Execute', duration: 161, description: 'Execute ab 08:11, 2 h 41 min' },
      { state: 'Held', duration: 18, description: 'Held ab 10:52, 18 min' },
      { state: 'Execute', duration: 160, description: 'Execute ab 11:10, 2 h 40 min' },
      { state: 'Idle', duration: 10, description: 'Idle ab 13:50, 10 min' },
    ],
  },
} satisfies Meta<typeof StateTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Schicht: Story = {};
