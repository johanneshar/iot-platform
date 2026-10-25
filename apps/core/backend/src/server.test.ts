import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AuditEntry } from './audit/audit-log.js';
import { loadConfig } from './config.js';
import { openDb, type Db } from './db.js';
import { buildServer, type SessionUser } from './server.js';
import type { ShellState } from './shell-state.js';

const PASSWORD = 'test-passwort';
const TOKEN = 'test-token';

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
let db: Db;

beforeEach(async () => {
  const config = {
    ...loadConfig({
      CORE_REGISTRY_TOKEN: TOKEN,
      CORE_DEV_PASSWORD: PASSWORD,
      CORE_MQTT_URL: 'off',
    }),
    devBooked: ['dashboard'],
  };
  db = openDb(':memory:');
  server = await buildServer({ config, db });
});

afterEach(async () => {
  await server.close();
});

async function login(username: string, password = PASSWORD): Promise<string> {
  const response = await server.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password },
  });
  expect(response.statusCode).toBe(200);
  const cookie = response.cookies.find((c) => c.name === 'iot_session');
  if (!cookie) throw new Error('kein Sitzungs-Cookie');
  return `iot_session=${cookie.value}`;
}

const get = (url: string, cookie?: string) =>
  server.inject({ method: 'GET', url, headers: cookie ? { cookie } : {} });
const send = (method: 'POST' | 'PUT', url: string, payload: object, cookie?: string) =>
  server.inject({ method, url, payload, headers: cookie ? { cookie } : {} });
const auditActions = async (cookie: string) =>
  (await get('/api/audit', cookie)).json<AuditEntry[]>().map((e) => e.action);

describe('Anmeldung', () => {
  it('meldet sich unter /api/health ohne Anmeldung', async () => {
    expect((await get('/api/health')).json()).toEqual({ status: 'ok', service: 'core' });
  });

  it('die Shell braucht eine Anmeldung', async () => {
    expect((await get('/api/shell')).statusCode).toBe(401);
    const cookie = await login('operator');
    const state = (await get('/api/shell', cookie)).json<ShellState>();
    expect(state.line).toEqual({ id: 'l3', name: 'Linie 3 · Flexfill', timeZone: 'Europe/Berlin' });
    expect(state.modules).toHaveLength(14);
  });

  it('liefert Benutzer mit Rollen und Rechten', async () => {
    const qa = (await get('/api/auth/me', await login('qa'))).json<SessionUser>();
    expect(qa.roles.map((r) => r.id)).toEqual(['qa']);
    expect(qa.permissions).toEqual([
      'batch.export',
      'batch.sign',
      'core.audit.view',
      'format.release',
    ]);
    const service = (await get('/api/auth/me', await login('service'))).json<SessionUser>();
    expect(service.permissions).toEqual(['*']);
  });

  it('lehnt falsche Passwörter ab und sperrt nach fünf Fehlversuchen', async () => {
    for (let i = 0; i < 4; i++) {
      expect(
        (await send('POST', '/api/auth/login', { username: 'operator', password: 'falsch' }))
          .statusCode,
      ).toBe(401);
    }
    expect(
      (await send('POST', '/api/auth/login', { username: 'operator', password: 'falsch' }))
        .statusCode,
    ).toBe(423);
    // auch mit richtigem Passwort gesperrt
    expect(
      (await send('POST', '/api/auth/login', { username: 'operator', password: PASSWORD }))
        .statusCode,
    ).toBe(423);
    const actions = await auditActions(await login('admin'));
    expect(actions.filter((a) => a === 'core.login.failed')).toHaveLength(6);
    expect(actions).toContain('core.user.locked');
  });

  it('Abmelden beendet die Sitzung', async () => {
    const cookie = await login('operator');
    await server.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });
    expect((await get('/api/auth/me', cookie)).statusCode).toBe(401);
  });
});

describe('Registry', () => {
  it('nimmt Manifeste nur mit Dienst-Token an', async () => {
    const without = await server.inject({
      method: 'POST',
      url: '/api/registry/modules',
      payload: manifest,
    });
    expect(without.statusCode).toBe(401);
    const withToken = await server.inject({
      method: 'POST',
      url: '/api/registry/modules',
      payload: manifest,
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(withToken.statusCode).toBe(204);
    const state = (await get('/api/shell', await login('operator'))).json<ShellState>();
    expect(state.modules.find((m) => m.id === 'example')).toMatchObject({ installed: true });
  });

  it('lehnt ein ungültiges Manifest mit Begründung ab', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/registry/modules',
      payload: { ...manifest, id: 'Example' },
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<{ errors: string[] }>().errors[0]).toContain('kebab-case');
  });
});

describe('Baukasten', () => {
  it('nur mit core.modules.book buchen, und mit Audit-Eintrag', async () => {
    expect(
      (await send('PUT', '/api/licenses/alarms', { booked: true }, await login('operator')))
        .statusCode,
    ).toBe(403);
    const admin = await login('admin');
    expect((await send('PUT', '/api/licenses/alarms', { booked: true }, admin)).statusCode).toBe(
      204,
    );
    const entry = (await get('/api/audit', admin)).json<AuditEntry[]>()[0];
    expect(entry).toMatchObject({
      action: 'core.module.booked',
      username: 'admin',
      oldValue: 'alarms: nicht gebucht',
      newValue: 'alarms: gebucht',
    });
  });

  it('Kernmodule lassen sich nicht abbestellen', async () => {
    expect(
      (await send('PUT', '/api/licenses/core', { booked: false }, await login('admin'))).statusCode,
    ).toBe(409);
  });
});

describe('Audit Trail', () => {
  it('nur mit core.audit.view einsehen', async () => {
    expect((await get('/api/audit', await login('operator'))).statusCode).toBe(403);
    expect((await get('/api/audit', await login('qa'))).statusCode).toBe(200);
  });

  it('Einträge sind verkettet und die Kette ist unversehrt', async () => {
    const admin = await login('admin');
    const entries = (await get('/api/audit', admin)).json<AuditEntry[]>();
    const [newest, previous] = entries;
    expect(newest?.prevHash).toBe(previous?.hash);
    expect((await get('/api/audit/verify', admin)).json()).toMatchObject({
      valid: true,
      brokenAt: null,
    });
  });

  it('die Datenbank verweigert Ändern und Löschen', () => {
    expect(() => db.prepare("UPDATE audit_log SET username = 'x'").run()).toThrow('unveränderbar');
    expect(() => db.prepare('DELETE FROM audit_log').run()).toThrow('unveränderbar');
  });

  it('eine Manipulation an der Datenbank vorbei fällt auf', async () => {
    const admin = await login('admin');
    db.exec('DROP TRIGGER audit_log_no_update');
    db.prepare("UPDATE audit_log SET new_value = 'manipuliert' WHERE seq = 2").run();
    expect((await get('/api/audit/verify', admin)).json()).toMatchObject({
      valid: false,
      brokenAt: 2,
    });
  });

  it('Module schreiben Vorgänge; Benutzer und Zeit setzt der Core', async () => {
    const cookie = await login('setup');
    const ok = await send(
      'POST',
      '/api/audit',
      { module: 'format', action: 'format.step-confirmed', newValue: 'Schritt 2' },
      cookie,
    );
    expect(ok.statusCode).toBe(201);
    expect(ok.json<AuditEntry>()).toMatchObject({
      username: 'setup',
      userName: '[Setup Man]',
      module: 'format',
    });
    expect(ok.json<AuditEntry>().ts).toMatch(/Z$/);
    const wrong = await send(
      'POST',
      '/api/audit',
      { module: 'format', action: 'batch.signed' },
      cookie,
    );
    expect(wrong.statusCode).toBe(400);
  });
});

describe('e-Signatur', () => {
  const signature = {
    meaning: 'Freigabe',
    permission: 'batch.sign',
    module: 'batch',
    action: 'batch.report-signed',
    newValue: 'B-2026-1042',
  };

  it('signiert mit erneuter Eingabe und schreibt die Bedeutung in den Audit Trail', async () => {
    const qa = await login('qa');
    const response = await send(
      'POST',
      '/api/signatures',
      { ...signature, username: 'qa', password: PASSWORD },
      qa,
    );
    expect(response.statusCode).toBe(201);
    const entry = (await get('/api/audit', qa)).json<AuditEntry[]>()[0];
    expect(entry).toMatchObject({
      action: 'batch.report-signed',
      username: 'qa',
      meaning: 'Freigabe',
      newValue: 'B-2026-1042',
    });
  });

  it('falsches Passwort wird abgelehnt und protokolliert', async () => {
    const qa = await login('qa');
    expect(
      (
        await send(
          'POST',
          '/api/signatures',
          { ...signature, username: 'qa', password: 'falsch' },
          qa,
        )
      ).statusCode,
    ).toBe(401);
    expect(await auditActions(qa)).toContain('core.signature.failed');
  });

  it('nur mit den eigenen Zugangsdaten', async () => {
    const qa = await login('qa');
    expect(
      (
        await send(
          'POST',
          '/api/signatures',
          { ...signature, username: 'admin', password: PASSWORD },
          qa,
        )
      ).statusCode,
    ).toBe(401);
  });

  it('ohne Recht keine Signatur', async () => {
    const admin = await login('admin');
    expect(
      (
        await send(
          'POST',
          '/api/signatures',
          { ...signature, username: 'admin', password: PASSWORD },
          admin,
        )
      ).statusCode,
    ).toBe(403);
  });

  it('der Service darf signieren (E-12)', async () => {
    const service = await login('service');
    expect(
      (
        await send(
          'POST',
          '/api/signatures',
          { ...signature, username: 'service', password: PASSWORD },
          service,
        )
      ).statusCode,
    ).toBe(201);
  });

  it('die Bedeutung ist Pflicht', async () => {
    const qa = await login('qa');
    const noMeaning: Record<string, unknown> = { ...signature };
    delete noMeaning['meaning'];
    expect(
      (
        await send(
          'POST',
          '/api/signatures',
          { ...noMeaning, username: 'qa', password: PASSWORD },
          qa,
        )
      ).statusCode,
    ).toBe(400);
  });
});

describe('Maschinendaten', () => {
  it('nur mit Anmeldung', async () => {
    expect((await get('/api/data')).statusCode).toBe(401);
    const data = (await get('/api/data', await login('operator'))).json<{
      lineId: string;
      oeeTarget: number | null;
    }>();
    expect(data).toMatchObject({ lineId: 'l3', oeeTarget: null });
  });
});

describe('Benutzer', () => {
  it('nur mit core.users.manage anlegen; Rollenwechsel wird protokolliert', async () => {
    expect(
      (await send('POST', '/api/users', { username: 'neu' }, await login('operator'))).statusCode,
    ).toBe(403);
    const it = await login('itadmin');
    const created = await send(
      'POST',
      '/api/users',
      {
        username: 'm.muster',
        displayName: '[M. Muster]',
        password: 'lang-genug',
        roles: ['operator'],
      },
      it,
    );
    expect(created.statusCode).toBe(201);
    const id = created.json<{ id: number }>().id;
    await send('PUT', `/api/users/${String(id)}`, { roles: ['operator', 'maintenance'] }, it);
    const me = (
      await get('/api/auth/me', await login('m.muster', 'lang-genug'))
    ).json<SessionUser>();
    expect(me.permissions).toContain('spares.request');
    expect(await auditActions(await login('admin'))).toEqual(
      expect.arrayContaining(['core.user.created', 'core.user.roles-changed']),
    );
  });

  it('zu kurze Passwörter werden abgelehnt', async () => {
    const response = await send(
      'POST',
      '/api/users',
      { username: 'kurz', displayName: 'K', password: 'kurz', roles: ['operator'] },
      await login('admin'),
    );
    expect(response.statusCode).toBe(400);
  });

  it('Deaktivieren beendet die Sitzungen', async () => {
    const operator = await login('operator');
    const admin = await login('admin');
    const list = (await get('/api/users', admin)).json<{ id: number; username: string }[]>();
    const id = list.find((u) => u.username === 'operator')?.id ?? 0;
    await send('PUT', `/api/users/${String(id)}`, { active: false }, admin);
    expect((await get('/api/auth/me', operator)).statusCode).toBe(401);
  });
});

describe('Proxy zu Modul-Backends (E-36)', () => {
  it('leitet mit Sitzung und Benutzer weiter; ohne Sitzung 401', async () => {
    // Kleines Modul-Backend, das die weitergeleiteten Kopfzeilen zurückgibt
    const backend = (await import('fastify')).default();
    backend.get('/echo', (request) => ({
      user: request.headers['x-iot-user'],
      token: request.headers['x-iot-token'],
    }));
    await backend.listen({ port: 0, host: '127.0.0.1' });
    const address = backend.server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    await server.inject({
      method: 'POST',
      url: '/api/registry/modules',
      payload: { ...manifest, backend: `http://127.0.0.1:${String(port)}` },
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    await send('PUT', '/api/licenses/example', { booked: true }, await login('admin'));

    expect((await get('/api/modules/example/echo')).statusCode).toBe(401);
    const response = await get('/api/modules/example/echo', await login('maintenance'));
    expect(response.statusCode).toBe(200);
    const body = response.json<{ user: string; token: string }>();
    expect(body.token).toBe(TOKEN);
    expect(JSON.parse(Buffer.from(body.user, 'base64url').toString())).toMatchObject({
      username: 'maintenance',
    });
    await backend.close();
  });

  it('nicht gebuchte Module erreicht man nicht', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/registry/modules',
      payload: { ...manifest, backend: 'http://127.0.0.1:1' },
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect((await get('/api/modules/example/echo', await login('operator'))).statusCode).toBe(403);
  });
});

describe('Deep-Link-Ziele', () => {
  it('Module melden ihre Einsprungpunkte mit Dienst-Token; die Shell sieht sie', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/registry/modules',
      payload: manifest,
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    const denied = await server.inject({
      method: 'PUT',
      url: '/api/registry/modules/example/targets',
      payload: { alarm: ['A'] },
    });
    expect(denied.statusCode).toBe(401);
    const ok = await server.inject({
      method: 'PUT',
      url: '/api/registry/modules/example/targets',
      payload: { alarm: ['FILL-WGT-0003'] },
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(ok.statusCode).toBe(204);
    const state = (await get('/api/shell', await login('operator'))).json<ShellState>();
    expect(state.modules.find((m) => m.id === 'example')?.targets).toEqual({
      alarm: ['FILL-WGT-0003'],
    });
  });
});

describe('Linienkonfiguration für Modul-Backends', () => {
  it('liefert Zeitzone und Schichtmodell nur mit Dienst-Token', async () => {
    expect((await server.inject({ url: '/api/registry/line' })).statusCode).toBe(401);
    const response = await server.inject({
      url: '/api/registry/line',
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(response.json()).toMatchObject({
      id: 'l3',
      timeZone: 'Europe/Berlin',
      oeeTarget: null,
      shifts: expect.arrayContaining([{ start: '06:00', end: '14:00' }]) as unknown,
    });
  });
});

describe('Audit-Einträge mit Bezug für Modul-Backends (M6)', () => {
  it('Module finden ihre Einträge über den Bezug; die Hash-Kette bleibt gültig', async () => {
    const cookie = await login('qa');
    const signed = await send(
      'POST',
      '/api/signatures',
      {
        username: 'qa',
        password: PASSWORD,
        meaning: 'Freigabe',
        permission: 'batch.sign',
        module: 'batch',
        action: 'batch.report-released',
        newValue: 'sha256:abc',
        reference: 'batch:B-1',
      },
      cookie,
    );
    expect(signed.statusCode).toBe(201);
    await send(
      'POST',
      '/api/audit',
      { module: 'batch', action: 'batch.report-exported', reference: 'batch:B-2' },
      cookie,
    );
    const auth = { authorization: `Bearer ${TOKEN}` };
    expect((await server.inject({ url: '/api/registry/audit?module=batch' })).statusCode).toBe(401);
    const found = await server.inject({
      url: '/api/registry/audit?module=batch&reference=batch%3AB-1',
      headers: auth,
    });
    const entries = found.json<AuditEntry[]>();
    expect(entries.map((e) => [e.action, e.meaning, e.newValue, e.reference])).toEqual([
      ['batch.report-released', 'Freigabe', 'sha256:abc', 'batch:B-1'],
    ]);
    const seq = signed.json<{ seq: number }>().seq;
    const one = await server.inject({ url: `/api/registry/audit/${String(seq)}`, headers: auth });
    expect(one.json<AuditEntry>()).toMatchObject({ username: 'qa', reference: 'batch:B-1' });
    expect(
      (await server.inject({ url: '/api/registry/audit/99999', headers: auth })).statusCode,
    ).toBe(404);
    const verify = await get('/api/audit/verify', cookie);
    expect(verify.json<{ valid: boolean }>().valid).toBe(true);
  });
});

describe('Export des Audit Trail', () => {
  it('nur mit core.audit.view; enthält alle Einträge, Prüfergebnis und den Export selbst', async () => {
    expect((await get('/api/audit/export', await login('operator'))).statusCode).toBe(403);
    const response = await get('/api/audit/export', await login('qa'));
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-disposition']).toMatch(
      /attachment; filename="audit-trail-l3-/,
    );
    const body = response.json<{
      format: string;
      chain: { valid: boolean };
      entries: AuditEntry[];
    }>();
    expect(body.format).toBe('iot-audit-export/1');
    expect(body.chain.valid).toBe(true);
    expect(body.entries.at(-1)?.action).toBe('core.audit.exported');
    expect(body.entries[0]?.seq).toBe(1);
  });
});
