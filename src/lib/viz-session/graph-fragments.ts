import type {
  VizGraphNodeInputBinding,
  VizNodeGraphDocument,
  VizNodeGraphNode,
} from '@viz-engine/contracts';

export interface VizGraphFragmentInputConnection {
  targetNodeId: string;
  inputKey: string;
  sourceOutput: string;
}

export interface VizGraphFragmentOutputConnection {
  outputKey: string;
  sourceNodeId: string;
  sourceOutput: string;
}

export interface VizGraphFragment {
  nodes: VizNodeGraphNode[];
  inputConnections: VizGraphFragmentInputConnection[];
  outputConnections: VizGraphFragmentOutputConnection[];
}

export const createVizGraphFragment = (
  graph: VizNodeGraphDocument,
  nodeIds: Iterable<string>,
): VizGraphFragment => {
  const selectedIds = new Set(nodeIds);
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const inputConnections: VizGraphFragmentInputConnection[] = [];

  const nodes = graph.nodes
    .filter(
      (node) =>
        selectedIds.has(node.id) &&
        node.type !== 'Input' &&
        node.type !== 'Output',
    )
    .map((node) => {
      const inputs: Record<string, VizGraphNodeInputBinding> = {};
      for (const [inputKey, binding] of Object.entries(node.inputs ?? {})) {
        if (binding.kind !== 'node-output' || selectedIds.has(binding.nodeId)) {
          inputs[inputKey] = structuredClone(binding);
          continue;
        }

        if (nodesById.get(binding.nodeId)?.type === 'Input') {
          inputConnections.push({
            targetNodeId: node.id,
            inputKey,
            sourceOutput: binding.output,
          });
        }
      }

      return {
        ...structuredClone(node),
        ...(Object.keys(inputs).length > 0
          ? { inputs }
          : { inputs: undefined }),
      };
    });
  const copiedIds = new Set(nodes.map((node) => node.id));

  return {
    nodes,
    inputConnections,
    outputConnections: graph.outputs.flatMap((output) =>
      output.nodeId && output.output && copiedIds.has(output.nodeId)
        ? [
            {
              outputKey: output.key,
              sourceNodeId: output.nodeId,
              sourceOutput: output.output,
            },
          ]
        : [],
    ),
  };
};
