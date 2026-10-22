import { createHash } from 'node:crypto';
import type { Db } from '../db.js';

export interface AuditInput {
  /** Benutzername des Handelnden; `system` für Vorgänge ohne Benutzer */
  username: string;
  userName: string;
  /** `<modul>.<vorgang>`, z. B. `core.module.booked` */
  action: string;
  module: string;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  /** Bedeutung der e-Signatur, z. B. „Freigabe“ – nur bei Signaturen */
  meaning?: string | null;
}

export interface AuditEntry extends Required<
  Omit<AuditInput, 'oldValue' | 'newValue' | 'reason' | 'meaning'>
> {
  seq: number;
  /** UTC, RFC 3339 */
  ts: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  meaning: string | null;
  prevHash: string;
  hash: string;
}

export const GENESIS_HASH = '0'.repeat(64);

interface Row {
  seq: number;
  ts: string;
  username: string;
  user_name: string;
  action: string;
  module: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  meaning: string | null;
  prev_hash: string;
  hash: string;
}

function hashOf(entry: Omit<AuditEntry, 'hash'>): string {
  const canonical = JSON.stringify([
    entry.seq,
    entry.ts,
    entry.username,
    entry.userName,
    entry.action,
    entry.module,
    entry.oldValue,
    entry.newValue,
    entry.reason,
    entry.meaning,
    entry.prevHash,
  ]);
  return createHash('sha256').update(canonical).digest('hex');
}

const toEntry = (r: Row): AuditEntry => ({
  seq: r.seq,
  ts: r.ts,
  username: r.username,
  userName: r.user_name,
  action: r.action,
  module: r.module,
  oldValue: r.old_value,
  newValue: r.new_value,
  reason: r.reason,
  meaning: r.meaning,
  prevHash: r.prev_hash,
  hash: r.hash,
});

/**
 * Zentraler Audit Trail (CLAUDE.md, Abschnitt 4): nur Anhängen, Zeitstempel in UTC vom Core, jeder Eintrag
 * trägt den Hash seines Vorgängers. Ändern und Löschen verhindert die Datenbank (Trigger).
 */
export class AuditLog {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
  ) {}

  record(input: AuditInput): AuditEntry {
    const append = this.db.transaction((): AuditEntry => {
      const last = this.db
        .prepare('SELECT seq, hash FROM audit_log ORDER BY seq DESC LIMIT 1')
        .get() as { seq: number; hash: string } | undefined;
      const base: Omit<AuditEntry, 'hash'> = {
        seq: (last?.seq ?? 0) + 1,
        ts: this.now().toISOString(),
        username: input.username,
        userName: input.userName,
        action: input.action,
        module: input.module,
        oldValue: input.oldValue ?? null,
        newValue: input.newValue ?? null,
        reason: input.reason ?? null,
        meaning: input.meaning ?? null,
        prevHash: last?.hash ?? GENESIS_HASH,
      };
      const entry = { ...base, hash: hashOf(base) };
      this.db
        .prepare(
          `INSERT INTO audit_log (seq, ts, username, user_name, action, module, old_value, new_value, reason, meaning, prev_hash, hash)
           VALUES (@seq, @ts, @username, @userName, @action, @module, @oldValue, @newValue, @reason, @meaning, @prevHash, @hash)`,
        )
        .run(entry);
      return entry;
    });
    return append();
  }

  /** Neueste zuerst. */
  list(limit = 200): AuditEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM audit_log ORDER BY seq DESC LIMIT ?')
      .all(limit) as Row[];
    return rows.map(toEntry);
  }

  /** Prüft die Hash-Kette vom ersten bis zum letzten Eintrag. */
  verify(): { valid: boolean; count: number; brokenAt: number | null } {
    const rows = this.db.prepare('SELECT * FROM audit_log ORDER BY seq ASC').all() as Row[];
    let prev = GENESIS_HASH;
    for (const row of rows) {
      const entry = toEntry(row);
      const { hash, ...rest } = entry;
      if (entry.prevHash !== prev || hashOf(rest) !== hash) {
        return { valid: false, count: rows.length, brokenAt: entry.seq };
      }
      prev = hash;
    }
    return { valid: true, count: rows.length, brokenAt: null };
  }
}
