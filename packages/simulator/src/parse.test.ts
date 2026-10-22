import { describe, expect, it } from 'vitest';
import { parseGermanNumber } from './parse';

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
