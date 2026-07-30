import { Edge, Node } from '@xyflow/react';

import type { AnimNode } from './animation-nodes';

export type GraphNodeData = {
  definition: AnimNode;
  inputValues: Record<string, any>;
  state: Record<string, any>;
  /**
   * Canonical runtime type for nodes whose friendly editor label differs from
   * the portable graph node type.
   */
  portableNodeType?: string;
  /**
   * Present only on an editor projection of a canonical graph output.
   * Output endpoints are UI nodes, not runtime graph nodes.
   */
  graphOutputKey?: string;
};

export type GraphNode = Node<GraphNodeData>;

export type NodeNetwork = {
  name: string;
  isEnabled: boolean;
  isMinimized?: boolean;
  nodes: GraphNode[];
  edges: Edge[];
};

export const isProtectedGraphNode = (node: GraphNode): boolean =>
  node.data.graphOutputKey !== undefined ||
  node.data.definition.label === 'Input' ||
  node.data.definition.label === 'Output';
