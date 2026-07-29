import { Edge, Node } from '@xyflow/react';

import type { AnimNode } from '../config/create-node';

export type GraphNodeData = {
  definition: AnimNode;
  inputValues: Record<string, any>;
  state: Record<string, any>;
};

export type GraphNode = Node<GraphNodeData>;

export type NodeNetwork = {
  name: string;
  isEnabled: boolean;
  isMinimized?: boolean;
  nodes: GraphNode[];
  edges: Edge[];
};
