/** Fehlerbaum der geführten Fehlersuche (ADR-007, schemas/fault-tree.schema.json). */
export type Text = { de: string } & Record<string, string>;

export interface QuestionNode {
  type: 'question';
  text: Text;
  hint?: Text;
  media?: string;
  yes: string;
  no: string;
}

export interface ResultNode {
  type: 'result';
  text: Text;
  detail: Text;
  part?: string;
}

export type TreeNode = QuestionNode | ResultNode;

export interface FaultTree {
  id: string;
  version: number;
  title: Text;
  machineType: string;
  alarmIds: string[];
  start: string;
  nodes: Record<string, TreeNode>;
}

export type TreeSummary = Pick<FaultTree, 'id' | 'version' | 'title' | 'machineType' | 'alarmIds'>;

export interface PathStep {
  node: string;
  answer: 'yes' | 'no';
}

/**
 * Prüft den Aufbau über das Schema hinaus: Start und alle Ja/Nein-Ziele existieren, keine Schleifen,
 * jeder Knoten ist erreichbar und jeder Weg endet in einer Lösung.
 */
export function checkTree(tree: FaultTree): string[] {
  const errors: string[] = [];
  if (!tree.nodes[tree.start]) errors.push(`start „${tree.start}“ fehlt`);
  for (const [id, node] of Object.entries(tree.nodes)) {
    if (node.type !== 'question') continue;
    for (const target of [node.yes, node.no]) {
      if (!tree.nodes[target]) errors.push(`${id}: Ziel „${target}“ fehlt`);
    }
  }
  if (errors.length > 0) return errors;

  const reached = new Set<string>();
  const visit = (id: string, trail: readonly string[]) => {
    if (trail.includes(id)) {
      errors.push(`Schleife über ${[...trail, id].join(' → ')}`);
      return;
    }
    reached.add(id);
    const node = tree.nodes[id];
    if (node?.type === 'question') {
      visit(node.yes, [...trail, id]);
      visit(node.no, [...trail, id]);
    }
  };
  visit(tree.start, []);
  for (const id of Object.keys(tree.nodes)) {
    if (!reached.has(id)) errors.push(`${id} ist nicht erreichbar`);
  }
  return errors;
}

/** Text in der Sprache der Oberfläche, sonst Deutsch. */
export const localized = (text: Text | undefined, language: string): string =>
  text ? (text[language] ?? text.de) : '';
