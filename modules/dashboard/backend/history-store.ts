import type { DataByClass, IdentityData, LocalizedText, MetaData } from '@iot/interface-schema';
import type { PackMLState } from '@iot/module-sdk/data';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MINUTE = 60_000;

export interface StateRow {
  ts: number;
  state: PackMLState;
  reason: string | null;
}
export interface CounterRow {
  ts: number;
  good: number;
  total: number;
  resetAt: string;
}
export interface ValueRow {
  key: string;
  minute: number;
  sum: number;
  n: number;
  lo: number;
  hi: number;
}
export interface AlarmRow {
  alarmId: string;
  class: 'fault' | 'warning' | 'info';
  text: LocalizedText | null;
  raisedAt: number;
  clearedAt: number | null;
}

/** Was die Auswertung einer Maschine im Zeitraum braucht. */
export interface MachineHistory {
  identity: IdentityData | null;
  meta: MetaData | null;
  /** Zustand zu Beginn des Zeitraums (letzter Wechsel davor) und alle Wechsel im Zeitraum */
  states: StateRow[];
  /** letzter Zählerstand vor dem Zeitraum und je Minute der letzte im Zeitraum */
  counters: CounterRow[];
  values: ValueRow[];
  alarms: AlarmRow[];
}

/**
 * Verlauf der Linie im Dashboard-Modul (ADR-010): Zustandswechsel, Zählerstände und Prozesswerte im
 * Minutenraster, Alarme. Nicht GxP-relevant; die Quelle bleibt die Maschine.
 */
export class HistoryStore {
  private readonly db: Database.Database;

  constructor(dataDir: string) {
    let file = dataDir;
    if (dataDir !== ':memory:') {
      mkdirSync(dataDir, { recursive: true });
      file = join(dataDir, 'dashboard.sqlite');
    }
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS machines (machine_id TEXT PRIMARY KEY, identity TEXT, meta TEXT);
      CREATE TABLE IF NOT EXISTS states (machine_id TEXT NOT NULL, ts INTEGER NOT NULL, state TEXT NOT NULL, reason TEXT);
      CREATE INDEX IF NOT EXISTS states_ts ON states (machine_id, ts);
      CREATE TABLE IF NOT EXISTS counters (machine_id TEXT NOT NULL, minute INTEGER NOT NULL, ts INTEGER NOT NULL,
        good INTEGER NOT NULL, total INTEGER NOT NULL, reset_at TEXT NOT NULL, PRIMARY KEY (machine_id, minute));
      CREATE TABLE IF NOT EXISTS vals (machine_id TEXT NOT NULL, key TEXT NOT NULL, minute INTEGER NOT NULL,
        sum REAL NOT NULL, n INTEGER NOT NULL, lo REAL NOT NULL, hi REAL NOT NULL, PRIMARY KEY (machine_id, key, minute));
      CREATE TABLE IF NOT EXISTS alarms (id INTEGER PRIMARY KEY AUTOINCREMENT, machine_id TEXT NOT NULL,
        alarm_id TEXT NOT NULL, class TEXT NOT NULL, text TEXT, raised_at INTEGER NOT NULL, cleared_at INTEGER);
      CREATE INDEX IF NOT EXISTS alarms_open ON alarms (machine_id, alarm_id, cleared_at);
    `);
  }

  identity(machineId: string, data: IdentityData): void {
    this.db
      .prepare(
        'INSERT INTO machines (machine_id, identity) VALUES (?, ?) ON CONFLICT (machine_id) DO UPDATE SET identity = excluded.identity',
      )
      .run(machineId, JSON.stringify(data));
  }

  meta(machineId: string, data: MetaData): void {
    this.db
      .prepare(
        'INSERT INTO machines (machine_id, meta) VALUES (?, ?) ON CONFLICT (machine_id) DO UPDATE SET meta = excluded.meta',
      )
      .run(machineId, JSON.stringify(data));
  }

  /** Nur Wechsel speichern; Wiederholungen (retained, zyklisch) ändern nichts. */
  state(machineId: string, data: DataByClass['state'], ts: number): void {
    const last = this.db
      .prepare(
        'SELECT state, reason FROM states WHERE machine_id = ? AND ts <= ? ORDER BY ts DESC LIMIT 1',
      )
      .get(machineId, ts) as { state: string; reason: string | null } | undefined;
    const reason = data.reason ?? null;
    if (last?.state === data.state && last.reason === reason) return;
    this.db
      .prepare('INSERT INTO states (machine_id, ts, state, reason) VALUES (?, ?, ?, ?)')
      .run(machineId, ts, data.state, reason);
  }

  /** Letzter Zählerstand je Minute. */
  counters(machineId: string, data: DataByClass['counters'], ts: number): void {
    this.db
      .prepare(
        `INSERT INTO counters (machine_id, minute, ts, good, total, reset_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (machine_id, minute) DO UPDATE SET ts = excluded.ts, good = excluded.good,
         total = excluded.total, reset_at = excluded.reset_at WHERE excluded.ts >= counters.ts`,
      )
      .run(machineId, Math.floor(ts / MINUTE) * MINUTE, ts, data.good, data.total, data.resetAt);
  }

  /** Prozesswerte je Minute verdichtet: Summe, Anzahl, Minimum, Maximum. */
  values(machineId: string, data: DataByClass['values'], ts: number): void {
    const minute = Math.floor(ts / MINUTE) * MINUTE;
    const upsert = this.db.prepare(
      `INSERT INTO vals (machine_id, key, minute, sum, n, lo, hi) VALUES (?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT (machine_id, key, minute) DO UPDATE SET sum = sum + excluded.sum, n = n + 1,
       lo = MIN(lo, excluded.lo), hi = MAX(hi, excluded.hi)`,
    );
    for (const v of data.values) upsert.run(machineId, v.key, minute, v.value, v.value, v.value);
  }

  alarm(machineId: string, data: DataByClass['alarms'], ts: number): void {
    const open = this.db
      .prepare(
        'SELECT id FROM alarms WHERE machine_id = ? AND alarm_id = ? AND cleared_at IS NULL ORDER BY id DESC LIMIT 1',
      )
      .get(machineId, data.alarmId) as { id: number } | undefined;
    if (data.event === 'raised' && !open) {
      this.db
        .prepare(
          'INSERT INTO alarms (machine_id, alarm_id, class, text, raised_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(machineId, data.alarmId, data.class, data.text ? JSON.stringify(data.text) : null, ts);
    } else if (data.event === 'cleared' && open) {
      this.db.prepare('UPDATE alarms SET cleared_at = ? WHERE id = ?').run(ts, open.id);
    }
  }

  /** Abgleich mit dem Stand der anstehenden Alarme (S-09): verpasste nachtragen, gegangene schließen. */
  reconcileAlarms(machineId: string, data: DataByClass['activeAlarms'], ts: number): void {
    const open = this.db
      .prepare('SELECT id, alarm_id FROM alarms WHERE machine_id = ? AND cleared_at IS NULL')
      .all(machineId) as { id: number; alarm_id: string }[];
    for (const a of data.alarms) {
      if (open.some((o) => o.alarm_id === a.alarmId)) continue;
      this.db
        .prepare(
          'INSERT INTO alarms (machine_id, alarm_id, class, text, raised_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(
          machineId,
          a.alarmId,
          a.class,
          a.text ? JSON.stringify(a.text) : null,
          Date.parse(a.raisedAt),
        );
    }
    for (const o of open) {
      if (!data.alarms.some((a) => a.alarmId === o.alarm_id)) {
        this.db.prepare('UPDATE alarms SET cleared_at = ? WHERE id = ?').run(ts, o.id);
      }
    }
  }

  machineIds(): string[] {
    return (
      this.db.prepare('SELECT machine_id FROM machines').all() as { machine_id: string }[]
    ).map((r) => r.machine_id);
  }

  load(machineId: string, from: number, to: number): MachineHistory {
    const m = this.db
      .prepare('SELECT identity, meta FROM machines WHERE machine_id = ?')
      .get(machineId) as { identity: string | null; meta: string | null } | undefined;
    const states = [
      ...(this.db
        .prepare(
          'SELECT ts, state, reason FROM states WHERE machine_id = ? AND ts < ? ORDER BY ts DESC LIMIT 1',
        )
        .all(machineId, from) as StateRow[]),
      ...(this.db
        .prepare(
          'SELECT ts, state, reason FROM states WHERE machine_id = ? AND ts >= ? AND ts <= ? ORDER BY ts',
        )
        .all(machineId, from, to) as StateRow[]),
    ];
    const counterCols =
      'SELECT ts, good, total, reset_at AS resetAt FROM counters WHERE machine_id = ?';
    const counters = [
      ...(this.db
        .prepare(`${counterCols} AND ts < ? ORDER BY ts DESC LIMIT 1`)
        .all(machineId, from) as CounterRow[]),
      ...(this.db
        .prepare(`${counterCols} AND ts >= ? AND ts <= ? ORDER BY ts`)
        .all(machineId, from, to) as CounterRow[]),
    ];
    const values = this.db
      .prepare(
        'SELECT key, minute, sum, n, lo, hi FROM vals WHERE machine_id = ? AND minute >= ? AND minute <= ? ORDER BY minute',
      )
      .all(machineId, Math.floor(from / MINUTE) * MINUTE, to) as ValueRow[];
    const alarms = (
      this.db
        .prepare(
          `SELECT alarm_id AS alarmId, class, text, raised_at AS raisedAt, cleared_at AS clearedAt FROM alarms
           WHERE machine_id = ? AND raised_at <= ? AND (cleared_at IS NULL OR cleared_at >= ?) ORDER BY raised_at`,
        )
        .all(machineId, to, from) as (Omit<AlarmRow, 'text'> & { text: string | null })[]
    ).map((a) => ({ ...a, text: a.text === null ? null : (JSON.parse(a.text) as LocalizedText) }));
    return {
      identity: m?.identity ? (JSON.parse(m.identity) as IdentityData) : null,
      meta: m?.meta ? (JSON.parse(m.meta) as MetaData) : null,
      states,
      counters,
      values,
      alarms,
    };
  }

  /** Verlauf älter als `before` löschen; den letzten Zustand je Maschine behalten. */
  purge(before: number): void {
    this.db.prepare('DELETE FROM counters WHERE ts < ?').run(before);
    this.db.prepare('DELETE FROM vals WHERE minute < ?').run(before);
    this.db
      .prepare('DELETE FROM alarms WHERE cleared_at IS NOT NULL AND cleared_at < ?')
      .run(before);
    this.db
      .prepare(
        `DELETE FROM states WHERE ts < ? AND ts < (SELECT MAX(s.ts) FROM states s
         WHERE s.machine_id = states.machine_id AND s.ts < ?)`,
      )
      .run(before, before);
  }

  close(): void {
    this.db.close();
  }
}
