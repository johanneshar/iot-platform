import type { AlarmData } from '@iot/interface-schema';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AlarmOccurrence, TopFault } from '../shared/alarm-history';

const DAY_MS = 24 * 60 * 60 * 1000;

interface Row {
  id: number;
  machine_id: string;
  alarm_id: string;
  class: AlarmOccurrence['class'];
  text: string | null;
  raised_at: string;
  cleared_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
}

const toOccurrence = (r: Row): AlarmOccurrence => ({
  id: r.id,
  machineId: r.machine_id,
  alarmId: r.alarm_id,
  class: r.class,
  text: r.text === null ? null : (JSON.parse(r.text) as AlarmOccurrence['text']),
  raisedAt: r.raised_at,
  clearedAt: r.cleared_at,
  acknowledgedAt: r.acknowledged_at,
  acknowledgedBy: r.acknowledged_by,
});

/**
 * Alarmverlauf der Linie aus den kanonischen `alarms`-Topics. Aufbewahrung standardmäßig 90 Tage (E-34).
 * Nicht GxP-relevant; quittiert wird ausschließlich an der Maschine (E-32).
 */
export class AlarmHistory {
  private readonly db: Database.Database;

  constructor(dataDir: string) {
    let file = dataDir;
    if (dataDir !== ':memory:') {
      mkdirSync(dataDir, { recursive: true });
      file = join(dataDir, 'alarms.sqlite');
    }
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`CREATE TABLE IF NOT EXISTS occurrences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id TEXT NOT NULL, alarm_id TEXT NOT NULL, class TEXT NOT NULL, text TEXT,
      raised_at TEXT NOT NULL, cleared_at TEXT, acknowledged_at TEXT, acknowledged_by TEXT
    );
    CREATE INDEX IF NOT EXISTS occurrences_raised ON occurrences (raised_at);
    CREATE INDEX IF NOT EXISTS occurrences_open ON occurrences (machine_id, alarm_id, cleared_at);`);
  }

  private open(machineId: string, alarmId: string): Row | undefined {
    return this.db
      .prepare(
        'SELECT * FROM occurrences WHERE machine_id = ? AND alarm_id = ? AND cleared_at IS NULL ORDER BY id DESC LIMIT 1',
      )
      .get(machineId, alarmId) as Row | undefined;
  }

  /** Ein Ereignis der Schnittstelle übernehmen; `ts` ist der Zeitstempel der Quelle. */
  record(machineId: string, alarm: AlarmData, ts: string): void {
    const open = this.open(machineId, alarm.alarmId);
    if (alarm.event === 'raised') {
      if (open) return; // doppelt gemeldet
      this.db
        .prepare(
          'INSERT INTO occurrences (machine_id, alarm_id, class, text, raised_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(
          machineId,
          alarm.alarmId,
          alarm.class,
          alarm.text ? JSON.stringify(alarm.text) : null,
          ts,
        );
    } else if (alarm.event === 'cleared') {
      if (open)
        this.db.prepare('UPDATE occurrences SET cleared_at = ? WHERE id = ?').run(ts, open.id);
    } else if (open) {
      this.db
        .prepare('UPDATE occurrences SET acknowledged_at = ?, acknowledged_by = ? WHERE id = ?')
        .run(ts, alarm.user, open.id);
    }
  }

  /** Alarme, die im Zeitraum gekommen sind oder noch anstehen – neueste zuerst. */
  list(days: number, now = new Date(), limit = 500): AlarmOccurrence[] {
    const since = new Date(now.getTime() - days * DAY_MS).toISOString();
    return (
      this.db
        .prepare(
          'SELECT * FROM occurrences WHERE raised_at >= ? OR cleared_at IS NULL ORDER BY raised_at DESC LIMIT ?',
        )
        .all(since, limit) as Row[]
    ).map(toOccurrence);
  }

  /**
   * Top-Störungen (E-33): Summe der Dauer „kommt“ bis „geht“ je Alarm der Klasse Störung, nur der Anteil
   * im Zeitraum; anstehende Störungen zählen bis jetzt.
   */
  topFaults(days: number, now = new Date(), limit = 5): TopFault[] {
    const end = now.getTime();
    const start = end - days * DAY_MS;
    const rows = this.db
      .prepare(
        "SELECT * FROM occurrences WHERE class = 'fault' AND raised_at <= ? AND (cleared_at IS NULL OR cleared_at >= ?)",
      )
      .all(now.toISOString(), new Date(start).toISOString()) as Row[];
    const sums = new Map<string, TopFault & { ms: number }>();
    for (const row of rows) {
      const from = Math.max(start, Date.parse(row.raised_at));
      const to = Math.min(end, row.cleared_at === null ? end : Date.parse(row.cleared_at));
      const key = `${row.machine_id}\u0000${row.alarm_id}`;
      const entry = sums.get(key) ?? {
        alarmId: row.alarm_id,
        machineId: row.machine_id,
        text: toOccurrence(row).text,
        minutes: 0,
        count: 0,
        ms: 0,
      };
      entry.ms += Math.max(0, to - from);
      entry.count += 1;
      sums.set(key, entry);
    }
    return (
      [...sums.values()]
        // Ohne Stillstandszeit keine Top-Störung (kommt und geht im selben Moment)
        .filter((f) => f.ms > 0)
        .sort((a, b) => b.ms - a.ms || a.alarmId.localeCompare(b.alarmId))
        .slice(0, limit)
        .map(({ ms, ...fault }) => ({ ...fault, minutes: Math.round(ms / 60_000) }))
    );
  }

  /** Abgeschlossene Alarme älter als die Aufbewahrungszeit löschen; gibt die Anzahl zurück. */
  purge(retentionDays: number, now = new Date()): number {
    const before = new Date(now.getTime() - retentionDays * DAY_MS).toISOString();
    return this.db
      .prepare('DELETE FROM occurrences WHERE cleared_at IS NOT NULL AND cleared_at < ?')
      .run(before).changes;
  }

  close(): void {
    this.db.close();
  }
}
