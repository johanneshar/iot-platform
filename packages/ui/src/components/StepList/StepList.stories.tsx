import { batchSteps, formatChangeSteps, weighCellTree } from '@iot/simulator/fixtures/mockup';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StepList, StepTrail, type StepStatus } from './StepList';

const status = (index: number, current: number): StepStatus =>
  index < current ? 'done' : index === current ? 'current' : 'upcoming';

const meta = {
  title: 'Grundlagen/StepList',
  component: StepList,
  args: {
    label: 'Batch-Verlauf',
    variant: 'pills',
    steps: batchSteps.map((label, i) => ({ id: label, label, status: status(i, 2) })),
  },
} satisfies Meta<typeof StepList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BatchVerlauf: Story = {};

export const Formatwechsel: Story = {
  args: {
    label: 'Schritte Formatwechsel',
    variant: 'list',
    steps: formatChangeSteps('Vial 20 ml').map((s, i) => ({
      id: s.title,
      label: s.title,
      detail: s.machine,
      status: status(i, 2),
    })),
  },
  render: (args) => (
    <div style={{ maxWidth: 360 }}>
      <StepList {...args} />
    </div>
  ),
};

export const BisherigerWeg: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <StepTrail
        label="Bisheriger Weg"
        steps={weighCellTree.questions.slice(0, 2).map((q, i) => ({
          id: String(i),
          question: q.q,
          answer: 'Ja',
        }))}
      />
    </div>
  ),
};
