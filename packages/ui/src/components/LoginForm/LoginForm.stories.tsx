import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoginForm } from './LoginForm';

const meta = {
  title: 'Plattform/LoginForm',
  component: LoginForm,
  args: { productName: 'IoT Plattform', subtitle: 'Linie 1 · Vials', onSubmit: () => undefined },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Anmelden: Story = {};
export const MitFehler: Story = { args: { error: 'Benutzer oder Passwort ist falsch.' } };
export const WirdAngemeldet: Story = { args: { busy: true } };
