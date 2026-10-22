import cookie from '@fastify/cookie';
import { validateManifest } from '@iot/module-sdk/manifest';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { AuditLog } from './audit/audit-log.js';
import { MIN_PASSWORD_LENGTH } from './auth/passwords.js';
import { hasPermission, permissionsFor } from './auth/roles.js';
import { seedUsers } from './auth/seed.js';
import { SessionStore } from './auth/sessions.js';
import { UserStore, type User } from './auth/users.js';
import type { CoreConfig } from './config.js';
import { openDb, type Db } from './db.js';
import { LocalLicenseProvider, type LicenseProvider } from './licenses.js';
import { Registry } from './registry.js';
import { connectLine } from './data/mqtt-bridge.js';
import { LineModel } from './data/line-model.js';
import { buildShellState } from './shell-state.js';

export interface HealthResponse {
  status: 'ok';
  service: 'core';
}

export { LineModel };

export interface ServerDeps {
  config: CoreConfig;
  db?: Db;
  licenses?: LicenseProvider;
  now?: () => Date;
}

export interface SessionUser {
  id: number;
  username: string;
  displayName: string;
  roles: { id: string; name: { de: string; en?: string } }[];
  permissions: string[];
}

const COOKIE = 'iot_session';
const ACTION = /^[a-z][a-z0-9-]*(\.[a-z][a-zA-Z0-9-]*)+$/;

const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const optionalText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

/** Baut den Server ohne ihn zu starten – so bleibt er in Tests direkt aufrufbar. */
export async function buildServer({
  config,
  db = openDb(config.dataDir),
  licenses,
  now = () => new Date(),
}: ServerDeps): Promise<FastifyInstance> {
  const server = Fastify({ logger: process.env['NODE_ENV'] !== 'test' });
  await server.register(cookie);

  const registry = new Registry(db);
  const license = licenses ?? new LocalLicenseProvider(db, config.devBooked);
  const audit = new AuditLog(db, now);
  const users = new UserStore(db, now);
  const sessions = new SessionStore(db, config.sessionHours, now);
  const known = new Set(config.catalog.map((c) => c.id));
  await seedUsers(config, users, audit);

  // Datenkern: kanonisches Linienmodell aus dem Databus (E-08, ADR-005)
  const line = config.site.find((l) => l.id === config.lineId);
  const model = new LineModel({
    lineId: config.lineId,
    timeZone: line?.timeZone ?? 'UTC',
    shifts: line?.shifts ?? [],
    oeeTarget: line?.oeeTarget ?? null,
    now,
  });
  const mqttClient = config.mqttUrl
    ? connectLine(config.mqttUrl, config.lineId, model, (message) => {
        server.log.info(message);
      })
    : null;

  const sessionUser = (user: User): SessionUser => ({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    roles: user.roles.map((id) => ({
      id,
      name: config.roles.find((r) => r.id === id)?.name ?? { de: id },
    })),
    permissions: permissionsFor(user.roles, config.roles),
  });

  const currentUser = (request: FastifyRequest): SessionUser | null => {
    const token = request.cookies[COOKIE];
    if (!token) return null;
    const id = sessions.userId(token);
    const user = id === null ? undefined : users.get(id);
    return user?.active ? sessionUser(user) : null;
  };

  /** Liefert den angemeldeten Benutzer oder antwortet 401/403. */
  const guard = (
    request: FastifyRequest,
    reply: FastifyReply,
    permission?: string,
  ): SessionUser | null => {
    const user = currentUser(request);
    if (!user) {
      void reply.code(401).send({ errors: ['Nicht angemeldet'] });
      return null;
    }
    if (permission && !hasPermission(user.permissions, permission)) {
      void reply.code(403).send({ errors: [`Recht ${permission} fehlt`] });
      return null;
    }
    return user;
  };

  const actor = (user: SessionUser) => ({ username: user.username, userName: user.displayName });

  server.get('/api/health', (): HealthResponse => ({ status: 'ok', service: 'core' }));

  // ── Anmeldung ────────────────────────────────────────────────────────────────
  server.post<{ Body: { username?: unknown; password?: unknown } }>(
    '/api/auth/login',
    async (request, reply) => {
      const { username, password } = request.body;
      if (!text(username) || typeof password !== 'string')
        return reply.code(400).send({ errors: ['Benutzer und Passwort erforderlich'] });
      const result = await users.authenticate(username, password);
      if (!result.ok) {
        audit.record({
          username,
          userName: username,
          module: 'core',
          action: 'core.login.failed',
          reason: result.reason,
        });
        if (result.justLocked)
          audit.record({
            username,
            userName: username,
            module: 'core',
            action: 'core.user.locked',
          });
        return reply.code(result.reason === 'locked' ? 423 : 401).send({ errors: [result.reason] });
      }
      const session = sessions.create(result.user.id);
      audit.record({ ...actor(sessionUser(result.user)), module: 'core', action: 'core.login' });
      return reply
        .setCookie(COOKIE, session.token, {
          path: '/',
          httpOnly: true,
          sameSite: 'strict',
          secure: config.production,
          expires: session.expiresAt,
        })
        .send(sessionUser(result.user));
    },
  );

  server.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies[COOKIE];
    const user = currentUser(request);
    if (token) sessions.delete(token);
    if (user) audit.record({ ...actor(user), module: 'core', action: 'core.logout' });
    return reply.clearCookie(COOKIE, { path: '/' }).code(204).send();
  });

  server.get('/api/auth/me', async (request, reply) => {
    const user = guard(request, reply);
    return user ?? reply;
  });

  // ── Shell und Baukasten ──────────────────────────────────────────────────────
  server.get('/api/shell', async (request, reply) => {
    if (!guard(request, reply)) return reply;
    return buildShellState(config.lineId, config.site, config.catalog, registry.list(), license);
  });

  // Anmeldung eines Moduls beim Start (ADR-002) mit Dienst-Token (O-18)
  server.post('/api/registry/modules', async (request, reply) => {
    if (request.headers.authorization !== `Bearer ${config.registryToken}`) {
      return reply.code(401).send({ errors: ['Dienst-Token fehlt oder ist falsch'] });
    }
    const result = validateManifest(request.body);
    if (!result.ok) return reply.code(400).send({ errors: result.errors });
    registry.register(result.manifest);
    return reply.code(204).send();
  });

  // Buchen/Abbestellen im Baukasten – nur mit core.modules.book (E-14)
  server.put<{ Params: { id: string }; Body: { booked?: unknown } }>(
    '/api/licenses/:id',
    async (request, reply) => {
      const user = guard(request, reply, 'core.modules.book');
      if (!user) return reply;
      const { id } = request.params;
      const booked = request.body.booked;
      if (typeof booked !== 'boolean')
        return reply.code(400).send({ errors: ['booked: true oder false'] });
      const isRegistered = registry.list().some((m) => m.id === id);
      if (!known.has(id) && !isRegistered)
        return reply.code(404).send({ errors: [`Modul ${id} unbekannt`] });
      if (config.catalog.find((c) => c.id === id)?.core)
        return reply.code(409).send({ errors: ['Kernmodule sind immer enthalten'] });
      const before = license.isBooked(id);
      license.setBooked(id, booked);
      if (before !== booked) {
        audit.record({
          ...actor(user),
          module: 'core',
          action: booked ? 'core.module.booked' : 'core.module.unbooked',
          oldValue: `${id}: ${before ? 'gebucht' : 'nicht gebucht'}`,
          newValue: `${id}: ${booked ? 'gebucht' : 'nicht gebucht'}`,
        });
      }
      return reply.code(204).send();
    },
  );

  // ── Audit Trail ──────────────────────────────────────────────────────────────
  server.get<{ Querystring: { limit?: string } }>('/api/audit', async (request, reply) => {
    if (!guard(request, reply, 'core.audit.view')) return reply;
    return audit.list(Math.min(Number(request.query.limit ?? 200) || 200, 1000));
  });

  server.get('/api/audit/verify', async (request, reply) => {
    if (!guard(request, reply, 'core.audit.view')) return reply;
    return audit.verify();
  });

  // Vorgänge der Module (audit.record im module-sdk); Benutzer und Zeit setzt der Core
  server.post<{ Body: Record<string, unknown> }>('/api/audit', async (request, reply) => {
    const user = guard(request, reply);
    if (!user) return reply;
    const { action, module } = request.body;
    if (
      !text(action) ||
      !ACTION.test(action) ||
      !text(module) ||
      !action.startsWith(`${module}.`)
    ) {
      return reply
        .code(400)
        .send({ errors: ['action im Format <modul>.<vorgang> und passendes module erforderlich'] });
    }
    const entry = audit.record({
      ...actor(user),
      module,
      action,
      oldValue: optionalText(request.body['oldValue']),
      newValue: optionalText(request.body['newValue']),
      reason: optionalText(request.body['reason']),
    });
    return reply.code(201).send(entry);
  });

  // ── e-Signatur (E-13): erneute Eingabe von Benutzer und Passwort, Bedeutung Pflicht ─────
  server.post<{ Body: Record<string, unknown> }>('/api/signatures', async (request, reply) => {
    const user = guard(request, reply);
    if (!user) return reply;
    const { username, password, meaning, permission, action, module } = request.body;
    if (
      !text(username) ||
      typeof password !== 'string' ||
      !text(meaning) ||
      !text(permission) ||
      !text(action) ||
      !text(module)
    ) {
      return reply.code(400).send({
        errors: ['username, password, meaning, permission, action und module erforderlich'],
      });
    }
    if (!ACTION.test(action) || !action.startsWith(`${module}.`))
      return reply.code(400).send({ errors: ['action passt nicht zu module'] });
    // Signieren kann nur, wer angemeldet ist – mit den eigenen Zugangsdaten
    if (username !== user.username) {
      audit.record({
        ...actor(user),
        module,
        action: 'core.signature.failed',
        reason: 'anderer Benutzer',
      });
      return reply.code(401).send({ errors: ['invalid'] });
    }
    const result = await users.authenticate(username, password);
    if (!result.ok) {
      audit.record({
        ...actor(user),
        module,
        action: 'core.signature.failed',
        reason: result.reason,
      });
      return reply.code(result.reason === 'locked' ? 423 : 401).send({ errors: [result.reason] });
    }
    if (!hasPermission(user.permissions, permission))
      return reply.code(403).send({ errors: [`Recht ${permission} fehlt`] });
    const entry = audit.record({
      ...actor(user),
      module,
      action,
      meaning,
      oldValue: optionalText(request.body['oldValue']),
      newValue: optionalText(request.body['newValue']),
      reason: optionalText(request.body['reason']),
    });
    return reply.code(201).send({
      seq: entry.seq,
      ts: entry.ts,
      username: user.username,
      userName: user.displayName,
      meaning,
    });
  });

  // ── Maschinendaten (Datenkern) ─────────────────────────────────────────────────
  server.get('/api/data', async (request, reply) => {
    if (!guard(request, reply)) return reply;
    return model.snapshot();
  });

  // Server-Sent Events: Stand beim Verbinden, danach jede Änderung (höchstens alle 500 ms)
  server.get('/api/data/stream', async (request, reply) => {
    if (!guard(request, reply)) return reply;
    reply.hijack();
    const out = reply.raw;
    out.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    const send = () => out.write(`event: line\ndata: ${JSON.stringify(model.snapshot())}\n\n`);
    send();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = model.subscribe(() => {
      timer ??= setTimeout(() => {
        timer = null;
        send();
      }, 500);
    });
    const keepAlive = setInterval(() => out.write(': keep-alive\n\n'), 25_000);
    request.raw.on('close', () => {
      unsubscribe();
      clearInterval(keepAlive);
      if (timer) clearTimeout(timer);
    });
  });

  // ── Benutzer (core.users.manage); Oberfläche folgt (O-21) ─────────────────────
  server.get('/api/users', async (request, reply) => {
    if (!guard(request, reply, 'core.users.manage')) return reply;
    return users.list();
  });

  const validRoles = (roles: unknown): roles is string[] =>
    Array.isArray(roles) &&
    roles.length > 0 &&
    roles.every((r) => typeof r === 'string' && config.roles.some((d) => d.id === r));

  server.post<{ Body: Record<string, unknown> }>('/api/users', async (request, reply) => {
    const admin = guard(request, reply, 'core.users.manage');
    if (!admin) return reply;
    const { username, displayName, password, roles } = request.body;
    if (!text(username) || !/^[a-z0-9._-]+$/.test(username))
      return reply.code(400).send({ errors: ['username: Kleinbuchstaben, Ziffern, . _ -'] });
    if (!text(displayName)) return reply.code(400).send({ errors: ['displayName erforderlich'] });
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH)
      return reply
        .code(400)
        .send({ errors: [`password: mindestens ${String(MIN_PASSWORD_LENGTH)} Zeichen`] });
    if (!validRoles(roles))
      return reply.code(400).send({ errors: ['roles: bekannte Rollen erforderlich'] });
    if (users.list().some((u) => u.username === username))
      return reply.code(409).send({ errors: ['Benutzer existiert schon'] });
    const created = await users.create({ username, displayName, password, roles });
    audit.record({
      ...actor(admin),
      module: 'core',
      action: 'core.user.created',
      newValue: `${username} (${roles.join(', ')})`,
    });
    return reply.code(201).send(created);
  });

  server.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/api/users/:id',
    async (request, reply) => {
      const admin = guard(request, reply, 'core.users.manage');
      if (!admin) return reply;
      const id = Number(request.params.id);
      const before = users.get(id);
      if (!before) return reply.code(404).send({ errors: ['Benutzer unbekannt'] });
      const { roles, active, password } = request.body;
      if (roles !== undefined && !validRoles(roles))
        return reply.code(400).send({ errors: ['roles: bekannte Rollen erforderlich'] });
      if (active !== undefined && typeof active !== 'boolean')
        return reply.code(400).send({ errors: ['active: true oder false'] });
      if (
        password !== undefined &&
        (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH)
      ) {
        return reply
          .code(400)
          .send({ errors: [`password: mindestens ${String(MIN_PASSWORD_LENGTH)} Zeichen`] });
      }
      const after = await users.update(id, {
        ...(roles ? { roles } : {}),
        ...(typeof active === 'boolean' ? { active } : {}),
        ...(typeof password === 'string' ? { password } : {}),
      });
      if (roles)
        audit.record({
          ...actor(admin),
          module: 'core',
          action: 'core.user.roles-changed',
          oldValue: `${before.username}: ${before.roles.join(', ')}`,
          newValue: `${before.username}: ${roles.join(', ')}`,
        });
      if (typeof active === 'boolean' && active !== before.active) {
        audit.record({
          ...actor(admin),
          module: 'core',
          action: active ? 'core.user.activated' : 'core.user.deactivated',
          newValue: before.username,
        });
        if (!active) sessions.deleteForUser(id);
      }
      if (typeof password === 'string')
        audit.record({
          ...actor(admin),
          module: 'core',
          action: 'core.user.password-reset',
          newValue: before.username,
        });
      return after;
    },
  );

  server.addHook('onClose', () => {
    mqttClient?.end(true);
    db.close();
  });

  return server;
}
