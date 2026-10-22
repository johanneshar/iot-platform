import type { Db } from '../db.js';
import { hashPassword, verifyPassword } from './passwords.js';

export interface User {
  id: number;
  username: string;
  displayName: string;
  roles: string[];
  active: boolean;
}

interface Row {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
  roles: string;
  active: number;
  failed_attempts: number;
  locked_until: string | null;
}

const toUser = (r: Row): User => ({
  id: r.id,
  username: r.username,
  displayName: r.display_name,
  roles: JSON.parse(r.roles) as string[],
  active: r.active === 1,
});

/** Nach so vielen Fehlversuchen wird das Konto gesperrt (O-20). */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; reason: 'invalid' | 'locked' | 'inactive'; justLocked?: boolean };

/**
 * Anmeldung gegen eine Benutzerquelle. Lokal über die Datenbank des Core; LDAP kommt als weitere
 * Umsetzung derselben Schnittstelle (O-04).
 */
export interface AuthProvider {
  authenticate(username: string, password: string): Promise<AuthResult>;
}

export class UserStore implements AuthProvider {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
  ) {}

  count(): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  }

  private row(username: string): Row | undefined {
    return this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
      Row | undefined;
  }

  get(id: number): User | undefined {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Row | undefined;
    return row ? toUser(row) : undefined;
  }

  list(): User[] {
    return (this.db.prepare('SELECT * FROM users ORDER BY username').all() as Row[]).map(toUser);
  }

  async create(input: {
    username: string;
    displayName: string;
    password: string;
    roles: string[];
  }): Promise<User> {
    const result = this.db
      .prepare(
        'INSERT INTO users (username, display_name, password_hash, roles, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(
        input.username,
        input.displayName,
        await hashPassword(input.password),
        JSON.stringify(input.roles),
        this.now().toISOString(),
      );
    const user = this.get(Number(result.lastInsertRowid));
    if (!user) throw new Error('Benutzer wurde nicht angelegt');
    return user;
  }

  async update(
    id: number,
    change: { roles?: string[]; active?: boolean; password?: string; displayName?: string },
  ): Promise<User | undefined> {
    if (change.roles)
      this.db
        .prepare('UPDATE users SET roles = ? WHERE id = ?')
        .run(JSON.stringify(change.roles), id);
    if (change.active !== undefined)
      this.db.prepare('UPDATE users SET active = ? WHERE id = ?').run(change.active ? 1 : 0, id);
    if (change.displayName)
      this.db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(change.displayName, id);
    if (change.password) {
      this.db
        .prepare(
          'UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?',
        )
        .run(await hashPassword(change.password), id);
    }
    return this.get(id);
  }

  async authenticate(username: string, password: string): Promise<AuthResult> {
    const row = this.row(username);
    if (!row) return { ok: false, reason: 'invalid' };
    if (row.active !== 1) return { ok: false, reason: 'inactive' };
    if (row.locked_until && new Date(row.locked_until) > this.now())
      return { ok: false, reason: 'locked' };

    if (await verifyPassword(password, row.password_hash)) {
      this.db
        .prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?')
        .run(row.id);
      return { ok: true, user: toUser(row) };
    }
    const attempts = row.failed_attempts + 1;
    const lock = attempts >= MAX_FAILED_ATTEMPTS;
    this.db
      .prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
      .run(
        lock ? 0 : attempts,
        lock ? new Date(this.now().getTime() + LOCK_MINUTES * 60_000).toISOString() : null,
        row.id,
      );
    return lock
      ? { ok: false, reason: 'locked', justLocked: true }
      : { ok: false, reason: 'invalid' };
  }
}
