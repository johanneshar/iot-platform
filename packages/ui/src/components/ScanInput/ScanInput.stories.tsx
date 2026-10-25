import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ScanInput, type ScanInputProps } from './ScanInput';

const meta = {
  title: 'Grundlagen/ScanInput',
  component: ScanInput,
  args: { label: 'Code am Formatteil', onScan: () => undefined },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScanInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Leer: Story = {
  render: function Render(args) {
    const [status, setStatus] = useState<ScanInputProps['status']>();
    return (
      <ScanInput
        {...args}
        status={status}
        onScan={(code, source) => {
          setStatus(
            code === 'FT-3320'
              ? { tone: 'ok', message: `✓ ${code} geprüft (${source})` }
              : { tone: 'error', message: `${code} passt nicht – erwartet FT-3320` },
          );
        }}
      />
    );
  },
};
export const Geprueft: Story = { args: { status: { tone: 'ok', message: '✓ FT-3320 geprüft' } } };
export const Falsch: Story = {
  args: { status: { tone: 'error', message: 'FT-3110 passt nicht – erwartet FT-3320' } },
};
