import { Ajv2020 } from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import schema from '../schemas/catalog.schema.json' with { type: 'json' };
import type { Catalog } from '../shared/spares';

const validate = new Ajv2020({ allErrors: true }).compile(schema);

/** Prüft einen Katalog über das Schema hinaus: eindeutige Nummern, nur bekannte Baugruppen. */
export function checkCatalog(catalog: Catalog): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const part of catalog.parts) {
    if (seen.has(part.id)) errors.push(`Teilenummer ${part.id} doppelt`);
    seen.add(part.id);
    if (!catalog.groups.includes(part.group))
      errors.push(`${part.id}: Baugruppe „${part.group}“ nicht in groups`);
  }
  return errors;
}

/** Lädt den Katalog (bis zur PLM-Anbindung eine Datei, O-02); wirft bei ungültigem Inhalt. */
export function loadCatalog(file: string): Catalog {
  const data: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!validate(data)) {
    const errors = (validate.errors ?? []).map(
      (e) => `${e.instancePath || '/'} ${e.message ?? ''}`,
    );
    throw new Error(`Ersatzteilkatalog ${file} ungültig: ${errors.join('; ')}`);
  }
  const catalog = data as unknown as Catalog;
  const errors = checkCatalog(catalog);
  if (errors.length > 0) throw new Error(`Ersatzteilkatalog ${file}: ${errors.join('; ')}`);
  return catalog;
}
