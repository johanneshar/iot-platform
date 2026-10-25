import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadProcedures, parseProcedure } from '../backend/procedures';
import { checkProcedure, scanMatches, stepAuditValue, type Procedure } from '../shared/format';

const DIR = fileURLToPath(
  new URL('../../../packages/simulator/fixtures/format-procedures', import.meta.url),
);
const FLEXFILL = ['l3-iso', 'l3-debag', 'l3-delid', 'l3-fill', 'l3-transfer', 'l3-cap'];

describe('Ablauf Flexfill Vial → Spritze (E-51)', () => {
  const { procedures, rejected } = loadProcedures(DIR);
  const procedure = procedures.find((p) => p.id === 'flexfill-vial-spritze');
  if (!procedure) throw new Error('Ablauf fehlt');

  it('ist gültig und hat mindestens 25 Schritte', () => {
    expect(rejected).toEqual({});
    expect(procedure.steps.length).toBeGreaterThanOrEqual(25);
    expect(checkProcedure(procedure, FLEXFILL)).toEqual([]);
    expect(procedure.from.recipe).toEqual({ id: 'vial-nest', version: 1 });
    expect(procedure.to.recipe).toEqual({ id: 'syringe-nest', version: 1 });
  });

  it('beginnt mit „Linie leerfahren“ (automatische Prüfung) und berührt jede Maschine', () => {
    expect(procedure.steps[0]).toMatchObject({ id: 'leerfahren', check: 'line-stopped' });
    const machines = new Set(procedure.steps.map((s) => s.machine).filter((m) => m !== null));
    expect([...machines].sort()).toEqual([...FLEXFILL].sort());
  });

  it('Formatteile entsprechen den Formatteilen des Rezepts im Simulator', () => {
    const parts = procedure.steps.flatMap((s) => (s.part ? [s.part.id] : []));
    expect(parts).toEqual([
      'FT-3301',
      'FT-3311',
      'FT-3312',
      'FT-3320',
      'FT-3321',
      'FT-3322',
      'FT-3323',
      'FT-3324',
      'FT-3330',
      'FT-3331',
    ]);
  });
});

describe('Prüfung von Abläufen', () => {
  const base: Procedure = {
    id: 'test',
    version: 1,
    title: { de: 'Test' },
    from: { format: { de: 'A' }, recipe: { id: 'a', version: 1 } },
    to: { format: { de: 'B' }, recipe: { id: 'b', version: 1 } },
    plannedMinutes: 10,
    steps: [
      { id: 's1', title: { de: 'Eins' }, machine: null, text: { de: '…' } },
      {
        id: 's2',
        title: { de: 'Zwei' },
        machine: 'l3-fill',
        text: { de: '…' },
        part: { id: 'FT-1', slot: 'PLATZ-1' },
      },
    ],
  };

  it('Schema: Pflichtfelder und Formate', () => {
    expect('procedure' in parseProcedure(base)).toBe(true);
    const result = parseProcedure({ ...base, steps: [] });
    expect('errors' in result && result.errors.join()).toMatch(/steps/);
    expect('errors' in parseProcedure({ ...base, id: 'Mit Leerzeichen' })).toBe(true);
  });

  it('erkennt doppelte Schritte, Einbauplätze, fremde Maschinen und gleiches Rezept', () => {
    const [s1, s2] = base.steps;
    if (!s1 || !s2) throw new Error('Schritte fehlen');
    expect(
      checkProcedure(
        {
          ...base,
          to: base.from,
          steps: [s1, s1, s2, { ...s2, id: 's3', machine: 'l9-x' }],
        },
        ['l3-fill'],
      ),
    ).toEqual([
      'Schritt s1 doppelt',
      'Einbauplatz PLATZ-1 doppelt',
      'Schritt s3: Maschine l9-x gehört nicht zur Linie',
      'Ausgangs- und Zielrezept sind gleich',
    ]);
  });

  it('Codes am Teil und am Einbauplatz müssen passen (E-17)', () => {
    const step = base.steps[1];
    if (!step) throw new Error('Schritt fehlt');
    expect(scanMatches(step, null)).toBe(false);
    expect(scanMatches(step, { part: 'FT-1', slot: 'PLATZ-2', source: 'scanner' })).toBe(false);
    const scans = { part: 'FT-1', slot: 'PLATZ-1', source: 'manual' } as const;
    expect(scanMatches(step, scans)).toBe(true);
    expect(stepAuditValue(step, scans)).toBe('s2: FT-1 @ PLATZ-1 (manual)');
    expect(scanMatches(base.steps[0] ?? step, null)).toBe(true);
  });
});
