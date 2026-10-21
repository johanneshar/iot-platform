import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { toCss } from './to-css';
import { color, cssVar } from './tokens';

describe('design tokens', () => {
  it('tokens.css ist aktuell zu tokens.ts', () => {
    const file = readFileSync(fileURLToPath(new URL('../tokens.css', import.meta.url)), 'utf8');
    expect(file).toBe(toCss());
  });

  it('enthält die Farben aus CLAUDE.md, Abschnitt 7.1', () => {
    expect(color.primary).toBe('#00847e');
    expect(color.accent).toBe('#00ffc1');
    expect(color['fault-fg']).toBe('#8a1f14');
  });

  it('liefert CSS-Variablen für TypeScript', () => {
    expect(cssVar('color', 'primary')).toBe('var(--color-primary)');
    expect(cssVar('font-size', 'kpi')).toBe('var(--font-size-kpi)');
  });
});
