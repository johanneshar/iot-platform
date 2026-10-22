import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export type Db = Database.Database;

/** Öffnet die SQLite-Datenbank des Core und legt fehlende Tabellen an. `:memory:` für Tests. */
export function openDb(dataDir: string): Db {
  let file = dataDir;
  if (dataDir !== ':memory:') {
    mkdirSync(dataDir, { recursive: true });
    file = join(dataDir, 'core.sqlite');
  }
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
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
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      username        TEXT NOT NULL UNIQUE,
      display_name    TEXT NOT NULL,
      password_hash   TEXT NOT NULL,
      roles           TEXT NOT NULL,
      active          INTEGER NOT NULL DEFAULT 1,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until    TEXT,
      created_at      TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      seq       INTEGER PRIMARY KEY AUTOINCREMENT,
      ts        TEXT NOT NULL,
      username  TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action    TEXT NOT NULL,
      module    TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      reason    TEXT,
      meaning   TEXT,
      prev_hash TEXT NOT NULL,
      hash      TEXT NOT NULL
    );
    -- Audit Trail ist unveränderbar (21 CFR Part 11 / Annex 11): kein UPDATE, kein DELETE
    CREATE TRIGGER IF NOT EXISTS audit_log_no_update BEFORE UPDATE ON audit_log
      BEGIN SELECT RAISE(ABORT, 'audit_log ist unveränderbar'); END;
    CREATE TRIGGER IF NOT EXISTS audit_log_no_delete BEFORE DELETE ON audit_log
      BEGIN SELECT RAISE(ABORT, 'audit_log ist unveränderbar'); END;
  `);
  // Ergänzung M5: Deep-Link-Ziele je Modul (z. B. Alarme mit Fehlerbaum)
  const columns = db.prepare('PRAGMA table_info(registered_modules)').all() as { name: string }[];
  if (!columns.some((c) => c.name === 'targets')) {
    db.exec("ALTER TABLE registered_modules ADD COLUMN targets TEXT NOT NULL DEFAULT '{}'");
  }
  // Ergänzung M6: Bezug eines Audit-Eintrags, z. B. „batch:B-2026-1042“ (Hash nur, wenn gesetzt)
  const auditColumns = db.prepare('PRAGMA table_info(audit_log)').all() as { name: string }[];
  if (!auditColumns.some((c) => c.name === 'reference')) {
    db.exec('ALTER TABLE audit_log ADD COLUMN reference TEXT');
  }
  return db;
}
