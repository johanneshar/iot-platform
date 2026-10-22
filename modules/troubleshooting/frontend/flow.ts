import type { FaultTree, PathStep, TreeNode } from '../shared/fault-tree';

/** Stand einer Fehlersuche: aktueller Knoten und bisheriger Weg. */
export interface FlowState {
  treeId: string;
  node: string;
  path: PathStep[];
}

export const startFlow = (tree: FaultTree): FlowState => ({
  treeId: tree.id,
  node: tree.start,
  path: [],
});

export function answer(tree: FaultTree, state: FlowState, yes: boolean): FlowState {
  const node = tree.nodes[state.node];
  if (node?.type !== 'question') return state;
  return {
    ...state,
    node: yes ? node.yes : node.no,
    path: [...state.path, { node: state.node, answer: yes ? 'yes' : 'no' }],
  };
}

/** Einen Schritt zurück. */
export function back(tree: FaultTree, state: FlowState): FlowState {
  const last = state.path.at(-1);
  return last ? { ...state, node: last.node, path: state.path.slice(0, -1) } : startFlow(tree);
}

export const currentNode = (tree: FaultTree, state: FlowState): TreeNode | undefined =>
  tree.nodes[state.node];
