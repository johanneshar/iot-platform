import type { AuditLog } from '../audit/audit-log.js';
import type { CoreConfig } from '../config.js';
import type { UserStore } from './users.js';

/** Beispielbenutzer je Rolle für Entwicklung und Tests; Namen als Platzhalter wie im Mockup. */
export const DEV_USERS = [
  { username: 'operator', displayName: '[Operator]', roles: ['operator'] },
  { username: 'maintenance', displayName: '[Maintenance]', roles: ['maintenance'] },
  { username: 'setup', displayName: '[Setup Man]', roles: ['setup'] },
  { username: 'qa', displayName: '[QA]', roles: ['qa'] },
  { username: 'admin', displayName: '[Admin]', roles: ['admin'] },
  { username: 'itadmin', displayName: '[IT Admin]', roles: ['it-admin'] },
  { username: 'service', displayName: '[Service]', roles: ['service'] },
] as const;

/**
 * Erster Start: ohne Benutzer wird der Service-Zugang angelegt (E-12) – im Betrieb mit dem Passwort aus
 * CORE_SERVICE_PASSWORD, in der Entwicklung zusätzlich je Rolle ein Beispielbenutzer.
 */
export async function seedUsers(
  config: CoreConfig,
  users: UserStore,
  audit: AuditLog,
): Promise<void> {
  if (users.count() > 0) return;
  const system = { username: 'system', userName: 'System', module: 'core' };

  if (config.devUsers) {
    for (const u of DEV_USERS) {
      await users.create({ ...u, roles: [...u.roles], password: config.devUsers.password });
      audit.record({
        ...system,
        action: 'core.user.created',
        newValue: `${u.username} (${u.roles.join(', ')})`,
      });
    }
    return;
  }
  if (!config.servicePassword)
    throw new Error('Erster Start: CORE_SERVICE_PASSWORD fehlt für den Service-Zugang');
  await users.create({
    username: 'service',
    displayName: 'Service',
    roles: ['service'],
    password: config.servicePassword,
  });
  audit.record({ ...system, action: 'core.user.created', newValue: 'service (service)' });
}
