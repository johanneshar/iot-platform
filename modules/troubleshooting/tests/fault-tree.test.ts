import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadTrees } from '../backend/trees';
import { answer, back, currentNode, startFlow } from '../frontend/flow';
import { checkTree, type FaultTree } from '../shared/fault-tree';

const FIXTURES = fileURLToPath(
  new URL('../../../packages/simulator/fixtures/fault-trees', import.meta.url),
);

const small = (): FaultTree => ({
  id: 'test',
  version: 1,
  title: { de: 'Test' },
  machineType: 'Prüfmaschine',
  alarmIds: ['TEST-0001'],
  start: 'q1',
  nodes: {
    q1: { type: 'question', text: { de: 'Frage?' }, yes: 'r1', no: 'r2' },
    r1: { type: 'result', text: { de: 'Lösung 1' }, detail: { de: 'Detail' } },
    r2: { type: 'result', text: { de: 'Lösung 2' }, detail: { de: 'Detail' }, part: 'ET-1' },
  },
});

describe('checkTree', () => {
  it('akzeptiert einen gültigen Baum', () => {
    expect(checkTree(small())).toEqual([]);
  });

  it('meldet fehlende Ziele', () => {
    const tree = small();
    tree.nodes['q1'] = { type: 'question', text: { de: 'Frage?' }, yes: 'r1', no: 'fehlt' };
    expect(checkTree(tree)).toEqual(['q1: Ziel „fehlt“ fehlt']);
  });

  it('meldet Schleifen und unerreichbare Knoten', () => {
    const tree = small();
    tree.nodes['q1'] = { type: 'question', text: { de: 'Frage?' }, yes: 'q2', no: 'r1' };
    tree.nodes['q2'] = { type: 'question', text: { de: 'Noch einmal?' }, yes: 'q1', no: 'r1' };
    const errors = checkTree(tree);
    expect(errors.some((e) => e.startsWith('Schleife'))).toBe(true);
    expect(errors).toContain('r2 ist nicht erreichbar');
  });
});

describe('loadTrees', () => {
  it('lädt die Fehlerbäume des Simulators ohne Fehler', () => {
    const { trees, rejected } = loadTrees(FIXTURES);
    expect(rejected).toEqual({});
    expect(trees.map((t) => t.alarmIds).flat()).toEqual(
      expect.arrayContaining(['FILL-WGT-0003', 'FILL-CAP-0001', 'FILL-STP-0001']),
    );
  });

  it('weist ungültige Dateien ab', () => {
    const dir = mkdtempSync(join(tmpdir(), 'trees-'));
    writeFileSync(join(dir, 'kaputt.json'), '{');
    writeFileSync(join(dir, 'ohne-start.json'), JSON.stringify({ ...small(), start: undefined }));
    writeFileSync(join(dir, 'gut.json'), JSON.stringify(small()));
    const { trees, rejected } = loadTrees(dir);
    expect(trees.map((t) => t.id)).toEqual(['test']);
    expect(Object.keys(rejected).sort()).toEqual(['kaputt.json', 'ohne-start.json']);
  });
});

describe('Ablauf', () => {
  it('folgt den Antworten und geht zurück', () => {
    const tree = small();
    let state = startFlow(tree);
    state = answer(tree, state, false);
    expect(currentNode(tree, state)).toMatchObject({ type: 'result', part: 'ET-1' });
    expect(state.path).toEqual([{ node: 'q1', answer: 'no' }]);
    // Auf einer Lösung ändert eine Antwort nichts
    expect(answer(tree, state, true)).toBe(state);
    state = back(tree, state);
    expect(state).toEqual(startFlow(tree));
  });
});
