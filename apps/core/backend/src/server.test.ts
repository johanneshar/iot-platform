import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { buildServer } from './server.js';
import type { ShellState } from './shell-state.js';

const manifest = {
  id: 'example',
  version: '0.1.0',
  name: { de: 'Beispielmodul' },
  description: { de: 'Zeigt, wie ein Modul aufgebaut ist' },
  category: 'Produktion',
  gxp: false,
  minConformance: 'basic',
  nav: { section: 'Linie', order: 90, icon: 'overview' },
  routes: [{ path: '', title: { de: 'Beispiel' } }],
  permissions: ['example.view'],
  entry: 'http://localhost:4100/entry.js',
};

let server: FastifyInstance;

beforeEach(() => {
  const config = { ...loadConfig({}), devBooked: ['dashboard'] };
  server = buildServer({ config, db: openDb(':memory:') });
});

afterEach(async () => {
  await server.close();
});

const shell = async () =>
  (await server.inject({ method: 'GET', url: '/api/shell' })).json<ShellState>();

describe('core backend', () => {
  it('meldet sich unter /api/health', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/health' });
    expect(response.json()).toEqual({ status: 'ok', service: 'core' });
  });

  it('liefert Linie, Standortlinien und den Katalog', async () => {
    const state = await shell();
    expect(state.line).toEqual({ id: 'l1', name: 'Linie 1 · Vials' });
    expect(state.lines.map((l) => l.id)).toEqual(['l1', 'l2']);
    expect(state.modules).toHaveLength(14);
    expect(state.modules.find((m) => m.id === 'core')).toMatchObject({ core: true, booked: true });
    expect(state.modules.find((m) => m.id === 'dashboard')).toMatchObject({
      booked: true,
      installed: false,
    });
  });

  it('nimmt ein gültiges Manifest an und zeigt das Modul', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/registry/modules',
      payload: manifest,
    });
    expect(response.statusCode).toBe(204);
    const state = await shell();
    expect(state.modules.find((m) => m.id === 'example')).toMatchObject({
      installed: true,
      booked: false,
    });
  });

  it('lehnt ein ungültiges Manifest mit Begründung ab', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/registry/modules',
      payload: { ...manifest, id: 'Example' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<{ errors: string[] }>().errors[0]).toContain('kebab-case');
  });

  it('bucht und bestellt Module ab', async () => {
    await server.inject({ method: 'PUT', url: '/api/licenses/alarms', payload: { booked: true } });
    expect((await shell()).modules.find((m) => m.id === 'alarms')?.booked).toBe(true);
    await server.inject({ method: 'PUT', url: '/api/licenses/alarms', payload: { booked: false } });
    expect((await shell()).modules.find((m) => m.id === 'alarms')?.booked).toBe(false);
  });

  it('Kernmodule lassen sich nicht abbestellen', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: '/api/licenses/core',
      payload: { booked: false },
    });
    expect(response.statusCode).toBe(409);
  });

  it('unbekannte Module lassen sich nicht buchen', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: '/api/licenses/nope',
      payload: { booked: true },
    });
    expect(response.statusCode).toBe(404);
  });
});
