import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Change, Procedure, RecipeRef } from '../shared/format';

/** Kanonisches JSON: Schlüssel sortiert, ohne `undefined` – Grundlage des Protokoll-Hashes. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Hash des Protokolls, wie es signiert wird: Ablauf, Start und alle bestätigten Schritte. */
export function recordHash(change: Change): string {
  const record = {
    id: change.id,
    procedure: { id: change.procedure.id, version: change.procedure.version },
    from: change.procedure.from,
    to: change.procedure.to,
    startedAt: change.startedAt,
    startedBy: change.startedBy.username,
    steps: change.steps.map((s) => ({
      stepId: s.stepId,
      seq: s.confirmed.seq,
      ts: s.confirmed.ts,
      username: s.confirmed.username,
      scans: s.scans,
    })),
  };
  return `sha256:${createHash('sha256').update(canonical(record)).digest('hex')}`;
}

export interface StoredProcedure {
  procedure: Procedure;
  importedAt: string;
  importedBy: string;
}

/** Abläufe (versioniert) und Formatwechsel der Linie in SQLite. */
export class FormatStore {
  private readonly db: Database.Database;

  /** `dir` = Datenordner des Moduls; `:memory:` für Tests */
  constructor(dir: string) {
    const memory = dir === ':memory:';
    if (!memory) mkdirSync(dir, { recursive: true });
    this.db = new Database(memory ? ':memory:' : join(dir, 'format.sqlite'));
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS procedures (
        id TEXT NOT NULL,
        version INTEGER NOT NULL,
        json TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        imported_by TEXT NOT NULL,
        PRIMARY KEY (id, version)
      );
      CREATE TABLE IF NOT EXISTS changes (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        json TEXT NOT NULL
      );`);
  }

  close(): void {
    this.db.close();
  }

  /** Legt einen Ablauf an, wenn es diese Version noch nicht gibt; `true` = neu. */
  addProcedure(procedure: Procedure, importedAt: string, importedBy: string): boolean {
    const result = this.db
      .prepare(
        'INSERT OR IGNORE INTO procedures (id, version, json, imported_at, imported_by) VALUES (?, ?, ?, ?, ?)',
      )
      .run(procedure.id, procedure.version, JSON.stringify(procedure), importedAt, importedBy);
    return result.changes > 0;
  }

  /** Höchste Version je Ablauf */
  procedures(): Procedure[] {
    return this.db
      .prepare<[], { json: string }>(
        `SELECT json FROM procedures p
         WHERE version = (SELECT MAX(version) FROM procedures q WHERE q.id = p.id)
         ORDER BY id`,
      )
      .all()
      .map((r) => JSON.parse(r.json) as Procedure);
  }

  procedure(id: string): Procedure | null {
    return this.procedures().find((p) => p.id === id) ?? null;
  }

  latestVersion(id: string): number {
    const row = this.db
      .prepare<[string], { v: number | null }>(
        'SELECT MAX(version) AS v FROM procedures WHERE id = ?',
      )
      .get(id);
    return row?.v ?? 0;
  }

  /** Nächste Nummer im Jahr, z. B. FW-2026-0001 */
  nextChangeId(year: number): string {
    const prefix = `FW-${String(year)}-`;
    const row = this.db
      .prepare<[string], { n: number }>(`SELECT COUNT(*) AS n FROM changes WHERE id LIKE ? || '%'`)
      .get(prefix);
    return `${prefix}${String((row?.n ?? 0) + 1).padStart(4, '0')}`;
  }

  save(change: Change): void {
    this.db
      .prepare(
        'INSERT INTO changes (id, status, json) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, json = excluded.json',
      )
      .run(change.id, change.status, JSON.stringify(change));
  }

  change(id: string): Change | null {
    const row = this.db
      .prepare<[string], { json: string }>('SELECT json FROM changes WHERE id = ?')
      .get(id);
    return row ? (JSON.parse(row.json) as Change) : null;
  }

  /** Laufender oder durchgeführter, noch nicht freigegebener Wechsel (höchstens einer je Linie) */
  open(): Change | null {
    const row = this.db
      .prepare<[], { json: string }>(
        `SELECT json FROM changes WHERE status IN ('running', 'performed') ORDER BY rowid DESC LIMIT 1`,
      )
      .get();
    return row ? (JSON.parse(row.json) as Change) : null;
  }

  /** Zuletzt freigegebener Wechsel */
  lastReleased(): Change | null {
    const row = this.db
      .prepare<[], { json: string }>(
        `SELECT json FROM changes WHERE status = 'released' ORDER BY rowid DESC LIMIT 1`,
      )
      .get();
    return row ? (JSON.parse(row.json) as Change) : null;
  }
}

/** Rezept laut Maschine – aus der letzten Batch-Meldung (die Schnittstelle kennt kein anderes) */
export interface ReportedRecipe {
  machineId: string;
  batchId: string;
  event: string;
  recipe: RecipeRef;
  /** Zeitpunkt der Meldung (Quelle, UTC) */
  at: string;
}
