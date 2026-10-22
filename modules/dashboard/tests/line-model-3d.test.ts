import { mkdtempSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadLineModel } from '../backend/line-model-3d';

const MODELS = fileURLToPath(
  new URL('../../../packages/simulator/fixtures/models', import.meta.url),
);
const log: string[] = [];
const model = loadLineModel(MODELS, 'l3', (m) => log.push(m));
const nodesOf = (id: string) => model?.info.machines.find((m) => m.machineId === id)?.nodes ?? [];

describe('3D-Zuordnung der Flexfill (ADR-010)', () => {
  it('findet die Zuordnung für Linie 3 und keine für andere Linien', () => {
    expect(model).not.toBeNull();
    expect(loadLineModel(MODELS, 'l9', () => undefined)).toBeNull();
    expect(log).toEqual([]);
  });

  it('ordnet die Abschnitte den Maschinen zu; der Isolator hat Vorrang für seine Teile', () => {
    expect(nodesOf('l3-debag')).toEqual(
      expect.arrayContaining(['Vormodul_Kammer_01', 'Vormodul_Ablage_01']),
    );
    expect(nodesOf('l3-delid')).toEqual(expect.arrayContaining(['Prozessmodul_01']));
    expect(nodesOf('l3-fill')).toEqual(
      expect.arrayContaining(['Prozessmodul_02', 'Unterbau_Tuer_05']),
    );
    expect(nodesOf('l3-transfer')).toEqual(expect.arrayContaining(['Prozessmodul_03']));
    expect(nodesOf('l3-cap')).toEqual(
      expect.arrayContaining(['Prozessmodul_04', 'Auslaufband_01']),
    );
    expect(nodesOf('l3-iso')).toEqual(
      expect.arrayContaining([
        'Isolator_Rueckwand_02',
        'Handschuheingriff_05',
        'Oberbau_01',
        'HVAC_Einheit_01',
      ]),
    );
    expect(nodesOf('l3-fill')).not.toContain('Isolator_Rueckwand_02');
    // Teile über mehrere Maschinen (Unterbau) gehören zur Linie, nicht zu einer Maschine
    expect(model?.info.machines.some((m) => m.nodes.includes('Unterbau_01'))).toBe(false);
  });

  it('setzt Alarmstellen auf Position oder Mitte eines Knotens', () => {
    const robot = model?.info.alarms.find((a) => a.alarmId === 'TRF-ROB-0001');
    expect(robot?.position[0]).toBeCloseTo((7.35 + 9.9) / 2, 1);
    expect(model?.info.alarms.find((a) => a.alarmId === 'FILL-WGT-0003')?.position).toEqual([
      5.6, 1.25, 0.2,
    ]);
  });

  it('weist ungültige Zuordnungen mit Begründung ab', () => {
    const dir = mkdtempSync(join(tmpdir(), 'models-'));
    copyFileSync(join(MODELS, 'flexfill_blockmodell.glb'), join(dir, 'm.glb'));
    writeFileSync(
      join(dir, 'kaputt.model.json'),
      JSON.stringify({ lineId: 'l9', model: 'm.glb', machines: [{ machineId: 'x' }] }),
    );
    writeFileSync(
      join(dir, 'fehlt.model.json'),
      JSON.stringify({
        lineId: 'l9',
        model: 'nicht-da.glb',
        machines: [{ machineId: 'x', nodes: ['*'] }],
      }),
    );
    const messages: string[] = [];
    expect(loadLineModel(dir, 'l9', (m) => messages.push(m))).toBeNull();
    expect(messages).toHaveLength(2);
  });
});
