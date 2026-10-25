import { Ajv2020 } from 'ajv/dist/2020.js';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import schema from '../schemas/format-procedure.schema.json' with { type: 'json' };
import { checkProcedure, type Procedure } from '../shared/format';

const validate = new Ajv2020({ allErrors: true }).compile(schema);

/** Prüft Schema und Aufbau eines Ablaufs; liefert den Ablauf oder die Fehler. */
export function parseProcedure(
  data: unknown,
  machineIds?: readonly string[],
): { procedure: Procedure } | { errors: string[] } {
  if (!validate(data))
    return {
      errors: (validate.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`),
    };
  const procedure = data as unknown as Procedure;
  const errors = checkProcedure(procedure, machineIds);
  return errors.length > 0 ? { errors } : { procedure };
}

export interface LoadResult {
  procedures: Procedure[];
  /** Datei → Fehler; ungültige Abläufe werden nicht angeboten */
  rejected: Record<string, string[]>;
}

/** Lädt die mitgelieferten Abläufe (`*.json`) eines Ordners. */
export function loadProcedures(dir: string): LoadResult {
  const procedures: Procedure[] = [];
  const rejected: Record<string, string[]> = {};
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch (error) {
      rejected[file] = [`kein gültiges JSON: ${String(error)}`];
      continue;
    }
    const result = parseProcedure(data);
    if ('errors' in result) rejected[file] = result.errors;
    else procedures.push(result.procedure);
  }
  return { procedures, rejected };
}
