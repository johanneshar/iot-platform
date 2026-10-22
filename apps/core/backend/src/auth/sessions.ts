import { createHash, randomBytes } from 'node:crypto';
import type { Db } from '../db.js';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

/** Sitzungen: zufälliges Token im Cookie, in der Datenbank nur sein Hash. */
export class SessionStore {
  constructor(
    private readonly db: Db,
    private readonly hours: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  create(userId: number): { token: string; expiresAt: Date } {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(this.now().getTime() + this.hours * 3_600_000);
    this.db
      .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(hash(token), userId, expiresAt.toISOString());
    return { token, expiresAt };
  }

  userId(token: string): number | null {
    const row = this.db
      .prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?')
      .get(hash(token)) as { user_id: number; expires_at: string } | undefined;
    if (!row) return null;
    if (new Date(row.expires_at) <= this.now()) {
      this.delete(token);
      return null;
    }
    return row.user_id;
  }

  delete(token: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash(token));
  }

  deleteForUser(userId: number): void {
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }
}
