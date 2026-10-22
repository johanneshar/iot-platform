import { describe, expect, it } from 'vitest';
import { currentShift, localTimeToUtc } from './local-time';

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

describe('currentShift', () => {
  const shifts = [
    { start: '06:00', end: '14:00' },
    { start: '14:00', end: '22:00' },
    { start: '22:00', end: '06:00' },
  ];

  it('findet die Frühschicht', () => {
    const shift = currentShift(shifts, 'Europe/Berlin', new Date('2026-10-21T10:00:00Z'));
    expect(shift?.start.toISOString()).toBe('2026-10-21T04:00:00.000Z');
    expect(shift?.end.toISOString()).toBe('2026-10-21T12:00:00.000Z');
  });

  it('findet die Nachtschicht über Mitternacht', () => {
    const shift = currentShift(shifts, 'Europe/Berlin', new Date('2026-10-22T02:00:00Z'));
    expect(shift?.start.toISOString()).toBe('2026-10-21T20:00:00.000Z');
    expect(shift?.end.toISOString()).toBe('2026-10-22T04:00:00.000Z');
  });

  it('liefert null außerhalb aller Schichten', () => {
    expect(
      currentShift(
        [{ start: '06:00', end: '14:00' }],
        'Europe/Berlin',
        new Date('2026-10-21T18:00:00Z'),
      ),
    ).toBeNull();
  });
});
