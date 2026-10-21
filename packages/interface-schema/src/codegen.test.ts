import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateTypes } from './codegen';

describe('generierte Typen', () => {
  it('sind aktuell zu den Schemas', async () => {
    const file = readFileSync(
      fileURLToPath(new URL('./generated/types.ts', import.meta.url)),
      'utf8',
    );
    expect(file).toBe(await generateTypes());
  });
});
