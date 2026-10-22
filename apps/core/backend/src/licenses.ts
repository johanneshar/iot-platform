import type { Db } from './db.js';

/**
 * Lizenzstatus je Modul. Im Betrieb kommt er vom IEM (E-14); die Anbindung ist offen (O-06).
 * Bis dahin gilt der lokale Speicher – mit derselben Schnittstelle.
 */
export interface LicenseProvider {
  isBooked(moduleId: string): boolean;
  setBooked(moduleId: string, booked: boolean): void;
}

export class LocalLicenseProvider implements LicenseProvider {
  constructor(
    private readonly db: Db,
    /** Buchungsstand beim ersten Start (nur Entwicklung) */
    seed: readonly string[] = [],
  ) {
    const count = db.prepare('SELECT COUNT(*) AS n FROM licenses').get() as { n: number };
    if (count.n === 0) for (const id of seed) this.setBooked(id, true);
  }

  isBooked(moduleId: string): boolean {
    const row = this.db.prepare('SELECT booked FROM licenses WHERE module_id = ?').get(moduleId) as
      { booked: number } | undefined;
    return row?.booked === 1;
  }

  setBooked(moduleId: string, booked: boolean): void {
    this.db
      .prepare(
        `INSERT INTO licenses (module_id, booked, changed_at) VALUES (?, ?, ?)
         ON CONFLICT(module_id) DO UPDATE SET booked = excluded.booked, changed_at = excluded.changed_at`,
      )
      .run(moduleId, booked ? 1 : 0, new Date().toISOString());
  }
}
