import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { PathStep } from '../shared/fault-tree';

export interface SolutionInput {
  treeId: string;
  treeVersion: number;
  alarmId: string | null;
  machineId: string | null;
  path: PathStep[];
  resultNode: string;
}

export interface SolutionRecord extends SolutionInput {
  id: number;
  ts: string;
  username: string;
  userName: string;
}

/**
 * Störungsverlauf: dokumentierte Lösungswege mit Benutzer und Zeit (E-35). Nicht GxP-relevant – daher hier
 * im Modul und nicht im Audit Trail.
 */
export class SolutionStore {
  private readonly db: Database.Database;

  constructor(dataDir: string) {
    let file = dataDir;
    if (dataDir !== ':memory:') {
      mkdirSync(dataDir, { recursive: true });
      file = join(dataDir, 'troubleshooting.sqlite');
    }
    this.db = new Database(file);
    this.db.exec(`CREATE TABLE IF NOT EXISTS solutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL, username TEXT NOT NULL, user_name TEXT NOT NULL,
      tree_id TEXT NOT NULL, tree_version INTEGER NOT NULL,
      alarm_id TEXT, machine_id TEXT, path TEXT NOT NULL, result_node TEXT NOT NULL
    )`);
  }

  add(
    input: SolutionInput,
    user: { username: string; displayName: string },
    now = new Date(),
  ): SolutionRecord {
    const ts = now.toISOString();
    const result = this.db
      .prepare(
        `INSERT INTO solutions (ts, username, user_name, tree_id, tree_version, alarm_id, machine_id, path, result_node)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        ts,
        user.username,
        user.displayName,
        input.treeId,
        input.treeVersion,
        input.alarmId,
        input.machineId,
        JSON.stringify(input.path),
        input.resultNode,
      );
    return {
      ...input,
      id: Number(result.lastInsertRowid),
      ts,
      username: user.username,
      userName: user.displayName,
    };
  }

  /** Wie oft welche Lösung zutraf – Grundlage, die Fehlerbäume zu verbessern. */
  stats(): { treeId: string; resultNode: string; count: number }[] {
    return this.db
      .prepare(
        'SELECT tree_id AS treeId, result_node AS resultNode, COUNT(*) AS count FROM solutions GROUP BY tree_id, result_node ORDER BY count DESC',
      )
      .all() as { treeId: string; resultNode: string; count: number }[];
  }

  close(): void {
    this.db.close();
  }
}
