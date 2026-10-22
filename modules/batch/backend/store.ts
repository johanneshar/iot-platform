import type { DataByClass, IdentityData, LocalizedText, MetaData } from '@iot/interface-schema';
import type { DataQuality } from '@iot/module-sdk/data';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AuditRef, BatchReport, BatchStatus, BatchSummary } from '../shared/batch';

/** Ohne Nachricht länger als das gilt als Datenlücke (Zähler kommen zyklisch alle 5 s) */
export const GAP_MS = 60_000;

interface BatchRow {
  batch_id: string;
  recipe_id: string;
  recipe_version: number;
  format_parts: string;
  started_at: number;
  ended_at: number | null;
  line_release: string | null;
  clearance: string | null;
  review: string | null;
  release: string | null;
  report: string | null;
  report_hash: string | null;
}

export interface CounterRow {
  machineId: string;
  ts: number;
  good: number;
  total: number;
  resetAt: string;
}

// T beschreibt den gespeicherten JSON-Inhalt
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
const parse = <T>(text: string | null): T | null =>
  text === null ? null : (JSON.parse(text) as T);

/**
 * Batchdaten in SQLite (ADR-011): Ereignisse, Rohwerte der GxP-relevanten Prozesswerte mit Quellzeitstempel
 * und Qualität, Zähler, Alarme, Datenlücken. Aufbewahrung unbegrenzt (E-43). Signaturen und Bestätigungen
 * stehen im Audit Trail des Core; hier nur der Verweis darauf.
 */
export class BatchStore {
  private readonly db: Database.Database;

  constructor(dataDir: string) {
    let file = dataDir;
    if (dataDir !== ':memory:') {
      mkdirSync(dataDir, { recursive: true });
      file = join(dataDir, 'batch.sqlite');
    }
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS machines (machine_id TEXT PRIMARY KEY, identity TEXT, meta TEXT,
        active_batch TEXT, last_message INTEGER);
      CREATE TABLE IF NOT EXISTS batches (batch_id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL,
        recipe_version INTEGER NOT NULL, format_parts TEXT NOT NULL, started_at INTEGER NOT NULL,
        ended_at INTEGER, line_release TEXT, clearance TEXT, review TEXT, release TEXT, report TEXT,
        report_hash TEXT);
      CREATE TABLE IF NOT EXISTS batch_machines (batch_id TEXT NOT NULL, machine_id TEXT NOT NULL,
        started_at INTEGER NOT NULL, ended_at INTEGER, PRIMARY KEY (batch_id, machine_id));
      CREATE TABLE IF NOT EXISTS events (batch_id TEXT NOT NULL, machine_id TEXT NOT NULL,
        event TEXT NOT NULL, ts INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS gxp_values (batch_id TEXT NOT NULL, machine_id TEXT NOT NULL,
        key TEXT NOT NULL, ts INTEGER NOT NULL, value REAL NOT NULL, quality TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS gxp_values_batch ON gxp_values (batch_id, machine_id, key);
      CREATE TABLE IF NOT EXISTS counters (batch_id TEXT NOT NULL, machine_id TEXT NOT NULL,
        ts INTEGER NOT NULL, good INTEGER NOT NULL, total INTEGER NOT NULL, reset_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS counters_batch ON counters (batch_id, machine_id, ts);
      CREATE TABLE IF NOT EXISTS alarms (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id TEXT NOT NULL,
        machine_id TEXT NOT NULL, alarm_id TEXT NOT NULL, class TEXT NOT NULL, text TEXT,
        raised_at INTEGER NOT NULL, cleared_at INTEGER);
      CREATE TABLE IF NOT EXISTS gaps (batch_id TEXT NOT NULL, machine_id TEXT NOT NULL,
        from_ts INTEGER NOT NULL, to_ts INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS line_releases (seq INTEGER PRIMARY KEY, ref TEXT NOT NULL,
        ts INTEGER NOT NULL, batch_id TEXT);
      -- Eingefrorene Berichte sind unveränderbar (21 CFR Part 11 / Annex 11)
      CREATE TRIGGER IF NOT EXISTS report_frozen BEFORE UPDATE OF report, report_hash ON batches
        WHEN OLD.report IS NOT NULL
        BEGIN SELECT RAISE(ABORT, 'Batchbericht ist eingefroren'); END;
    `);
  }

  private machine(machineId: string): { active_batch: string | null; last_message: number | null } {
    this.db.prepare('INSERT OR IGNORE INTO machines (machine_id) VALUES (?)').run(machineId);
    return this.db
      .prepare('SELECT active_batch, last_message FROM machines WHERE machine_id = ?')
      .get(machineId) as { active_batch: string | null; last_message: number | null };
  }

  identity(machineId: string, data: IdentityData): void {
    this.machine(machineId);
    this.db
      .prepare('UPDATE machines SET identity = ? WHERE machine_id = ?')
      .run(JSON.stringify(data), machineId);
  }

  meta(machineId: string, data: MetaData): void {
    this.machine(machineId);
    this.db
      .prepare('UPDATE machines SET meta = ? WHERE machine_id = ?')
      .run(JSON.stringify(data), machineId);
  }

  identityOf(machineId: string): IdentityData | null {
    const row = this.db
      .prepare('SELECT identity FROM machines WHERE machine_id = ?')
      .get(machineId) as { identity: string | null } | undefined;
    return parse<IdentityData>(row?.identity ?? null);
  }

  metaOf(machineId: string): MetaData | null {
    const row = this.db.prepare('SELECT meta FROM machines WHERE machine_id = ?').get(machineId) as
      { meta: string | null } | undefined;
    return parse<MetaData>(row?.meta ?? null);
  }

  /** Jede Nachricht einer Maschine im Batch: Datenlücken erkennen. */
  seen(machineId: string, ts: number): void {
    const m = this.machine(machineId);
    if (m.active_batch && m.last_message !== null && ts - m.last_message > GAP_MS) {
      this.db
        .prepare('INSERT INTO gaps (batch_id, machine_id, from_ts, to_ts) VALUES (?, ?, ?, ?)')
        .run(m.active_batch, machineId, m.last_message, ts);
    }
    if (m.last_message === null || ts > m.last_message) {
      this.db
        .prepare('UPDATE machines SET last_message = ? WHERE machine_id = ?')
        .run(ts, machineId);
    }
  }

  batch(machineId: string, data: DataByClass['batch'], ts: number): void {
    const m = this.machine(machineId);
    const id = data.batchId;
    const known = this.db.prepare('SELECT ended_at FROM batches WHERE batch_id = ?').get(id) as
      { ended_at: number | null } | undefined;
    // Wiederholte Meldungen (z. B. nach einem Neustart) ändern nichts
    const seen = this.db
      .prepare(
        'SELECT 1 FROM events WHERE batch_id = ? AND machine_id = ? AND event = ? AND ts = ?',
      )
      .get(id, machineId, data.event, ts);
    if (seen) return;
    if (data.event === 'started') {
      if (!known) {
        this.db
          .prepare(
            'INSERT INTO batches (batch_id, recipe_id, recipe_version, format_parts, started_at) VALUES (?, ?, ?, ?, ?)',
          )
          .run(id, data.recipe.id, data.recipe.version, JSON.stringify(data.formatParts), ts);
        this.attachLineRelease(id, ts);
      } else if (known.ended_at !== null) {
        return; // Batch ist abgeschlossen
      }
      this.db
        .prepare(
          'INSERT OR IGNORE INTO batch_machines (batch_id, machine_id, started_at) VALUES (?, ?, ?)',
        )
        .run(id, machineId, ts);
      this.db
        .prepare('UPDATE batches SET started_at = MIN(started_at, ?) WHERE batch_id = ?')
        .run(ts, id);
      this.db
        .prepare('UPDATE machines SET active_batch = ?, last_message = ? WHERE machine_id = ?')
        .run(id, ts, machineId);
    }
    if (!known && data.event !== 'started') return;
    this.db
      .prepare('INSERT INTO events (batch_id, machine_id, event, ts) VALUES (?, ?, ?, ?)')
      .run(id, machineId, data.event, ts);
    if (data.event === 'ended') {
      this.db
        .prepare('UPDATE batch_machines SET ended_at = ? WHERE batch_id = ? AND machine_id = ?')
        .run(ts, id, machineId);
      if (m.active_batch === id || this.machine(machineId).active_batch === id) {
        this.db
          .prepare('UPDATE machines SET active_batch = NULL WHERE machine_id = ?')
          .run(machineId);
      }
      const open = this.db
        .prepare('SELECT COUNT(*) AS n FROM batch_machines WHERE batch_id = ? AND ended_at IS NULL')
        .get(id) as { n: number };
      if (open.n === 0) {
        const end = this.db
          .prepare('SELECT MAX(ended_at) AS t FROM batch_machines WHERE batch_id = ?')
          .get(id) as { t: number };
        this.db.prepare('UPDATE batches SET ended_at = ? WHERE batch_id = ?').run(end.t, id);
      }
    }
  }

  activeBatch(machineId: string): string | null {
    return this.machine(machineId).active_batch;
  }

  counters(machineId: string, data: DataByClass['counters'], ts: number): void {
    const batch = this.activeBatch(machineId);
    if (!batch) return;
    this.db
      .prepare(
        'INSERT INTO counters (batch_id, machine_id, ts, good, total, reset_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(batch, machineId, ts, data.good, data.total, data.resetAt);
  }

  /** Nur GxP-relevante Werte (Wertekatalog `gxp: true`), als Rohwerte mit Qualität. */
  values(machineId: string, data: DataByClass['values'], ts: number, quality: DataQuality): void {
    const batch = this.activeBatch(machineId);
    if (!batch) return;
    const gxp = new Set(
      (this.metaOf(machineId)?.values ?? []).filter((v) => v.gxp).map((v) => v.key),
    );
    const insert = this.db.prepare(
      'INSERT INTO gxp_values (batch_id, machine_id, key, ts, value, quality) VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const v of data.values)
      if (gxp.has(v.key)) insert.run(batch, machineId, v.key, ts, v.value, quality);
  }

  alarm(machineId: string, data: DataByClass['alarms'], ts: number): void {
    const batch = this.activeBatch(machineId);
    const open = this.db
      .prepare(
        'SELECT id FROM alarms WHERE machine_id = ? AND alarm_id = ? AND cleared_at IS NULL ORDER BY id DESC LIMIT 1',
      )
      .get(machineId, data.alarmId) as { id: number } | undefined;
    if (data.event === 'raised' && !open && batch) {
      this.db
        .prepare(
          'INSERT INTO alarms (batch_id, machine_id, alarm_id, class, text, raised_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          batch,
          machineId,
          data.alarmId,
          data.class,
          data.text ? JSON.stringify(data.text) : null,
          ts,
        );
    } else if (data.event === 'cleared' && open) {
      this.db.prepare('UPDATE alarms SET cleared_at = ? WHERE id = ?').run(ts, open.id);
    }
  }

  // ── Linienfreigabe (E-40) ──────────────────────────────────────────────────────

  /** Linienfreigabe merken; sie gilt für den nächsten Batch – oder den laufenden ohne Freigabe. */
  addLineRelease(ref: AuditRef): void {
    this.db
      .prepare('INSERT OR IGNORE INTO line_releases (seq, ref, ts) VALUES (?, ?, ?)')
      .run(ref.seq, JSON.stringify(ref), Date.parse(ref.ts));
    const running = this.db
      .prepare(
        'SELECT batch_id FROM batches WHERE ended_at IS NULL AND line_release IS NULL ORDER BY started_at DESC LIMIT 1',
      )
      .get() as { batch_id: string } | undefined;
    if (running) this.attachLineRelease(running.batch_id, null);
  }

  pendingLineRelease(): AuditRef | null {
    const row = this.db
      .prepare('SELECT ref FROM line_releases WHERE batch_id IS NULL ORDER BY seq DESC LIMIT 1')
      .get() as { ref: string } | undefined;
    return parse<AuditRef>(row?.ref ?? null);
  }

  private attachLineRelease(batchId: string, startedAt: number | null): void {
    const row = this.db
      .prepare(
        'SELECT seq, ref, ts FROM line_releases WHERE batch_id IS NULL ORDER BY seq DESC LIMIT 1',
      )
      .get() as { seq: number; ref: string; ts: number } | undefined;
    if (!row) return;
    const batch = this.db
      .prepare('SELECT started_at FROM batches WHERE batch_id = ?')
      .get(batchId) as {
      started_at: number;
    };
    const start = startedAt ?? batch.started_at;
    const ref = { ...(JSON.parse(row.ref) as AuditRef), afterStart: row.ts > start };
    this.db.prepare('UPDATE line_releases SET batch_id = ? WHERE seq = ?').run(batchId, row.seq);
    this.db
      .prepare('UPDATE batches SET line_release = ? WHERE batch_id = ?')
      .run(JSON.stringify(ref), batchId);
  }

  // ── Ablauf nach dem Batch ─────────────────────────────────────────────────────

  setStep(batchId: string, step: 'clearance' | 'review' | 'release', ref: AuditRef): void {
    this.db
      .prepare(`UPDATE batches SET ${step} = ? WHERE batch_id = ?`)
      .run(JSON.stringify(ref), batchId);
  }

  freeze(batchId: string, report: BatchReport, hash: string): void {
    this.db
      .prepare('UPDATE batches SET report = ?, report_hash = ? WHERE batch_id = ?')
      .run(JSON.stringify(report), hash, batchId);
  }

  report(batchId: string): BatchReport | null {
    const row = this.db.prepare('SELECT report FROM batches WHERE batch_id = ?').get(batchId) as
      { report: string | null } | undefined;
    return parse<BatchReport>(row?.report ?? null);
  }

  // ── Lesen ────────────────────────────────────────────────────────────────────

  private summary(row: BatchRow): BatchSummary {
    const machines = (
      this.db
        .prepare('SELECT machine_id FROM batch_machines WHERE batch_id = ? ORDER BY started_at')
        .all(row.batch_id) as {
        machine_id: string;
      }[]
    ).map((m) => m.machine_id);
    const review = parse<AuditRef>(row.review);
    const release = parse<AuditRef>(row.release);
    const clearance = parse<AuditRef>(row.clearance);
    const status: BatchStatus =
      row.ended_at === null
        ? 'running'
        : release
          ? 'released'
          : review
            ? 'reviewed'
            : row.report
              ? 'frozen'
              : 'ended';
    return {
      batchId: row.batch_id,
      recipe: { id: row.recipe_id, version: row.recipe_version },
      formatParts: JSON.parse(row.format_parts) as string[],
      startedAt: new Date(row.started_at).toISOString(),
      endedAt: row.ended_at === null ? null : new Date(row.ended_at).toISOString(),
      status,
      machines,
      lineRelease: parse<AuditRef & { afterStart: boolean }>(row.line_release),
      clearance,
      review,
      release,
      reportHash: row.report_hash,
    };
  }

  list(limit = 50): BatchSummary[] {
    return (
      this.db
        .prepare('SELECT * FROM batches ORDER BY started_at DESC LIMIT ?')
        .all(limit) as BatchRow[]
    ).map((r) => this.summary(r));
  }

  get(batchId: string): BatchSummary | null {
    const row = this.db.prepare('SELECT * FROM batches WHERE batch_id = ?').get(batchId) as
      BatchRow | undefined;
    return row ? this.summary(row) : null;
  }

  // Rohdaten für den Bericht
  events(batchId: string, machineId: string): { event: string; ts: number }[] {
    return this.db
      .prepare('SELECT event, ts FROM events WHERE batch_id = ? AND machine_id = ? ORDER BY ts')
      .all(batchId, machineId) as { event: string; ts: number }[];
  }

  counterRows(batchId: string, machineId: string): CounterRow[] {
    return this.db
      .prepare(
        'SELECT machine_id AS machineId, ts, good, total, reset_at AS resetAt FROM counters WHERE batch_id = ? AND machine_id = ? ORDER BY ts',
      )
      .all(batchId, machineId) as CounterRow[];
  }

  valueRows(
    batchId: string,
    machineId: string,
  ): { key: string; ts: number; value: number; quality: DataQuality }[] {
    return this.db
      .prepare(
        'SELECT key, ts, value, quality FROM gxp_values WHERE batch_id = ? AND machine_id = ? ORDER BY ts',
      )
      .all(batchId, machineId) as {
      key: string;
      ts: number;
      value: number;
      quality: DataQuality;
    }[];
  }

  alarmRows(
    batchId: string,
    machineId: string,
  ): {
    alarmId: string;
    class: 'fault' | 'warning' | 'info';
    text: LocalizedText | null;
    raisedAt: number;
    clearedAt: number | null;
  }[] {
    return (
      this.db
        .prepare(
          'SELECT alarm_id AS alarmId, class, text, raised_at AS raisedAt, cleared_at AS clearedAt FROM alarms WHERE batch_id = ? AND machine_id = ? ORDER BY raised_at',
        )
        .all(batchId, machineId) as {
        alarmId: string;
        class: 'fault' | 'warning' | 'info';
        text: string | null;
        raisedAt: number;
        clearedAt: number | null;
      }[]
    ).map((a) => ({ ...a, text: parse<LocalizedText>(a.text) }));
  }

  gapRows(batchId: string, machineId: string): { from: number; to: number }[] {
    return this.db
      .prepare(
        'SELECT from_ts AS "from", to_ts AS "to" FROM gaps WHERE batch_id = ? AND machine_id = ? ORDER BY from_ts',
      )
      .all(batchId, machineId) as { from: number; to: number }[];
  }

  machineWindow(batchId: string, machineId: string): { startedAt: number; endedAt: number | null } {
    return this.db
      .prepare(
        'SELECT started_at AS startedAt, ended_at AS endedAt FROM batch_machines WHERE batch_id = ? AND machine_id = ?',
      )
      .get(batchId, machineId) as { startedAt: number; endedAt: number | null };
  }

  lastMessage(machineId: string): number | null {
    return this.machine(machineId).last_message;
  }

  close(): void {
    this.db.close();
  }
}
