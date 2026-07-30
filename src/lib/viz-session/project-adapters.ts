import type { Comp } from '@/components/config/create-component';
import {
  NodeHandleType,
  isValidNodeHandleType,
  safeVTypeToNodeHandleType,
} from '@/components/config/node-types';
import {
  NodeDefinitionMap,
  createOutputNode,
  type AnimNode,
} from '@/components/node-network/animation-nodes';
import type {
  GraphNode,
  NodeNetwork,
} from '@/components/node-network/graph-types';
import {
  layerSettingsSchema,
  type BlendingMode,
  type LayerSettings,
} from '@/components/editor/layer-settings';
import { assignDeterministicIdsToConfig } from '@/lib/comp-utils/config-utils';
import {
  getPresetById,
  instantiatePreset,
} from '@/components/node-network/presets';
import type { LayerData } from '@/lib/editor-layer-types';
import type { EditorLayerUiState } from '@/lib/stores/editor-store';
import {
  type VizBlendMode,
  type VizGraphNodeInputBinding,
  type VizNodeGraphDocument,
  type VizProjectDocument,
  type VizLayer,
} from '@viz-engine/contracts';
import type { Edge } from '@xyflow/react';
import { studioNodeRegistry } from '@/lib/viz-capabilities';

const DEFAULT_OUTPUT_HANDLE = '__viz_default_output__';
const DEFAULT_INPUT_HANDLE = '__viz_default_input__';
const GRAPH_OUTPUT_NODE_PREFIX = '__viz_graph_output__:';
const GRAPH_OUTPUT_EDGE_PREFIX = '__viz_graph_output_edge__:';
const EDITOR_NODE_METADATA_KEY = 'vizEditor';
const EDITOR_GRAPH_METADATA_KEY = 'vizEditor';

interface EditorNodeMetadata {
  position?: { x: number; y: number };
  nodeType?: string;
  outputType?: string;
}

interface EditorGraphMetadata {
  isMinimized?: boolean;
  outputPositions?: Record<string, { x: number; y: number }>;
}

const clone = <T>(value: T): T => structuredClone(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readEditorNodeMetadata = (metadata: Record<string, unknown> | undefined) => {
  const value = metadata?.[EDITOR_NODE_METADATA_KEY];
  return isRecord(value) ? (value as EditorNodeMetadata) : {};
};

const readEditorGraphMetadata = (
  metadata: Record<string, unknown> | undefined,
) => {
  const value = metadata?.[EDITOR_GRAPH_METADATA_KEY];
  return isRecord(value) ? (value as EditorGraphMetadata) : {};
};

export const isEditorAuthoredGraph = (
  graph: VizNodeGraphDocument,
): boolean => isRecord(graph.metadata?.[EDITOR_GRAPH_METADATA_KEY]);

const toNodeHandleType = (value: unknown): NodeHandleType =>
  typeof value === 'string' && isValidNodeHandleType(value)
    ? (value as NodeHandleType)
    : 'number';

export { createEmptyVizProjectDocument } from './project-document';

export const toEditorComponentId = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const findEditorCompForLayer = (
  layer: Pick<VizLayer, 'componentId' | 'name'>,
  comps: Comp[],
) =>
  comps.find(
    (comp) =>
      comp.componentId === layer.componentId ||
      comp.name === layer.name ||
      toEditorComponentId(comp.name) === layer.componentId,
  ) ?? null;

export const resolveEditorOptionByPath = (
  comp: Comp,
  layerId: string,
  path: string,
) => {
  const config = assignDeterministicIdsToConfig(
    layerId,
    comp.config.clone(),
  );
  const segments = path.split('.');
  let current: Record<string, any> = config.options;

  for (let index = 0; index < segments.length; index += 1) {
    const option = current[segments[index]!];

    if (!option) {
      return null;
    }

    if (
      'options' in option &&
      option.options &&
      typeof option.options === 'object'
    ) {
      current = option.options;
      continue;
    }

    if (
      'type' in option &&
      'getDefaultValue' in option &&
      index === segments.length - 1
    ) {
      return option;
    }

    return null;
  }

  return null;
};

export const createVizLayerFromComp = (
  comp: Comp,
  layerId: string,
): VizLayer => ({
  id: layerId,
  name: comp.name,
  componentId: comp.componentId ?? toEditorComponentId(comp.name),
  enabled: true,
  opacity: 1,
  blendMode: 'normal',
  surface: {
    backgroundColor: 'rgba(10, 10, 10, 1)',
    freezeWhenPaused: true,
  },
  settings: clone(comp.defaultValues),
});

export const getEditorLayerValues = (layer: VizLayer) =>
  clone(layer.settings ?? {});

export const getEditorLayerSettings = (layer: VizLayer): LayerSettings => {
  const defaults = layerSettingsSchema.parse({});

  return {
    ...defaults,
    visible: layer.enabled,
    opacity: layer.opacity,
    blendingMode: layer.blendMode as BlendingMode,
    background:
      typeof layer.surface?.backgroundColor === 'string'
        ? layer.surface.backgroundColor
        : defaults.background,
    freeze: layer.surface?.freezeWhenPaused ?? defaults.freeze,
  };
};

export const applyEditorLayerSettings = (
  layer: VizLayer,
  settings: LayerSettings,
): VizLayer => ({
  ...layer,
  enabled: settings.visible,
  opacity: settings.opacity,
  blendMode: settings.blendingMode as VizBlendMode,
  surface: {
    ...layer.surface,
    backgroundColor: settings.background,
    freezeWhenPaused: settings.freeze,
  },
});

export const createProjectedLayer = ({
  layer,
  comp,
  uiState,
}: {
  layer: VizLayer;
  comp: Comp;
  uiState: EditorLayerUiState | undefined;
}): LayerData => {
  const config = assignDeterministicIdsToConfig(layer.id, comp.config.clone());
  config.setValues(getEditorLayerValues(layer));

  return {
    id: layer.id,
    comp,
    config,
    isExpanded: uiState?.isExpanded ?? false,
    isDebugEnabled: uiState?.isDebugEnabled ?? false,
    layerSettings: getEditorLayerSettings(layer),
  };
};

const getDefinitionType = (node: GraphNode) =>
  node.data.portableNodeType ?? node.data.definition.label;

const getOutputType = (node: GraphNode) =>
  node.data.definition.label === 'Output'
    ? node.data.definition.inputs[0]?.type
    : undefined;

const createNodeBindings = (
  node: GraphNode,
  edges: Edge[],
): Record<string, VizGraphNodeInputBinding> | undefined => {
  const bindings: Record<string, VizGraphNodeInputBinding> = Object.fromEntries(
    Object.entries(node.data.inputValues ?? {}).map(([inputKey, value]) => [
      inputKey,
      {
        kind: 'literal',
        value: clone(value),
      } satisfies VizGraphNodeInputBinding,
    ]),
  );

  edges
    .filter((edge) => edge.target === node.id)
    .forEach((edge) => {
      const inputKey = edge.targetHandle ?? DEFAULT_INPUT_HANDLE;
      bindings[inputKey] = {
        kind: 'node-output',
        nodeId: edge.source,
        output: edge.sourceHandle ?? DEFAULT_OUTPUT_HANDLE,
        edgeId: edge.id,
      };
    });

  return Object.keys(bindings).length > 0 ? bindings : undefined;
};

export const nodeNetworkToVizGraph = (
  graphId: string,
  network: NodeNetwork,
  previousGraph?: VizNodeGraphDocument,
): VizNodeGraphDocument => {
  const graphOutputNodes = network.nodes.filter(
    (node) => node.data.graphOutputKey,
  );
  const legacyOutputNode = network.nodes.find(
    (node) =>
      node.data.definition.label === 'Output' &&
      !node.data.graphOutputKey,
  );
  const canonicalOutputs = graphOutputNodes.flatMap((node) => {
    const edge = network.edges.find(
      (candidate) => candidate.target === node.id,
    );

    return edge && node.data.graphOutputKey
      ? [
          {
            key: node.data.graphOutputKey,
            nodeId: edge.source,
            output: edge.sourceHandle ?? DEFAULT_OUTPUT_HANDLE,
          },
        ]
      : [];
  });
  const previousEditorMetadata = readEditorGraphMetadata(
    previousGraph?.metadata,
  );
  const outputPositions = Object.fromEntries(
    graphOutputNodes.flatMap((node) =>
      node.data.graphOutputKey
        ? [[node.data.graphOutputKey, clone(node.position)]]
        : [],
    ),
  );

  return {
    id: graphId,
    name: network.name || graphId,
    enabled: network.isEnabled,
    ...(previousGraph?.inputs === undefined
      ? {}
      : { inputs: clone(previousGraph.inputs) }),
    nodes: network.nodes
      .filter((node) => !node.data.graphOutputKey)
      .map((node) => {
      const outputType = getOutputType(node);
      const inputs = createNodeBindings(node, network.edges);
      const editorMetadata: EditorNodeMetadata = {
        position: clone(node.position),
        nodeType: node.type,
        ...(outputType === undefined ? {} : { outputType }),
      };

      return {
        id: node.id,
        type: getDefinitionType(node),
        ...(inputs === undefined ? {} : { inputs }),
        metadata: {
          [EDITOR_NODE_METADATA_KEY]: editorMetadata,
        },
      };
    }),
    outputs:
      canonicalOutputs.length > 0
        ? canonicalOutputs
        : legacyOutputNode
          ? [
          {
            key: 'value',
            nodeId: legacyOutputNode.id,
            output: 'value',
          },
            ]
          : clone(previousGraph?.outputs ?? []),
    metadata: {
      ...(previousGraph?.metadata ?? {}),
      [EDITOR_GRAPH_METADATA_KEY]: {
        isMinimized: network.isMinimized ?? false,
        ...((Object.keys(outputPositions).length > 0
          ? outputPositions
          : previousEditorMetadata.outputPositions) === undefined
          ? {}
          : {
              outputPositions:
                Object.keys(outputPositions).length > 0
                  ? outputPositions
                  : previousEditorMetadata.outputPositions,
            }),
      } satisfies EditorGraphMetadata,
    },
  };
};

const resolveNodeDefinition = (node: VizNodeGraphDocument['nodes'][number]) => {
  if (node.type === 'Output') {
    return createOutputNode(
      toNodeHandleType(readEditorNodeMetadata(node.metadata).outputType),
    );
  }

  const definition = NodeDefinitionMap.get(node.type);
  if (definition) {
    return definition;
  }

  const portableDefinition = studioNodeRegistry.get(node.type);
  if (portableDefinition?.authoring) {
    const labels = new Map([
      ...(portableDefinition.inputs ?? []).map(
        (input) => [input.key, input.label] as const,
      ),
      ...portableDefinition.outputs.map(
        (output) => [output.key, output.label] as const,
      ),
    ]);

    return {
      label: portableDefinition.name,
      description: portableDefinition.description,
      inputs: portableDefinition.authoring.inputs.map((input) => ({
        id: input.key,
        label: labels.get(input.key) ?? input.key,
        type: toNodeHandleType(input.type),
        ...(input.defaultValue === undefined
          ? {}
          : { defaultValue: clone(input.defaultValue) }),
      })),
      outputs: portableDefinition.authoring.outputs.map((output) => ({
        id: output.key,
        label: labels.get(output.key) ?? output.key,
        type: toNodeHandleType(output.type),
        ...(output.defaultValue === undefined
          ? {}
          : { defaultValue: clone(output.defaultValue) }),
      })),
      // Evaluation remains owned by the canonical runtime registry. This
      // projection only supplies editor affordances and port metadata.
      computeSignal: () => ({}),
    } satisfies AnimNode;
  }

  return (
    {
      label: node.type,
      description: `Unknown node type "${node.type}".`,
      inputs: [],
      outputs: [],
      computeSignal: () => ({}),
    } satisfies AnimNode
  );
};

const createProjectedGraphNode = (
  node: VizNodeGraphDocument['nodes'][number],
  previousNode: GraphNode | undefined,
  fallbackPosition: { x: number; y: number },
): GraphNode => {
  const editorMetadata = readEditorNodeMetadata(node.metadata);
  const inputValues = Object.fromEntries(
    Object.entries(node.inputs ?? {})
      .filter(([, binding]) => binding.kind === 'literal')
      .map(([inputKey, binding]) => [
        inputKey,
        binding.kind === 'literal' ? clone(binding.value) : undefined,
      ]),
  );

  return {
    id: node.id,
    type: editorMetadata.nodeType ?? 'NodeRenderer',
    position: editorMetadata.position ?? fallbackPosition,
    data: {
      definition: resolveNodeDefinition(node),
      inputValues,
      state: previousNode?.data.state ?? {},
      portableNodeType: node.type,
    },
  };
};

const createProjectedGraphEdges = (
  graph: VizNodeGraphDocument,
): Edge[] =>
  graph.nodes.flatMap((node) =>
    Object.entries(node.inputs ?? {}).flatMap(([inputKey, binding]) => {
      if (binding.kind !== 'node-output') {
        return [];
      }

      return [
        {
          id:
            binding.edgeId ??
            `${binding.nodeId}-${binding.output}-${node.id}-${inputKey}`,
          source: binding.nodeId,
          target: node.id,
          sourceHandle:
            binding.output === DEFAULT_OUTPUT_HANDLE
              ? undefined
              : binding.output,
          targetHandle:
            inputKey === DEFAULT_INPUT_HANDLE ? undefined : inputKey,
        },
      ];
    }),
  );

const createFallbackNodePositions = (
  graph: VizNodeGraphDocument,
): Map<string, { x: number; y: number }> => {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const depthCache = new Map<string, number>();
  const resolveDepth = (
    nodeId: string,
    ancestry = new Set<string>(),
  ): number => {
    const cached = depthCache.get(nodeId);
    if (cached !== undefined) {
      return cached;
    }
    if (ancestry.has(nodeId)) {
      return 0;
    }

    const node = nodesById.get(nodeId);
    if (!node) {
      return 0;
    }

    const nextAncestry = new Set(ancestry).add(nodeId);
    const dependencies = Object.values(node.inputs ?? {})
      .filter(
        (
          binding,
        ): binding is Extract<
          VizGraphNodeInputBinding,
          { kind: 'node-output' }
        > => binding.kind === 'node-output',
      )
      .map((binding) => resolveDepth(binding.nodeId, nextAncestry));
    const depth =
      dependencies.length === 0 ? 0 : Math.max(...dependencies) + 1;
    depthCache.set(nodeId, depth);
    return depth;
  };

  const nodesByDepth = new Map<number, string[]>();
  for (const node of graph.nodes) {
    const depth = resolveDepth(node.id);
    nodesByDepth.set(depth, [...(nodesByDepth.get(depth) ?? []), node.id]);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [depth, nodeIds] of nodesByDepth) {
    const totalHeight = Math.max(0, nodeIds.length - 1) * 180;
    nodeIds.forEach((nodeId, index) => {
      positions.set(nodeId, {
        x: depth * 260,
        y: index * 180 - totalHeight / 2,
      });
    });
  }

  return positions;
};

const resolveGraphOutputType = (
  nodes: GraphNode[],
  nodeId: string,
  outputKey: string,
): NodeHandleType => {
  const source = nodes.find((node) => node.id === nodeId);
  return (
    source?.data.definition.outputs.find(
      (output) => output.id === outputKey,
    )?.type ?? 'number'
  ) as NodeHandleType;
};

const createProjectedGraphOutputNodes = (
  graph: VizNodeGraphDocument,
  projectedNodes: GraphNode[],
): { nodes: GraphNode[]; edges: Edge[] } => {
  const editorMetadata = readEditorGraphMetadata(graph.metadata);
  const runtimeNodesById = new Map(
    graph.nodes.map((node) => [node.id, node]),
  );
  const canonicalOutputs = graph.outputs.filter(
    (output) => runtimeNodesById.get(output.nodeId)?.type !== 'Output',
  );
  const sourcePositions = new Map(
    projectedNodes.map((node) => [node.id, node.position]),
  );
  const nodes = canonicalOutputs.map((output, index): GraphNode => {
    const sourcePosition = sourcePositions.get(output.nodeId) ?? {
      x: 0,
      y: index * 180,
    };

    return {
      id: `${GRAPH_OUTPUT_NODE_PREFIX}${output.key}`,
      type: 'NodeRenderer',
      position:
        editorMetadata.outputPositions?.[output.key] ?? {
          x: sourcePosition.x + 260,
          y: sourcePosition.y,
        },
      data: {
        definition: createOutputNode(
          resolveGraphOutputType(
            projectedNodes,
            output.nodeId,
            output.output,
          ),
        ),
        inputValues: {},
        state: {},
        graphOutputKey: output.key,
      },
    };
  });
  const edges = canonicalOutputs.map((output) => ({
    id: `${GRAPH_OUTPUT_EDGE_PREFIX}${output.key}`,
    source: output.nodeId,
    target: `${GRAPH_OUTPUT_NODE_PREFIX}${output.key}`,
    sourceHandle:
      output.output === DEFAULT_OUTPUT_HANDLE
        ? undefined
        : output.output,
    targetHandle: 'output',
  }));

  return { nodes, edges };
};

export const vizGraphToNodeNetwork = (
  graph: VizNodeGraphDocument,
  previousNetwork?: NodeNetwork,
): NodeNetwork => {
  const fallbackPositions = createFallbackNodePositions(graph);
  const projectedNodes = graph.nodes.map((node) =>
    createProjectedGraphNode(
      node,
      previousNetwork?.nodes.find((candidate) => candidate.id === node.id),
      fallbackPositions.get(node.id) ?? { x: 0, y: 0 },
    ),
  );
  const projectedOutputs = createProjectedGraphOutputNodes(
    graph,
    projectedNodes,
  );

  return {
    name: graph.name,
    isEnabled: graph.enabled ?? true,
    isMinimized:
      readEditorGraphMetadata(graph.metadata).isMinimized ?? false,
    nodes: [...projectedNodes, ...projectedOutputs.nodes],
    edges: [
      ...createProjectedGraphEdges(graph),
      ...projectedOutputs.edges,
    ],
  };
};

export const projectGraphsToNodeNetworks = (
  project: VizProjectDocument,
  previousNetworks: Record<string, NodeNetwork> = {},
): Record<string, NodeNetwork> =>
  Object.fromEntries(
    (project.graphs ?? [])
      .map((graph) => [
        graph.id,
        vizGraphToNodeNetwork(graph, previousNetworks[graph.id]),
      ]),
  );

export const attachGraphToLayerInput = (
  project: VizProjectDocument,
  graphId: string,
): VizProjectDocument => {
  const separatorIndex = graphId.indexOf(':');
  if (separatorIndex === -1) {
    return project;
  }

  const layerId = graphId.slice(0, separatorIndex);
  const inputKey = graphId.slice(separatorIndex + 1);

  return {
    ...project,
    layers: project.layers.map((layer) =>
      layer.id === layerId
        ? {
            ...layer,
            inputs: {
              ...(layer.inputs ?? {}),
              [inputKey]: {
                kind: 'graph-output' as const,
                graphId,
                output: 'value',
              },
            },
          }
        : layer,
    ),
  };
};

export const detachGraphFromLayerInput = (
  project: VizProjectDocument,
  graphId: string,
): VizProjectDocument => ({
  ...project,
  layers: project.layers.map((layer) => ({
    ...layer,
    inputs: Object.fromEntries(
      Object.entries(layer.inputs ?? {}).filter(
        ([, source]) =>
          source.kind !== 'graph-output' || source.graphId !== graphId,
      ),
    ),
  })),
});

export const applyEditorDefaultNetworks = ({
  project,
  layerId,
  comp,
}: {
  project: VizProjectDocument;
  layerId: string;
  comp: Comp;
}): VizProjectDocument => {
  let nextProject = project;

  for (const [path, presetOrId] of Object.entries(
    comp.defaultNetworks ?? {},
  )) {
    const option = resolveEditorOptionByPath(comp, layerId, path);
    const preset =
      typeof presetOrId === 'string'
        ? getPresetById(presetOrId)
        : presetOrId;

    if (!option || !preset) {
      continue;
    }

    const graphId = option.id;
    const outputType = safeVTypeToNodeHandleType(option.type);
    const { nodes, edges } = instantiatePreset(
      preset,
      graphId,
      outputType,
    );
    const graph = nodeNetworkToVizGraph(graphId, {
      name: graphId,
      isEnabled: true,
      isMinimized: false,
      nodes,
      edges,
    });

    nextProject = {
      ...nextProject,
      graphs: [
        ...(nextProject.graphs ?? []).filter(
          (candidate) => candidate.id !== graphId,
        ),
        graph,
      ],
    };
    nextProject = attachGraphToLayerInput(nextProject, graphId);
  }

  return nextProject;
};
