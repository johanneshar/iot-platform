import { lines, troubleTrees } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChoiceButton } from './ChoiceButton';

const line = lines[0];
const meta = {
  title: 'Grundlagen/ChoiceButton',
  component: ChoiceButton,
  args: { title: 'Wägezelle 3: Tara-Abweichung' },
} satisfies Meta<typeof ChoiceButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NachSymptom: Story = {
  render: () => (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', maxWidth: 480 }}
    >
      {troubleTrees.map((title) => (
        <ChoiceButton key={title} title={title} />
      ))}
    </div>
  ),
};

export const ZuAktivemAlarm: Story = {
  args: { subtitle: 'Füll- und Verschließmaschine · 13:48' },
};

export const Zielformat: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-choice-min), 1fr))',
        gap: 'var(--space-12)',
      }}
    >
      {line?.targets.map((t) => (
        <ChoiceButton
          key={t.name}
          variant="card"
          title={t.name}
          subtitle={`7 Schritte · Vorgabezeit ${t.time}`}
        />
      ))}
    </div>
  ),
};
