import { describe, expect, it } from 'vitest';
import { validateManifest } from './validate-manifest';

const valid = {
  id: 'example',
  version: '0.1.0',
  name: { de: 'Beispielmodul', en: 'Example module' },
  description: { de: 'Zeigt, wie ein Modul aufgebaut ist' },
  category: 'Produktion',
  gxp: false,
  minConformance: 'basic',
  nav: { section: 'Linie', order: 90, icon: 'overview' },
  routes: [{ path: '', title: { de: 'Beispiel' } }],
  permissions: ['example.view'],
  entry: 'http://localhost:4100/entry.js',
};

describe('validateManifest', () => {
  it('nimmt ein vollständiges Manifest an', () => {
    expect(validateManifest(valid)).toEqual({ ok: true, manifest: valid });
  });

  it('meldet alle Fehler auf einmal', () => {
    const result = validateManifest({ ...valid, id: 'Example', category: 'Sonstiges', routes: [] });
    expect(result.ok).toBe(false);
    // id, category, routes – und das Recht passt nicht mehr zur (ungültigen) id
    if (!result.ok) expect(result.errors).toHaveLength(4);
  });

  it('verlangt Rechte mit Modulpräfix', () => {
    const result = validateManifest({ ...valid, permissions: ['alarms.acknowledge'] });
    expect(result.ok).toBe(false);
  });

  it('verlangt deutschen Namen', () => {
    expect(validateManifest({ ...valid, name: { en: 'Example' } }).ok).toBe(false);
  });

  it('prüft die Beschriftung in der Navigation', () => {
    expect(
      validateManifest({ ...valid, nav: { ...valid.nav, label: { de: 'Beispiel' } } }).ok,
    ).toBe(true);
    expect(validateManifest({ ...valid, nav: { ...valid.nav, label: { en: 'Example' } } }).ok).toBe(
      false,
    );
  });

  it('lehnt reservierte IDs ab', () => {
    const result = validateManifest({ ...valid, id: 'baukasten', permissions: [] });
    expect(result.ok).toBe(false);
  });

  it('verlangt die Adresse des Einstiegsmoduls', () => {
    expect(validateManifest({ ...valid, entry: '' }).ok).toBe(false);
  });
});
