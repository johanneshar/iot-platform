import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilterGroup } from './FilterGroup';

afterEach(cleanup);

const options = [
  { value: 'all', label: 'Alle' },
  { value: 'fault', label: 'Störung' },
] as const;

describe('FilterGroup', () => {
  it('markiert die aktive Option und meldet Wechsel', () => {
    const onChange = vi.fn();
    render(
      <FilterGroup label="Alarmklasse filtern" options={options} value="all" onChange={onChange} />,
    );
    expect(screen.getByRole('group', { name: 'Alarmklasse filtern' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Alle' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Störung' }));
    expect(onChange).toHaveBeenCalledWith('fault');
  });
});
