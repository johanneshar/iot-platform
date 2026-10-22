import { proxyHeaders, type ProxyUser } from '@iot/module-sdk/server';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../backend/app';
import { SolutionStore } from '../backend/solutions';
import { loadTrees } from '../backend/trees';

const FIXTURES = fileURLToPath(
  new URL('../../../packages/simulator/fixtures/fault-trees', import.meta.url),
);
const TOKEN = 'test-token';
const { trees } = loadTrees(FIXTURES);

const user = (permissions: string[]): ProxyUser => ({
  username: 'm.wagner',
  displayName: 'M. Wagner',
  permissions,
});

describe('API der Fehlersuche', () => {
  let solutions: SolutionStore;
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    solutions = new SolutionStore(':memory:');
    app = buildApp({ trees, solutions, token: TOKEN, logger: false });
  });
  afterEach(async () => {
    await app.close();
    solutions.close();
  });

  const waage = trees.find((t) => t.alarmIds.includes('FILL-WGT-0003'));
  if (!waage) throw new Error('Fixture waage fehlt');
  // Ja, Ja, Ja → „Wägezelle tauschen“ (Mockup)
  const yesPath = () => {
    const path: { node: string; answer: 'yes' }[] = [];
    let node = waage.start;
    for (;;) {
      const current = waage.nodes[node];
      if (current?.type !== 'question') return { path, resultNode: node };
      path.push({ node, answer: 'yes' });
      node = current.yes;
    }
  };

  it('lehnt Aufrufe ohne Proxy-Token ab', async () => {
    const response = await app.inject({ method: 'GET', url: '/trees' });
    expect(response.statusCode).toBe(401);
  });

  it('liefert Übersicht und Baum', async () => {
    const headers = proxyHeaders(user(['troubleshooting.use']), TOKEN);
    const list = await app.inject({ method: 'GET', url: '/trees', headers });
    expect(list.json<{ id: string }[]>().map((t) => t.id)).toContain(waage.id);
    const one = await app.inject({ method: 'GET', url: `/trees/${waage.id}`, headers });
    expect(one.json<{ nodes: object }>().nodes).toBeDefined();
    const missing = await app.inject({ method: 'GET', url: '/trees/gibt-es-nicht', headers });
    expect(missing.statusCode).toBe(404);
  });

  it('dokumentiert einen Lösungsweg mit Benutzer und Zeit', async () => {
    const { path, resultNode } = yesPath();
    expect(waage.nodes[resultNode]).toMatchObject({ part: 'ET-50100' });
    const response = await app.inject({
      method: 'POST',
      url: '/solutions',
      headers: proxyHeaders(user(['troubleshooting.use', 'troubleshooting.document']), TOKEN),
      payload: {
        treeId: waage.id,
        path,
        resultNode,
        alarmId: 'FILL-WGT-0003',
        machineId: 'filler',
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      username: 'm.wagner',
      userName: 'M. Wagner',
      resultNode,
    });
    expect(solutions.stats()).toEqual([{ treeId: waage.id, resultNode, count: 1 }]);
  });

  it('verlangt das Recht troubleshooting.document', async () => {
    const { path, resultNode } = yesPath();
    const response = await app.inject({
      method: 'POST',
      url: '/solutions',
      headers: proxyHeaders(user(['troubleshooting.use']), TOKEN),
      payload: { treeId: waage.id, path, resultNode },
    });
    expect(response.statusCode).toBe(403);
  });

  it('weist Wege ab, die nicht zur Lösung führen', async () => {
    const { path } = yesPath();
    const other = Object.entries(waage.nodes).find(
      ([id, n]) => n.type === 'result' && id !== yesPath().resultNode,
    )?.[0];
    const response = await app.inject({
      method: 'POST',
      url: '/solutions',
      headers: proxyHeaders(user(['*']), TOKEN),
      payload: { treeId: waage.id, path, resultNode: other },
    });
    expect(response.statusCode).toBe(400);
  });
});
