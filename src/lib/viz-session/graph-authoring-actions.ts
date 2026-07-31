import type { NodeHandleType } from '@/components/config/node-types';
import { InputNode } from '@/components/node-network/animation-nodes';
import type {
  GraphNode,
  NodeNetwork,
} from '@/components/node-network/graph-types';
import {
  getPresetsForType,
  instantiateCanonicalPreset,
} from '@/components/node-network/presets';
import type {
  VizGraphNodeInputBinding,
  VizNodeGraphDocument,
  VizProjectAction,
  VizProjectDocument,
} from '@viz-engine/contracts';
import type { VizSessionHost } from '@viz-engine/editor-control';
import type { Edge } from '@xyflow/react';

import type { VizGraphFragment } from './graph-fragments';
import {
  resolveParameterGraphBinding,
  splitParameterId,
} from './runtime-graph-inspection';

const DEFAULT_INPUT_HANDLE = '__viz_default_input__';
const DEFAULT_OUTPUT_HANDLE = '__viz_default_output__';

const clone = <T>(value: T): T => structuredClone(value);

const equal = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const toCanonicalNodeType = (node: GraphNode): string =>
  node.data.portableNodeType ?? node.data.definition.label;

const toLiteralBindings = (
  node: GraphNode,
): Record<string, VizGraphNodeInputBinding> =>
  Object.fromEntries(
    Object.entries(node.data.inputValues ?? {}).map(([inputKey, value]) => [
      inputKey,
      { kind: 'literal' as const, value: clone(value) },
    ]),
  );

const isOutputEndpoint = (node: GraphNode): boolean =>
  node.data.graphOutputKey !== undefined;

const createNodeAddAction = (
  graphId: string,
  node: GraphNode,
): VizProjectAction => ({
  type: 'graph.node.add',
  payload: {
    graphId,
    nodeId: node.id,
    nodeType: toCanonicalNodeType(node),
    position: clone(node.position),
    initialInputs: toLiteralBindings(node),
  },
});

const createLayerBindingAction = (
  project: VizProjectDocument,
  graphId: string,
): VizProjectAction | null => {
  const parameter = splitParameterId(graphId);
  if (
    !parameter ||
    !project.layers.some((layer) => layer.id === parameter.layerId)
  ) {
    return null;
  }

  return {
    type: 'layer.input.set',
    payload: {
      layerId: parameter.layerId,
      inputKey: parameter.inputKey,
      valueSource: {
        kind: 'graph-output',
        graphId,
        output: 'value',
      },
    },
  };
};

const createGraphDocumentActions = (
  project: VizProjectDocument,
  graph: VizNodeGraphDocument,
): VizProjectAction[] => {
  const previous = project.graphs?.find(
    (candidate) => candidate.id === graph.id,
  );
  const layerBinding = createLayerBindingAction(project, graph.id);
  return [
    ...(previous
      ? [
          ...previous.nodes.map((node): VizProjectAction => ({
            type: 'graph.node.remove',
            payload: { graphId: graph.id, nodeId: node.id },
          })),
          ...previous.outputs.map((output): VizProjectAction => ({
            type: 'graph.output.remove',
            payload: { graphId: graph.id, outputKey: output.key },
          })),
        ]
      : [
          {
            type: 'graph.create' as const,
            payload: { graphId: graph.id, name: graph.name },
          },
        ]),
    ...graph.nodes.map((node): VizProjectAction => ({
      type: 'graph.node.add',
      payload: {
        graphId: graph.id,
        nodeId: node.id,
        nodeType: node.type,
        ...(node.position ? { position: clone(node.position) } : {}),
        ...(node.inputs ? { initialInputs: clone(node.inputs) } : {}),
        ...(node.metadata ? { metadata: clone(node.metadata) } : {}),
      },
    })),
    ...graph.outputs.map((output): VizProjectAction => ({
      type: 'graph.output.set',
      payload: { graphId: graph.id, output: clone(output) },
    })),
    {
      type: 'graph.enabled.set',
      payload: { graphId: graph.id, enabled: graph.enabled ?? true },
    },
    ...(layerBinding ? [layerBinding] : []),
  ];
};

export const createStudioGraphAuthoringActions = ({
  host,
  getProject,
  getNetworks,
  applyActions,
  syncProject,
  syncOpenNetwork,
}: {
  host: VizSessionHost;
  getProject: () => VizProjectDocument;
  getNetworks: () => Record<string, NodeNetwork>;
  applyActions: (actions: VizProjectAction[]) => void;
  syncProject: () => void;
  syncOpenNetwork: () => void;
}) => {
  const commit = (actions: VizProjectAction[]) => {
    if (actions.length > 0) {
      applyActions(actions);
    }
    syncOpenNetwork();
  };

  const getGraph = (graphId: string) =>
    getProject().graphs?.find((graph) => graph.id === graphId);

  const applyPresetDefinition = (
    graphId: string,
    preset: Parameters<typeof instantiateCanonicalPreset>[0],
    outputType: NodeHandleType,
  ) => {
    commit(
      createGraphDocumentActions(
        getProject(),
        instantiateCanonicalPreset(preset, graphId, outputType),
      ),
    );
  };

  const setNodes = (graphId: string, nodes: GraphNode[]) => {
    const graph = getGraph(graphId);
    if (!graph) {
      return;
    }

    const projectedRuntimeNodes = nodes.filter(
      (node) => !isOutputEndpoint(node),
    );
    const projectedById = new Map(
      projectedRuntimeNodes.map((node) => [node.id, node]),
    );
    const canonicalById = new Map(graph.nodes.map((node) => [node.id, node]));
    const actions: VizProjectAction[] = [];

    for (const node of graph.nodes) {
      if (!projectedById.has(node.id)) {
        actions.push({
          type: 'graph.node.remove',
          payload: { graphId, nodeId: node.id },
        });
      }
    }

    for (const node of projectedRuntimeNodes) {
      const canonical = canonicalById.get(node.id);
      if (!canonical) {
        actions.push(createNodeAddAction(graphId, node));
        continue;
      }

      if (!equal(canonical.position, node.position)) {
        actions.push({
          type: 'graph.node.position.set',
          payload: { graphId, nodeId: node.id, position: clone(node.position) },
        });
      }

      for (const [inputKey, value] of Object.entries(node.data.inputValues)) {
        const current = canonical.inputs?.[inputKey];
        if (current?.kind !== 'literal' || !equal(current.value, value)) {
          actions.push({
            type: 'graph.node.input.set',
            payload: {
              graphId,
              nodeId: node.id,
              inputKey,
              binding: { kind: 'literal', value: clone(value) },
            },
          });
        }
      }
    }

    for (const node of nodes.filter(isOutputEndpoint)) {
      const output = graph.outputs.find(
        (candidate) => candidate.key === node.data.graphOutputKey,
      );
      if (output && !equal(output.position, node.position)) {
        actions.push({
          type: 'graph.output.position.set',
          payload: {
            graphId,
            outputKey: output.key,
            position: clone(node.position),
          },
        });
      }
    }

    commit(actions);
  };

  const setEdges = (graphId: string, edges: Edge[]) => {
    const graph = getGraph(graphId);
    const network = getNetworks()[graphId];
    if (!graph || !network) {
      return;
    }

    const nodesById = new Map(network.nodes.map((node) => [node.id, node]));
    const desiredNodeBindings = new Map<
      string,
      Map<string, VizGraphNodeInputBinding>
    >();

    for (const edge of edges) {
      const target = nodesById.get(edge.target);
      if (!target || isOutputEndpoint(target)) {
        continue;
      }
      const inputs =
        desiredNodeBindings.get(edge.target) ??
        new Map<string, VizGraphNodeInputBinding>();
      inputs.set(edge.targetHandle ?? DEFAULT_INPUT_HANDLE, {
        kind: 'node-output',
        nodeId: edge.source,
        output: edge.sourceHandle ?? DEFAULT_OUTPUT_HANDLE,
        edgeId: edge.id,
      });
      desiredNodeBindings.set(edge.target, inputs);
    }

    const actions: VizProjectAction[] = [];
    for (const node of graph.nodes) {
      const desired = desiredNodeBindings.get(node.id) ?? new Map();
      const connectedInputKeys = new Set([
        ...Object.entries(node.inputs ?? {})
          .filter(([, binding]) => binding.kind === 'node-output')
          .map(([inputKey]) => inputKey),
        ...desired.keys(),
      ]);
      for (const inputKey of connectedInputKeys) {
        const current = node.inputs?.[inputKey];
        const binding = desired.get(inputKey) ?? null;
        if (!equal(current?.kind === 'node-output' ? current : null, binding)) {
          actions.push({
            type: 'graph.node.input.set',
            payload: { graphId, nodeId: node.id, inputKey, binding },
          });
        }
      }
    }

    for (const output of graph.outputs) {
      const endpoint = network.nodes.find(
        (node) => node.data.graphOutputKey === output.key,
      );
      const edge = endpoint
        ? edges.find((candidate) => candidate.target === endpoint.id)
        : undefined;
      const nextOutput = {
        key: output.key,
        ...(edge
          ? {
              nodeId: edge.source,
              output: edge.sourceHandle ?? DEFAULT_OUTPUT_HANDLE,
            }
          : {}),
        ...(output.valueType === undefined
          ? {}
          : { valueType: output.valueType }),
        ...(output.position === undefined ? {} : { position: output.position }),
      };
      if (!equal(output, nextOutput)) {
        actions.push({
          type: 'graph.output.set',
          payload: { graphId, output: nextOutput },
        });
      }
    }

    commit(actions);
  };

  const actions = {
    reset() {
      commit(
        (getProject().graphs ?? []).map((graph): VizProjectAction => ({
          type: 'graph.remove',
          payload: { graphId: graph.id },
        })),
      );
    },
    setGraphEnabled(graphId: string, enabled: boolean) {
      if (getGraph(graphId)) {
        commit([
          {
            type: 'graph.enabled.set',
            payload: { graphId, enabled },
          },
        ]);
      }
    },
    setNetworkEnabled(
      parameterId: string,
      enabled: boolean,
      type: NodeHandleType,
    ) {
      const project = getProject();
      const binding = resolveParameterGraphBinding(project, parameterId);
      const graphId = binding?.graphId ?? parameterId;
      const graph = getGraph(graphId);

      if (binding && graphId !== parameterId && !enabled) {
        const parameter = splitParameterId(parameterId);
        if (parameter) {
          commit([
            {
              type: 'layer.input.set',
              payload: {
                layerId: parameter.layerId,
                inputKey: parameter.inputKey,
                valueSource: null,
              },
            },
          ]);
        }
        return;
      }
      if (!graph) {
        if (enabled) {
          actions.createNetworkForParameter(parameterId, type);
        }
        return;
      }
      commit([
        {
          type: 'graph.enabled.set',
          payload: { graphId, enabled },
        },
      ]);
    },
    addNodeToNetwork(graphId: string, node: GraphNode) {
      if (getGraph(graphId) && !isOutputEndpoint(node)) {
        commit([createNodeAddAction(graphId, node)]);
      }
    },
    pasteFragment(
      graphId: string,
      fragment: VizGraphFragment,
      position: { x: number; y: number },
    ) {
      const graph = getGraph(graphId);
      if (!graph || fragment.nodes.length === 0) {
        return [];
      }

      const usedIds = new Set(graph.nodes.map((node) => node.id));
      const nodeIdMap = new Map<string, string>();
      fragment.nodes.forEach((node) => {
        let index = 1;
        let nodeId = `${graphId}-node-copy-${index}`;
        while (usedIds.has(nodeId)) {
          index += 1;
          nodeId = `${graphId}-node-copy-${index}`;
        }
        usedIds.add(nodeId);
        nodeIdMap.set(node.id, nodeId);
      });

      const center = {
        x:
          fragment.nodes.reduce(
            (sum, node) => sum + (node.position?.x ?? 0),
            0,
          ) / fragment.nodes.length,
        y:
          fragment.nodes.reduce(
            (sum, node) => sum + (node.position?.y ?? 0),
            0,
          ) / fragment.nodes.length,
      };
      const offset = {
        x: position.x - center.x,
        y: position.y - center.y,
      };
      const inputNode = graph.nodes.find((node) => node.type === 'Input');
      const graphOutputs = new Map(
        graph.outputs.map((output) => [output.key, output]),
      );
      const fragmentActions: VizProjectAction[] = fragment.nodes.map(
        (node): VizProjectAction => ({
          type: 'graph.node.add',
          payload: {
            graphId,
            nodeId: nodeIdMap.get(node.id),
            nodeType: node.type,
            position: {
              x: (node.position?.x ?? 0) + offset.x,
              y: (node.position?.y ?? 0) + offset.y,
            },
            initialInputs: Object.fromEntries(
              Object.entries(node.inputs ?? {}).map(([inputKey, binding]) => [
                inputKey,
                binding.kind === 'node-output'
                  ? {
                      ...binding,
                      nodeId: nodeIdMap.get(binding.nodeId) ?? binding.nodeId,
                    }
                  : clone(binding),
              ]),
            ),
            ...(node.metadata ? { metadata: clone(node.metadata) } : {}),
          },
        }),
      );

      if (inputNode) {
        fragmentActions.push(
          ...fragment.inputConnections.flatMap(
            (connection): VizProjectAction[] => {
              const targetNodeId = nodeIdMap.get(connection.targetNodeId);
              return targetNodeId
                ? [
                    {
                      type: 'graph.node.input.set',
                      payload: {
                        graphId,
                        nodeId: targetNodeId,
                        inputKey: connection.inputKey,
                        binding: {
                          kind: 'node-output',
                          nodeId: inputNode.id,
                          output: connection.sourceOutput,
                        },
                      },
                    },
                  ]
                : [];
            },
          ),
        );
      }

      fragmentActions.push(
        ...fragment.outputConnections.flatMap(
          (connection): VizProjectAction[] => {
            const output = graphOutputs.get(connection.outputKey);
            const sourceNodeId = nodeIdMap.get(connection.sourceNodeId);
            return output && sourceNodeId
              ? [
                  {
                    type: 'graph.output.set',
                    payload: {
                      graphId,
                      output: {
                        ...clone(output),
                        nodeId: sourceNodeId,
                        output: connection.sourceOutput,
                      },
                    },
                  },
                ]
              : [];
          },
        ),
      );

      commit(fragmentActions);
      return [...nodeIdMap.values()];
    },
    setNodesInNetwork: setNodes,
    setEdgesInNetwork: setEdges,
    createNetworkForParameter(parameterId: string, outputType: NodeHandleType) {
      const project = getProject();
      const binding = createLayerBindingAction(project, parameterId);
      commit([
        {
          type: 'graph.create',
          payload: { graphId: parameterId, name: parameterId },
        },
        {
          type: 'graph.node.add',
          payload: {
            graphId: parameterId,
            nodeId: `${parameterId}-input-node`,
            nodeType: InputNode.label,
            position: { x: 0, y: 0 },
          },
        },
        {
          type: 'graph.output.set',
          payload: {
            graphId: parameterId,
            output: {
              key: 'value',
              valueType: outputType,
              position: { x: 300, y: 0 },
            },
          },
        },
        {
          type: 'graph.enabled.set',
          payload: { graphId: parameterId, enabled: true },
        },
        ...(binding ? [binding] : []),
      ]);
    },
    removeNetworkForParameter(parameterId: string) {
      if (getGraph(parameterId)) {
        commit([
          {
            type: 'graph.remove',
            payload: { graphId: parameterId },
          },
        ]);
      }
    },
    applyPresetToNetwork(
      parameterId: string,
      presetId: string,
      outputType: NodeHandleType,
    ) {
      const preset = getPresetsForType(outputType).find(
        (candidate) => candidate.id === presetId,
      );
      if (!preset) {
        return;
      }
      applyPresetDefinition(parameterId, preset, outputType);
    },
    applyPresetDefinition,
    updateNodeInputValue(
      graphId: string,
      nodeId: string,
      inputKey: string,
      value: unknown,
    ) {
      if (getGraph(graphId)?.nodes.some((node) => node.id === nodeId)) {
        commit([
          {
            type: 'graph.node.input.set',
            payload: {
              graphId,
              nodeId,
              inputKey,
              binding: { kind: 'literal', value: clone(value) },
            },
          },
        ]);
      }
    },
    beginInputGesture(graphId: string) {
      host.beginLiveGraphGesture(graphId);
    },
    updateLiveInputValue(
      graphId: string,
      nodeId: string,
      inputKey: string,
      value: unknown,
    ) {
      host.updateLiveGraphNodeInput({ graphId, nodeId, inputKey }, value);
    },
    commitInputGesture(graphId: string) {
      const result = host.commitLiveGraphGesture(graphId);
      if (!result) {
        return;
      }
      if (!result.ok) {
        throw new Error(
          result.errors.map((error) => error.message).join('; ') ||
            'Viz live graph commit failed',
        );
      }
      syncProject();
    },
    cancelInputGesture(graphId: string) {
      host.cancelLiveGraphGesture(graphId);
    },
    duplicateNetwork(fromParameterId: string, toParameterId: string) {
      const source = getGraph(fromParameterId);
      if (!source) {
        return;
      }
      const replaceId = (id: string) =>
        id.replace(fromParameterId, toParameterId);
      const nodeIdMap = new Map(
        source.nodes.map((node) => [node.id, replaceId(node.id)]),
      );
      const project = getProject();
      const binding = createLayerBindingAction(project, toParameterId);
      commit([
        {
          type: 'graph.create',
          payload: { graphId: toParameterId, name: toParameterId },
        },
        ...source.nodes.map((node): VizProjectAction => ({
          type: 'graph.node.add',
          payload: {
            graphId: toParameterId,
            nodeId: nodeIdMap.get(node.id),
            nodeType: node.type,
            ...(node.position ? { position: clone(node.position) } : {}),
            initialInputs: Object.fromEntries(
              Object.entries(node.inputs ?? {}).map(([key, input]) => [
                key,
                input.kind === 'node-output'
                  ? {
                      ...input,
                      nodeId: nodeIdMap.get(input.nodeId) ?? input.nodeId,
                    }
                  : clone(input),
              ]),
            ),
            ...(node.metadata ? { metadata: clone(node.metadata) } : {}),
          },
        })),
        ...source.outputs.map((output): VizProjectAction => ({
          type: 'graph.output.set',
          payload: {
            graphId: toParameterId,
            output: {
              ...clone(output),
              ...(output.nodeId
                ? {
                    nodeId: nodeIdMap.get(output.nodeId) ?? output.nodeId,
                  }
                : {}),
            },
          },
        })),
        {
          type: 'graph.enabled.set',
          payload: {
            graphId: toParameterId,
            enabled: source.enabled ?? true,
          },
        },
        ...(binding ? [binding] : []),
      ]);
    },
    clearStaleNetworks(validParameterIds?: Iterable<string>) {
      const validIds = new Set(validParameterIds ?? []);
      const stale = (getProject().graphs ?? []).filter(
        (graph) => graph.id.includes(':') && !validIds.has(graph.id),
      );
      commit(
        stale.map((graph): VizProjectAction => ({
          type: 'graph.remove',
          payload: { graphId: graph.id },
        })),
      );
    },
  };

  return actions;
};

export type StudioGraphAuthoringActions = ReturnType<
  typeof createStudioGraphAuthoringActions
>;
