import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta = {
  title: 'Grundlagen/Button',
  component: Button,
  args: { children: 'Modul aktivieren', variant: 'primary', size: 'md' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Outline: Story = { args: { variant: 'outline', children: 'Zum Baukasten' } };
export const Ghost: Story = {
  args: { variant: 'ghost', size: 'sm', children: 'Andere Störung wählen' },
};
export const Accent: Story = { args: { variant: 'accent', children: 'Aktiv – deaktivieren' } };
export const Small: Story = {
  args: { variant: 'outline', size: 'sm', children: 'Fehlersuche starten' },
};
export const Disabled: Story = { args: { disabled: true, children: 'Schritt bestätigen' } };
export const FullWidth: Story = { args: { fullWidth: true, children: 'Elektronisch signieren' } };

export const AlleVarianten: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-12)' }}>
      <Button>Quittieren</Button>
      <Button variant="outline">Zum Baukasten</Button>
      <Button variant="accent">✓ In der Anfrageliste</Button>
      <Button variant="ghost">Andere Störung wählen</Button>
      <Button size="sm">Quittieren</Button>
      <Button size="sm" variant="outline">
        Fehlersuche
      </Button>
    </div>
  ),
};
