import { describe, expect, it } from 'vitest';
import { counterStep } from './counters';

const MIN = 60_000;
const reading = (
  ts: number,
  total: number,
  resetAt = '2026-10-22T04:00:00.000Z',
  good = total,
) => ({
  ts,
  good,
  total,
  resetAt,
});
const T = Date.parse('2026-10-22T10:00:00.000Z');

describe('counterStep', () => {
  it('zählt normale Zuwächse', () => {
    expect(counterStep(reading(T, 1000), reading(T + MIN, 1300, undefined, 1290), 320)).toEqual({
      good: 290,
      total: 300,
      step: 'count',
    });
  });

  it('zählt nach einem Reset zwischen den Ständen den neuen Stand', () => {
    const reset = new Date(T + 30_000).toISOString();
    expect(counterStep(reading(T, 5000), reading(T + MIN, 100, reset), 320)).toMatchObject({
      total: 100,
      step: 'reset',
    });
  });

  it('Reset vor dem letzten Stand oder Rücksprung ohne Reset: neuer Bezugspunkt ohne Menge', () => {
    expect(
      counterStep(reading(T, 5000), reading(T + MIN, 4000, '2026-10-22T03:00:00.000Z'), 320).step,
    ).toBe('rebase');
    expect(counterStep(reading(T, 5000), reading(T + MIN, 4000), 320)).toEqual({
      good: 0,
      total: 0,
      step: 'implausible',
    });
  });

  it('mehr, als die Maschine schaffen kann, zählt nicht', () => {
    expect(counterStep(reading(T, 1000), reading(T + 5_000, 60_000), 320).step).toBe('implausible');
    // ohne Sollleistung keine Prüfung
    expect(counterStep(reading(T, 1000), reading(T + 5_000, 60_000), null).step).toBe('count');
  });
});
