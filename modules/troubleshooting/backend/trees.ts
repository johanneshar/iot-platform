import { Ajv2020 } from 'ajv/dist/2020.js';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import schema from '../schemas/fault-tree.schema.json' with { type: 'json' };
import { checkTree, type FaultTree } from '../shared/fault-tree';

const validate = new Ajv2020({ allErrors: true }).compile(schema);

export interface LoadResult {
  trees: FaultTree[];
  /** Datei → Fehler; ungültige Bäume werden nicht angeboten */
  rejected: Record<string, string[]>;
}

/** Lädt alle Fehlerbäume (`*.json`) eines Ordners und prüft Schema und Aufbau. */
export function loadTrees(dir: string): LoadResult {
  const trees: FaultTree[] = [];
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
    if (!validate(data)) {
      rejected[file] = (validate.errors ?? []).map(
        (e) => `${e.instancePath || '/'} ${e.message ?? ''}`,
      );
      continue;
    }
    const tree = data as unknown as FaultTree;
    const errors = checkTree(tree);
    if (errors.length > 0) rejected[file] = errors;
    else trees.push(tree);
  }
  return { trees, rejected };
}
