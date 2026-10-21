import { describe, expect, it } from 'vitest';
import { parseGermanNumber } from './parse';
import { localTimeToUtc } from './time';

describe('localTimeToUtc', () => {
  it('rechnet Sommerzeit (MESZ) um', () => {
    expect(
      localTimeToUtc('06:14', 'Europe/Berlin', new Date('2026-10-21T12:00:00Z')).toISOString(),
    ).toBe('2026-10-21T04:14:00.000Z');
  });

  it('rechnet Winterzeit (MEZ) um', () => {
    expect(
      localTimeToUtc('06:14', 'Europe/Berlin', new Date('2026-12-01T12:00:00Z')).toISOString(),
    ).toBe('2026-12-01T05:14:00.000Z');
  });

  it('nimmt den Kalendertag der Zeitzone, nicht von UTC', () => {
    // 23:30 UTC am 21.10. ist in Berlin schon der 22.10.
    expect(
      localTimeToUtc('06:00', 'Europe/Berlin', new Date('2026-10-21T23:30:00Z')).toISOString(),
    ).toBe('2026-10-22T04:00:00.000Z');
  });
});

describe('parseGermanNumber', () => {
  it.each([
    ['82,1 °C', 82.1],
    ['58.410', 58410],
    ['0,031 g', 0.031],
    ['6 / 6', 6],
    ['412 Tubs', 412],
    ['99,7 %', 99.7],
  ])('%s → %d', (text, expected) => {
    expect(parseGermanNumber(text)).toBe(expected);
  });
});
