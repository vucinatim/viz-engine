import {
  createComponentParameterId,
  findComponentSetting,
  getSettingNodeHandleType,
} from '@/components/config/config';
import type { Comp } from '@/components/config/create-component';
import {
  NodeHandleType,
  isValidNodeHandleType,
} from '@/components/config/node-types';
import {
  layerSettingsSchema,
  type BlendingMode,
  type LayerSettings,
} from '@/components/editor/layer-settings';
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
  getPresetById,
  instantiateCanonicalPreset,
} from '@/components/node-network/presets';
import type { LayerData } from '@/lib/editor-layer-types';
import type { EditorLayerUiState } from '@/lib/stores/editor-store';
import { studioNodeRegistry } from '@/lib/viz-capabilities';
import {
  type VizBlendMode,
  type VizGraphNodeInputBinding,
  type VizLayer,
  type VizNodeGraphDocument,
  type VizProjectDocument,
} from '@viz-engine/contracts';
import type { Edge } from '@xyflow/react';

const DEFAULT_OUTPUT_HANDLE = '__viz_default_output__';
const DEFAULT_INPUT_HANDLE = '__viz_default_input__';
const GRAPH_OUTPUT_NODE_PREFIX = '__viz_graph_output__:';
const GRAPH_OUTPUT_EDGE_PREFIX = '__viz_graph_output_edge__:';
const clone = <T>(value: T): T => structuredClone(value);

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
  const setting = findComponentSetting(comp.authoring.settings, path);
  return setting && setting.kind !== 'group' && setting.kind !== 'action'
    ? {
        id: createComponentParameterId(layerId, path),
        type: getSettingNodeHandleType(setting),
        setting,
      }
    : null;
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

const getEditorLayerValues = (layer: VizLayer) => clone(layer.settings ?? {});

const getEditorLayerSettings = (layer: VizLayer): LayerSettings => {
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
  return {
    id: layer.id,
    comp,
    values: getEditorLayerValues(layer),
    isExpanded: uiState?.isExpanded ?? false,
    isDebugEnabled: uiState?.isDebugEnabled ?? false,
    layerSettings: getEditorLayerSettings(layer),
  };
};

const resolveNodeDefinition = (node: VizNodeGraphDocument['nodes'][number]) => {
  if (node.type === 'Output') {
    return createOutputNode('number');
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

  return {
    label: node.type,
    description: `Unknown node type "${node.type}".`,
    inputs: [],
    outputs: [],
    computeSignal: () => ({}),
  } satisfies AnimNode;
};

const createProjectedGraphNode = (
  node: VizNodeGraphDocument['nodes'][number],
  previousNode: GraphNode | undefined,
  fallbackPosition: { x: number; y: number },
): GraphNode => {
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
    type: 'NodeRenderer',
    position: node.position ?? fallbackPosition,
    data: {
      definition: resolveNodeDefinition(node),
      inputValues,
      state: previousNode?.data.state ?? {},
      portableNodeType: node.type,
    },
  };
};

const createProjectedGraphEdges = (graph: VizNodeGraphDocument): Edge[] =>
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
    const depth = dependencies.length === 0 ? 0 : Math.max(...dependencies) + 1;
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
  return (source?.data.definition.outputs.find(
    (output) => output.id === outputKey,
  )?.type ?? 'number') as NodeHandleType;
};

const createProjectedGraphOutputNodes = (
  graph: VizNodeGraphDocument,
  projectedNodes: GraphNode[],
): { nodes: GraphNode[]; edges: Edge[] } => {
  const canonicalOutputs = graph.outputs;
  const sourcePositions = new Map(
    projectedNodes.map((node) => [node.id, node.position]),
  );
  const nodes = canonicalOutputs.map((output, index): GraphNode => {
    const sourcePosition = (output.nodeId
      ? sourcePositions.get(output.nodeId)
      : undefined) ?? {
      x: 0,
      y: index * 180,
    };

    return {
      id: `${GRAPH_OUTPUT_NODE_PREFIX}${output.key}`,
      type: 'NodeRenderer',
      position: output.position ?? {
        x: sourcePosition.x + 260,
        y: sourcePosition.y,
      },
      data: {
        definition: createOutputNode(
          output.valueType
            ? toNodeHandleType(output.valueType)
            : output.nodeId && output.output
              ? resolveGraphOutputType(
                  projectedNodes,
                  output.nodeId,
                  output.output,
                )
              : 'number',
        ),
        inputValues: {},
        state: {},
        graphOutputKey: output.key,
      },
    };
  });
  const edges = canonicalOutputs.flatMap((output) =>
    output.nodeId && output.output
      ? [
          {
            id: `${GRAPH_OUTPUT_EDGE_PREFIX}${output.key}`,
            source: output.nodeId,
            target: `${GRAPH_OUTPUT_NODE_PREFIX}${output.key}`,
            sourceHandle:
              output.output === DEFAULT_OUTPUT_HANDLE
                ? undefined
                : output.output,
            targetHandle: 'output',
          },
        ]
      : [],
  );

  return { nodes, edges };
};

const vizGraphToNodeNetwork = (
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
    isMinimized: false,
    nodes: [...projectedNodes, ...projectedOutputs.nodes],
    edges: [...createProjectedGraphEdges(graph), ...projectedOutputs.edges],
  };
};

export const projectGraphsToNodeNetworks = (
  project: VizProjectDocument,
  previousNetworks: Record<string, NodeNetwork> = {},
): Record<string, NodeNetwork> =>
  Object.fromEntries(
    (project.graphs ?? []).map((graph) => [
      graph.id,
      vizGraphToNodeNetwork(graph, previousNetworks[graph.id]),
    ]),
  );

const attachGraphToLayerInput = (
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

  for (const [path, presetOrId] of Object.entries(comp.defaultNetworks ?? {})) {
    const option = resolveEditorOptionByPath(comp, layerId, path);
    const preset =
      typeof presetOrId === 'string' ? getPresetById(presetOrId) : presetOrId;

    if (!option || !preset) {
      continue;
    }

    const graphId = option.id;
    const outputType = option.type;
    const graph = instantiateCanonicalPreset(preset, graphId, outputType);

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
