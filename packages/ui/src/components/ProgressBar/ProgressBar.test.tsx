import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

afterEach(cleanup);

describe('ProgressBar', () => {
  it('meldet den Wert an Screenreader', () => {
    render(<ProgressBar value={62} label="Fortschritt Batch" />);
    const bar = screen.getByRole('progressbar', { name: 'Fortschritt Batch' });
    expect(bar.getAttribute('aria-valuenow')).toBe('62');
  });

  it('begrenzt Werte auf 0–100', () => {
    render(<ProgressBar value={140} label="zu viel" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });
});
