import { describe, expect, it } from 'vitest';
import { uiTranslations } from './translations';

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('ui-Übersetzungen', () => {
  it('Englisch hat dieselben Schlüssel wie Deutsch', () => {
    expect(keys(uiTranslations.en).sort()).toEqual(keys(uiTranslations.de).sort());
  });
});
