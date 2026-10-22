import { validateManifest } from '@iot/module-sdk/manifest';
import { describe, expect, it } from 'vitest';
import { manifest } from '../manifest';

describe('Manifest', () => {
  it('ist gültig', () => {
    const result = validateManifest({ ...manifest, entry: 'http://localhost/entry.js' });
    expect(result.ok ? [] : result.errors).toEqual([]);
  });
});
