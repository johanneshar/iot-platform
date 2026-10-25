import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SpareRequest } from '../shared/spares';

/** Postausgang der Anfragen an den Service – bis das Ticketsystem angebunden ist (O-03). */
export class RequestStore {
  private readonly db: Database.Database;

  /** `dir` = Datenordner des Moduls; `:memory:` für Tests */
  constructor(dir: string) {
    const memory = dir === ':memory:';
    if (!memory) mkdirSync(dir, { recursive: true });
    this.db = new Database(memory ? ':memory:' : join(dir, 'spares.sqlite'));
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`CREATE TABLE IF NOT EXISTS requests (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      username TEXT NOT NULL,
      json TEXT NOT NULL
    )`);
  }

  /** Nächste Vorgangsnummer im Jahr der Anfrage, z. B. ANF-2026-0001 */
  private nextTicket(year: number): string {
    const prefix = `ANF-${String(year)}-`;
    const row = this.db
      .prepare<[string], { n: number }>(
        `SELECT COUNT(*) AS n FROM requests WHERE ticket LIKE ? || '%'`,
      )
      .get(prefix);
    return `${prefix}${String((row?.n ?? 0) + 1).padStart(4, '0')}`;
  }

  add(request: Omit<SpareRequest, 'ticket'>): SpareRequest {
    const insert = this.db.transaction(() => {
      const ticket = this.nextTicket(new Date(request.createdAt).getUTCFullYear());
      const full: SpareRequest = { ticket, ...request };
      this.db
        .prepare('INSERT INTO requests (ticket, created_at, username, json) VALUES (?, ?, ?, ?)')
        .run(ticket, full.createdAt, full.username, JSON.stringify(full));
      return full;
    });
    return insert();
  }

  close(): void {
    this.db.close();
  }

  /** Letzte Anfragen, neueste zuerst */
  list(limit = 20): SpareRequest[] {
    return this.db
      .prepare<[number], { json: string }>('SELECT json FROM requests ORDER BY seq DESC LIMIT ?')
      .all(limit)
      .map((r) => JSON.parse(r.json) as SpareRequest);
  }
}
