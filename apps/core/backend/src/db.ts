import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export type Db = Database.Database;

/** Öffnet die SQLite-Datenbank des Core und legt fehlende Tabellen an. `:memory:` für Tests. */
export function openDb(dataDir: string): Db {
  let file: string = dataDir;
  if (dataDir !== ':memory:') {
    mkdirSync(dataDir, { recursive: true });
    file = join(dataDir, 'core.sqlite');
  }
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS registered_modules (
      id            TEXT PRIMARY KEY,
      manifest      TEXT NOT NULL,
      registered_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS licenses (
      module_id  TEXT PRIMARY KEY,
      booked     INTEGER NOT NULL,
      changed_at TEXT NOT NULL
    );
  `);
  return db;
}
