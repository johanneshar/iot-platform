import { describe, expect, it } from 'vitest';
import { formatTimestamp, initials } from './format';

describe('formatTimestamp', () => {
  it('zeigt UTC in Ortszeit des Standorts', () => {
    expect(formatTimestamp('2026-10-21T12:20:05.000Z', 'Europe/Berlin', 'de')).toBe(
      '21.10.26, 14:20:05',
    );
  });
});

describe('initials', () => {
  it('nimmt die ersten Buchstaben ohne Klammern', () => {
    expect(initials('[Setup Man]')).toBe('SM');
    expect(initials('Service')).toBe('S');
    expect(initials('[Benutzer Name Lang]')).toBe('BN');
  });
});
