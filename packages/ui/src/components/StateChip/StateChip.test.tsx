import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PACKML_STATES, StateChip, stateTone } from './StateChip';

afterEach(cleanup);

describe('stateTone', () => {
  it('bildet die Zustände nach CLAUDE.md 7.1 ab', () => {
    expect(stateTone('Execute')).toBe('accent');
    expect(stateTone('Suspended')).toBe('warning');
    expect(stateTone('Held')).toBe('fault');
    expect(stateTone('Idle')).toBe('neutral');
    expect(stateTone('Stopped')).toBe('neutral');
  });

  it('kennt alle 17 PackML-Zustände', () => {
    expect(PACKML_STATES).toHaveLength(17);
  });
});

describe('StateChip', () => {
  it('zeigt Präfix und Zustand', () => {
    render(<StateChip state="Held" prefix="Linie:" />);
    expect(screen.getByText('Linie: Held')).toBeDefined();
  });
});
