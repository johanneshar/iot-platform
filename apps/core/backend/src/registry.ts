import type { ModuleManifest } from '@iot/module-sdk/manifest';
import type { Db } from './db.js';

/** Modul-Registry: jedes Modul meldet beim Start sein Manifest an (ADR-002). */
export class Registry {
  constructor(private readonly db: Db) {}

  register(manifest: ModuleManifest): void {
    this.db
      .prepare(
        `INSERT INTO registered_modules (id, manifest, registered_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET manifest = excluded.manifest, registered_at = excluded.registered_at`,
      )
      .run(manifest.id, JSON.stringify(manifest), new Date().toISOString());
  }

  unregister(moduleId: string): void {
    this.db.prepare('DELETE FROM registered_modules WHERE id = ?').run(moduleId);
  }

  list(): ModuleManifest[] {
    const rows = this.db.prepare('SELECT manifest FROM registered_modules ORDER BY id').all() as {
      manifest: string;
    }[];
    return rows.map((r) => JSON.parse(r.manifest) as ModuleManifest);
  }
}
