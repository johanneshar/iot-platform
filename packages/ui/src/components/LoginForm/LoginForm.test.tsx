import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { LoginForm } from './LoginForm';

afterEach(cleanup);

describe('LoginForm', () => {
  it('meldet Benutzer und Passwort', async () => {
    const onSubmit = vi.fn();
    await renderUi(<LoginForm productName="IoT Plattform" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Benutzer'), { target: { value: ' qa ' } });
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'geheim' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(onSubmit).toHaveBeenCalledWith('qa', 'geheim');
  });

  it('zeigt Fehler als Meldung', async () => {
    await renderUi(
      <LoginForm
        productName="IoT Plattform"
        error="Benutzer oder Passwort ist falsch."
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert').textContent).toBe('Benutzer oder Passwort ist falsch.');
  });
});
