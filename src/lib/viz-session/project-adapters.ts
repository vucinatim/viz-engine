import type { Comp } from '@/components/config/create-component';
import {
  NodeHandleType,
  isValidNodeHandleType,
} from '@/components/config/node-types';
import {
  NodeDefinitionMap,
  createOutputNode,
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
import type { LayerData } from '@/lib/editor-layer-types';
import type { EditorLayerUiState } from '@/lib/stores/editor-store';
import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizBlendMode,
  type VizGraphNodeInputBinding,
  type VizNodeGraphDocument,
  type VizProjectDocument,
  type VizLayer,
} from '@viz-engine/contracts';
import type { Edge } from '@xyflow/react';

const DEFAULT_PROJECT_ID = 'viz-local-project';
const DEFAULT_PROJECT_NAME = 'Untitled Viz Project';
const DEFAULT_VIEWPORT_WIDTH = 1920;
const DEFAULT_VIEWPORT_HEIGHT = 1080;
const DEFAULT_FPS = 60;
const DEFAULT_DURATION_FRAMES = 1;
const DEFAULT_OUTPUT_HANDLE = '__viz_default_output__';
const DEFAULT_INPUT_HANDLE = '__viz_default_input__';
const EDITOR_NODE_METADATA_KEY = 'vizEditor';
const EDITOR_GRAPH_METADATA_KEY = 'vizEditor';

interface EditorNodeMetadata {
  position?: { x: number; y: number };
  nodeType?: string;
  outputType?: string;
}

interface EditorGraphMetadata {
  isMinimized?: boolean;
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

const toNodeHandleType = (value: unknown): NodeHandleType =>
  typeof value === 'string' && isValidNodeHandleType(value)
    ? (value as NodeHandleType)
    : 'number';

export const createEmptyVizProjectDocument = (
  overrides: Partial<
    Pick<
      VizProjectDocument,
      'projectId' | 'name' | 'timeline' | 'viewport' | 'metadata'
    >
  > = {},
): VizProjectDocument => ({
  schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
  projectId: overrides.projectId ?? DEFAULT_PROJECT_ID,
  name: overrides.name ?? DEFAULT_PROJECT_NAME,
  timeline: overrides.timeline ?? {
    fps: DEFAULT_FPS,
    durationInFrames: DEFAULT_DURATION_FRAMES,
  },
  viewport: overrides.viewport ?? {
    width: DEFAULT_VIEWPORT_WIDTH,
    height: DEFAULT_VIEWPORT_HEIGHT,
    backgroundColor: '#000000',
  },
  layerOrder: [],
  layers: [],
  graphs: [],
  ...(overrides.metadata === undefined ? {} : { metadata: overrides.metadata }),
});

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
      comp.name === layer.name ||
      toEditorComponentId(comp.name) === layer.componentId,
  ) ?? null;

export const createVizLayerFromComp = (
  comp: Comp,
  layerId: string,
): VizLayer => ({
  id: layerId,
  name: comp.name,
  componentId: toEditorComponentId(comp.name),
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

const getDefinitionType = (node: GraphNode) => node.data.definition.label;

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
): VizNodeGraphDocument => {
  const outputNode = network.nodes.find(
    (node) => node.data.definition.label === 'Output',
  );

  return {
    id: graphId,
    name: network.name || graphId,
    enabled: network.isEnabled,
    nodes: network.nodes.map((node) => {
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
    outputs: outputNode
      ? [
          {
            key: 'value',
            nodeId: outputNode.id,
            output: 'value',
          },
        ]
      : [],
    metadata: {
      [EDITOR_GRAPH_METADATA_KEY]: {
        isMinimized: network.isMinimized ?? false,
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
  if (!definition) {
    throw new Error(`Node definition not found for: ${node.type}`);
  }

  return definition;
};

const createProjectedGraphNode = (
  node: VizNodeGraphDocument['nodes'][number],
  previousNode: GraphNode | undefined,
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
    position: editorMetadata.position ?? { x: 0, y: 0 },
    data: {
      definition: resolveNodeDefinition(node),
      inputValues,
      state: previousNode?.data.state ?? {},
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

export const vizGraphToNodeNetwork = (
  graph: VizNodeGraphDocument,
  previousNetwork?: NodeNetwork,
): NodeNetwork => ({
  name: graph.name,
  isEnabled: graph.enabled ?? true,
  isMinimized:
    readEditorGraphMetadata(graph.metadata).isMinimized ?? false,
  nodes: graph.nodes.map((node) =>
    createProjectedGraphNode(
      node,
      previousNetwork?.nodes.find((candidate) => candidate.id === node.id),
    ),
  ),
  edges: createProjectedGraphEdges(graph),
});

export const projectGraphsToNodeNetworks = (
  project: VizProjectDocument,
  previousNetworks: Record<string, NodeNetwork> = {},
): Record<string, NodeNetwork> =>
  Object.fromEntries(
    (project.graphs ?? [])
      .filter((graph) =>
        graph.nodes.every(
          (node) => node.type === 'Output' || NodeDefinitionMap.has(node.type),
        ),
      )
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
