import { describe, expect, it } from 'vitest';
import { matches, requestMachine } from '../frontend/pages/SparesPage';
import type { Part } from '../shared/spares';

const part = (id: string, name: string, machines: string[]): Part => ({
  id,
  name: { de: name, en: `${name} (en)` },
  group: 'Dosierung',
  machines,
  stock: 1,
  leadDays: 2,
});

describe('Suche', () => {
  const pump = part('ET-10233', 'Pumpenkopf Dosierpumpe', ['l3-fill']);
  it('findet Teilenummer und Bezeichnung ohne Groß-/Kleinschreibung', () => {
    expect(matches(pump, 'et-102', 'de')).toBe(true);
    expect(matches(pump, 'PUMPENKOPF', 'de')).toBe(true);
    expect(matches(pump, '(en)', 'en')).toBe(true);
    expect(matches(pump, 'Wägezelle', 'de')).toBe(false);
    expect(matches(pump, '  ', 'de')).toBe(true);
  });
});

describe('Maschine der Anfrage', () => {
  const fill = part('ET-1', 'A', ['l3-fill']);
  const trf = part('FT-2', 'B', ['l3-transfer']);
  it('nimmt die gewählte Maschine, sonst die gemeinsame der Teile', () => {
    expect(requestMachine([fill, trf], 'l3-fill')).toBe('l3-fill');
    expect(requestMachine([fill, fill], null)).toBe('l3-fill');
    expect(requestMachine([fill, trf], null)).toBeNull();
    expect(requestMachine([], null)).toBeNull();
  });
});
