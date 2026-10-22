import type { Meta, StoryObj } from '@storybook/react-vite';
import { Placeholder } from '../Placeholder/Placeholder';
import { Panel } from './Panel';

const meta = {
  title: 'Instandhaltung/Panel',
  component: Panel,
  args: { tone: 'neutral' },
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Frage: Story = {
  args: {
    title: 'Ist die Wägezelle frei von Glasbruch und Produktresten?',
    children: (
      <>
        <div>Hinweis: Sichtprüfung über den Handschuheingriff am Isolator</div>
        <Placeholder label="[Bild oder 3D-Ansicht der Baugruppe]" />
      </>
    ),
  },
};

export const Lösung: Story = {
  args: {
    tone: 'solution',
    label: 'Lösung',
    title: 'Wägezelle tauschen',
    children: 'Wägezelle tauschen und mit Prüfgewichten kalibrieren; Freigabe durch QA.',
  },
};
