import type { Meta, StoryObj } from '@storybook/react-vite';
import { SignatureDialog } from './SignatureDialog';

const meta = {
  title: 'Plattform/SignatureDialog',
  component: SignatureDialog,
  args: {
    open: true,
    meaning: 'Freigabe',
    subject: 'Batchbericht B-2026-1042',
    onSign: () => undefined,
    onCancel: () => undefined,
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SignatureDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Batchfreigabe: Story = {};
export const MitFehler: Story = { args: { error: 'Benutzer oder Passwort ist falsch.' } };
export const Formatwechsel: Story = {
  args: { meaning: 'Formatwechsel abgeschlossen', subject: 'Vial 10 ml → Vial 20 ml' },
};
