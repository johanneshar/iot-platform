import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LineSwitch } from './LineSwitch';

afterEach(cleanup);

describe('LineSwitch', () => {
  it('wechselt die Linie', () => {
    const onChange = vi.fn();
    render(
      <LineSwitch
        label="Linie wählen"
        lines={[
          { id: 'l1', label: 'Linie 1 · Vials' },
          { id: 'l2', label: 'Linie 2 · Spritzen' },
        ]}
        value="l1"
        onChange={onChange}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Linie 1 · Vials' }).getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Linie 2 · Spritzen' }));
    expect(onChange).toHaveBeenCalledWith('l2');
  });
});
