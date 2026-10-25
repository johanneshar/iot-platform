import { proxyHeaders, type ProxyUser } from '@iot/module-sdk/server';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../backend/app';
import { checkCatalog, loadCatalog } from '../backend/catalog';
import { RequestStore } from '../backend/requests';
import type { CatalogResponse, MachineInfo, SpareRequest } from '../shared/spares';

const CATALOG = fileURLToPath(
  new URL('../../../packages/simulator/fixtures/spares/flexfill.json', import.meta.url),
);
const TOKEN = 'test-token';
const NOW = new Date('2026-10-25T09:30:00.000Z');
const catalog = loadCatalog(CATALOG);

const machines: MachineInfo[] = [
  { machineId: 'l3-iso', name: 'Isolator', own: false, serial: '[Seriennummer]', state: 'Execute' },
  {
    machineId: 'l3-fill',
    name: 'Füll- und Verschließmaschine',
    own: true,
    serial: '[Seriennummer]',
    state: 'Execute',
  },
];
const user = (permissions: string[]): ProxyUser => ({
  username: 'k.maier',
  displayName: '[Maintenance]',
  permissions,
});

describe('Katalog der Flexfill', () => {
  it('ist gültig: Mockup-Teile an der Füllmaschine, Formatteile für Spritze im Nest', () => {
    expect(catalog.lineId).toBe('l3');
    const fill = catalog.parts.filter((p) => p.machines.includes('l3-fill')).map((p) => p.id);
    expect(fill).toEqual(expect.arrayContaining(['ET-10233', 'ET-50100', 'FT-2041', 'FT-3320']));
    expect(catalog.parts.find((p) => p.id === 'FT-3330')?.machines).toEqual(['l3-transfer']);
    // Fremdmaschine ohne Teile (ownMachinesOnly)
    expect(catalog.parts.some((p) => p.machines.includes('l3-iso'))).toBe(false);
  });

  it('erkennt doppelte Nummern und unbekannte Baugruppen', () => {
    const part = catalog.parts[0];
    if (!part) throw new Error('Katalog leer');
    expect(checkCatalog({ ...catalog, parts: [part, { ...part, group: 'Unbekannt' }] })).toEqual([
      `Teilenummer ${part.id} doppelt`,
      `${part.id}: Baugruppe „Unbekannt“ nicht in groups`,
    ]);
  });
});

describe('API des Ersatzteilkatalogs', () => {
  let requests: RequestStore;
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    requests = new RequestStore(':memory:');
    app = buildApp({
      catalog,
      requests,
      machines: () => machines,
      token: TOKEN,
      now: () => NOW,
      logger: false,
    });
  });
  afterEach(async () => {
    await app.close();
    requests.close();
  });

  it('lehnt Aufrufe ohne Proxy-Token oder Recht ab', async () => {
    expect((await app.inject({ method: 'GET', url: '/catalog' })).statusCode).toBe(401);
    const headers = proxyHeaders(user([]), TOKEN);
    expect((await app.inject({ method: 'GET', url: '/catalog', headers })).statusCode).toBe(403);
  });

  it('liefert Katalog und Maschinen', async () => {
    const headers = proxyHeaders(user(['spares.view']), TOKEN);
    const body = (
      await app.inject({ method: 'GET', url: '/catalog', headers })
    ).json<CatalogResponse>();
    expect(body.groups).toContain('Formatteile');
    expect(body.machines.map((m) => m.machineId)).toEqual(['l3-iso', 'l3-fill']);
  });

  it('Anfrage mit Maschinen-Nr., Linie und Zustand; Vorgangsnummern laufen hoch', async () => {
    const view = proxyHeaders(user(['spares.view']), TOKEN);
    const denied = await app.inject({
      method: 'POST',
      url: '/requests',
      headers: view,
      payload: { items: ['ET-10233'] },
    });
    expect(denied.statusCode).toBe(403);

    const headers = proxyHeaders(user(['spares.view', 'spares.request']), TOKEN);
    const first = await app.inject({
      method: 'POST',
      url: '/requests',
      headers,
      payload: { items: ['ET-10233', 'ET-10233', 'ET-50100'], machineId: 'l3-fill' },
    });
    expect(first.statusCode).toBe(201);
    expect(first.json<SpareRequest>()).toMatchObject({
      ticket: 'ANF-2026-0001',
      createdAt: NOW.toISOString(),
      userName: '[Maintenance]',
      lineId: 'l3',
      machine: { machineId: 'l3-fill', serial: '[Seriennummer]', state: 'Execute' },
      items: [
        { id: 'ET-10233', name: 'Pumpenkopf Dosierpumpe' },
        { id: 'ET-50100', name: 'Wägezelle 0–50 g' },
      ],
      delivery: 'pending',
    });
    const second = await app.inject({
      method: 'POST',
      url: '/requests',
      headers,
      payload: { items: ['FT-3320'] },
    });
    expect(second.json<SpareRequest>()).toMatchObject({ ticket: 'ANF-2026-0002', machine: null });
    const list = await app.inject({ method: 'GET', url: '/requests', headers });
    expect(list.json<SpareRequest[]>().map((r) => r.ticket)).toEqual([
      'ANF-2026-0002',
      'ANF-2026-0001',
    ]);
  });

  it('prüft Teile und Maschine', async () => {
    const headers = proxyHeaders(user(['spares.request']), TOKEN);
    const post = (payload: object) =>
      app.inject({ method: 'POST', url: '/requests', headers, payload });
    expect((await post({ items: [] })).statusCode).toBe(400);
    expect((await post({ items: ['ET-99999'] })).json<{ errors: string[] }>().errors).toEqual([
      'Teil ET-99999 nicht im Katalog',
    ]);
    expect((await post({ items: ['ET-10233'], machineId: 'l9-x' })).statusCode).toBe(400);
    // Fremdmaschine: Ersatzteile über den Hersteller
    expect((await post({ items: ['ET-10233'], machineId: 'l3-iso' })).statusCode).toBe(400);
  });
});
