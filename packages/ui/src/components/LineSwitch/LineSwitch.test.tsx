import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LineSwitch } from './LineSwitch';

afterEach(cleanup);

const lines = [
  { id: 'l1', label: 'Linie 1 · Vials' },
  { id: 'l2', label: 'Linie 2 · Spritzen' },
];

describe('LineSwitch', () => {
  it('zeigt die gewählte Linie und alle Linien als Auswahl', () => {
    render(<LineSwitch label="Linie wählen" lines={lines} value="l2" onChange={vi.fn()} />);
    const select = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Linie wählen' });
    expect(select.value).toBe('l2');
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('meldet den Wechsel der Linie', () => {
    const onChange = vi.fn();
    render(<LineSwitch label="Linie wählen" lines={lines} value="l1" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'l2' } });
    expect(onChange).toHaveBeenCalledWith('l2');
  });
});
