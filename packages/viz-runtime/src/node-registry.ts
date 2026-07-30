import type { VizNodeImplementation } from '@viz-engine/contracts';

export interface VizNodeRegistry {
  get(type: string): VizNodeImplementation | undefined;
  list(): VizNodeImplementation[];
}

export const createVizNodeRegistry = (
  nodes: VizNodeImplementation[],
): VizNodeRegistry => {
  const nodeMap = new Map(nodes.map((node) => [node.type, node]));

  return {
    get: (type) => nodeMap.get(type),
    list: () => nodes,
  };
};
