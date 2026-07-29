import { Comp } from '@/components/config/create-component';
import {
  NodeHandleType,
  safeVTypeToNodeHandleType,
} from '@/components/config/node-types';
import { VType } from '@/components/config/types';
import {
  AnimInputData,
  InputNode,
  createOutputNode,
} from '@/components/node-network/animation-nodes';
import { Edge } from '@xyflow/react';
import {
  GraphNode,
  NodeNetwork,
} from '@/components/node-network/graph-types';
import {
  getPresetById,
  getPresetsForType,
  instantiatePreset,
} from '@/components/node-network/presets';
import {
  assignDeterministicIdsToConfig,
  getParameterIdsFromConfig,
} from '@/lib/comp-utils/config-utils';
import {
  createVizEditorAudioSessionController,
  createVizEditorTransportController,
  type VizEditorAudioAnalyzerState,
  type VizEditorAudioSource,
} from '@viz-engine/editor-session';
import { arrayMove } from '@dnd-kit/sortable';
import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizLayer,
  type VizProjectDocument,
} from '@viz-engine/contracts';
import {
  assertValidProjectDocument,
  validateProjectDocument,
} from '@viz-engine/runtime';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { LayerSettings } from '@/components/editor/layer-settings';
import useCompStore from '@/lib/stores/comp-store';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import useEditorStore from '@/lib/stores/editor-store';
import useEditorLayerProjectionStore from '@/lib/stores/editor-layer-projection-store';
import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { generateLayerId } from '@/lib/id-utils';
import { createIdbJsonStorage } from '@/lib/idb-json-storage';
import { useNodeNetworkStore } from '@/components/node-network/node-network-store';
import { reportNodeNetworkMetric } from '@/lib/profiling/node-network-metrics';
import { toast } from 'sonner';

import type {
  LayerEditorHistory,
  LayerEditorHistoryState,
  NodeNetworkHistory,
  VizSessionAudioState,
  VizSessionGraphState,
  VizSessionHistoryState,
  VizSessionPreviewState,
  VizSessionProjectState,
  VizSessionRuntimeInspectionState,
  VizSessionRuntimePreviewFrame,
  VizSessionState,
} from './types';
import {
  applyEditorLayerSettings,
  attachGraphToLayerInput,
  createEmptyVizProjectDocument,
  createProjectedLayer,
  createVizLayerFromComp,
  detachGraphFromLayerInput,
  findEditorCompForLayer,
  nodeNetworkToVizGraph,
  projectGraphsToNodeNetworks,
} from './project-adapters';

const DEFAULT_FPS = 60;
const DEFAULT_DURATION_FRAMES = 1;
const MAX_HISTORY_SIZE = 50;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createInitialTransportState = () => ({
  fps: DEFAULT_FPS,
  durationFrames: DEFAULT_DURATION_FRAMES,
  currentFrame: 0,
  isPlaying: false,
  loop: true,
  mode: 'live' as const,
});

const createInitialRuntimeInspectionState =
  (): VizSessionRuntimeInspectionState => ({
    status: 'idle',
    lastRequestedFrame: null,
    lastCompletedFrame: null,
    renderCycle: 0,
    lastRenderedLayerIds: [],
    runtimeBackedLayerIds: [],
    lastError: null,
  });

const createInitialPreviewState = (): VizSessionPreviewState => ({
  transport: createInitialTransportState(),
  runtimeInspection: createInitialRuntimeInspectionState(),
});

const createEmptyLayerHistory = (): LayerEditorHistory => ({
  past: [],
  present: {
    project: createEmptyVizProjectDocument(),
  },
  future: [],
});

const createEmptyNodeHistory = (): NodeNetworkHistory => ({
  past: [],
  present: {
    nodes: [],
    edges: [],
  },
  future: [],
});

const createInitialHistoryState = (): VizSessionHistoryState => ({
  layerHistory: createEmptyLayerHistory(),
  nodeHistories: {},
  isNodeEditorFocused: false,
  isBypassingHistory: false,
  nodeDragBypass: {},
  debounceTimer: null,
});

const createInitialAudioController = () => createVizEditorAudioSessionController();

const createSessionStorage = () => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
  }

  return createIdbJsonStorage({
    dbName: 'viz-engine',
    storeName: 'viz-session-store',
    throttleMs: 100,
  });
};

let transportController = createVizEditorTransportController({
  fps: DEFAULT_FPS,
  durationFrames: DEFAULT_DURATION_FRAMES,
});

let audioController = createInitialAudioController();

const updateNestedValue = (
  current: Record<string, any>,
  path: (string | number)[],
  value: any,
): Record<string, any> => {
  if (path.length === 0) {
    return current;
  }

  const [head, ...rest] = path;
  if (rest.length === 0) {
    return {
      ...current,
      [head]: value,
    };
  }

  const nestedValue = current[head];
  const nextNested =
    nestedValue && typeof nestedValue === 'object' ? nestedValue : {};

  return {
    ...current,
    [head]: updateNestedValue(nextNested, rest, value),
  };
};

const resolveComp = (layer: Pick<VizLayer, 'componentId' | 'name'>): Comp | null =>
  findEditorCompForLayer(layer, useCompStore.getState().comps);

const resolveOptionByPath = (comp: Comp, layerId: string, path: string) => {
  const config = assignDeterministicIdsToConfig(layerId, comp.config.clone());
  const segments = path.split('.');
  let current: Record<string, any> = config.options;

  for (let index = 0; index < segments.length; index += 1) {
    const key = segments[index];
    const option = current[key];
    if (!option) {
      return null;
    }

    if ('options' in option && option.options && typeof option.options === 'object') {
      current = option.options;
      continue;
    }

    if ('type' in option && 'getDefaultValue' in option && index === segments.length - 1) {
      return option;
    }

    return null;
  }

  return null;
};

const syncProjectedStoresFromProject = (project: VizProjectDocument) => {
  const currentPreviewLayersById = new Map(
    useEditorLayerProjectionStore
      .getState()
      .layers.map((layer) => [layer.id, layer]),
  );
  const layerUi = useEditorStore.getState().layerUi;
  const layersById = new Map(project.layers.map((layer) => [layer.id, layer]));
  const orderedLayers = [
    ...project.layerOrder
      .map((layerId) => layersById.get(layerId))
      .filter((layer): layer is VizLayer => layer !== undefined),
    ...project.layers.filter(
      (layer) => !project.layerOrder.includes(layer.id),
    ),
  ];

  const nextProjectedLayers = orderedLayers
    .map((layer) => {
      const comp = resolveComp(layer);
      return comp
        ? createProjectedLayer({
            layer,
            comp,
            uiState: layerUi[layer.id],
            currentLayer: currentPreviewLayersById.get(layer.id),
          })
        : null;
    })
    .filter((layer): layer is NonNullable<typeof layer> => layer !== null);

  useEditorLayerProjectionStore.setState({
    layers: nextProjectedLayers,
  });
  useEditorRuntimePreviewAttachmentStore
    .getState()
    .pruneLayerAttachments(nextProjectedLayers.map((layer) => layer.id));
  useEditorStore
    .getState()
    .pruneLayerUi(project.layers.map((layer) => layer.id));
};

const cloneNetworks = (
  networks: Record<string, NodeNetwork>,
): Record<string, NodeNetwork> =>
  Object.fromEntries(
    Object.entries(networks).map(([parameterId, network]) => [
      parameterId,
      {
        ...network,
        nodes: network.nodes.map((node) => ({
          ...node,
          position: { ...node.position },
          data: {
            ...node.data,
            inputValues: { ...node.data.inputValues },
            state: { ...node.data.state },
          },
        })),
        edges: network.edges.map((edge) => ({
          ...edge,
        })),
      },
    ]),
  );

const createEmptyNetwork = (
  parameterId: string,
  type: VType,
): NodeNetwork => ({
  name: parameterId,
  isEnabled: true,
  isMinimized: false,
  nodes: [
    {
      id: `${parameterId}-input-node`,
      type: 'NodeRenderer',
      position: { x: 0, y: 0 },
      data: {
        definition: InputNode,
        inputValues: {},
        state: {},
      },
    },
    {
      id: `${parameterId}-output-node`,
      type: 'NodeRenderer',
      position: { x: 300, y: 0 },
      data: {
        definition: createOutputNode(safeVTypeToNodeHandleType(type)),
        inputValues: {},
        state: {},
      },
    },
  ],
  edges: [],
});

const duplicateNetworkGraph = (
  fromParameterId: string,
  toParameterId: string,
  sourceNetwork: NodeNetwork,
): NodeNetwork => {
  const nodeIdMap = new Map<string, string>();

  const nodes = sourceNetwork.nodes.map((node) => {
    const nextNodeId = node.id.replace(fromParameterId, toParameterId);
    nodeIdMap.set(node.id, nextNodeId);

    return {
      ...node,
      id: nextNodeId,
      data: {
        ...node.data,
        inputValues: { ...node.data.inputValues },
        state: { ...node.data.state },
      },
    };
  });

  const edges = sourceNetwork.edges.map((edge) => ({
    ...edge,
    id: edge.id.replace(fromParameterId, toParameterId),
    source: nodeIdMap.get(edge.source) ?? edge.source,
    target: nodeIdMap.get(edge.target) ?? edge.target,
  }));

  return {
    ...sourceNetwork,
    name: toParameterId,
    nodes,
    edges,
  };
};

const createInitialProjectState = (): VizSessionProjectState => ({
  initialized: false,
  revision: 0,
  sourceProject: null,
  workingProject: createEmptyVizProjectDocument(),
});

const createInitialGraphState = (): VizSessionGraphState => ({
  networks: {},
});

const createInitialAudioState = (): VizSessionAudioState => ({
  session: audioController.getState(),
  diagnostics: audioController.getDiagnostics(),
  audioFile: null,
  currentTrackUrl: null,
  trackList: [],
  currentTrackIndex: -1,
  currentTime: 0,
  visualTime: 0,
});

const createInitialState = (): VizSessionState => ({
  project: createInitialProjectState(),
  preview: createInitialPreviewState(),
  audio: createInitialAudioState(),
  graph: createInitialGraphState(),
  history: createInitialHistoryState(),
});

export const vizSessionStore = createStore<VizSessionState>()(
  persist(
    () => createInitialState(),
    {
      name: `viz-session-${VIZ_PROJECT_SCHEMA_VERSION}`,
      storage: createJSONStorage(createSessionStorage),
      partialize: (state) => ({
        project: state.project,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<VizSessionState>) ?? {};
        const persistedProject =
          persisted.project &&
          validateProjectDocument(persisted.project.workingProject).ok
            ? persisted.project
            : currentState.project;

        return {
          ...currentState,
          project: persistedProject,
          graph: {
            networks: projectGraphsToNodeNetworks(
              persistedProject.workingProject,
            ),
          },
        };
      },
    },
  ),
);

transportController = createVizEditorTransportController({
  fps: DEFAULT_FPS,
  durationFrames: DEFAULT_DURATION_FRAMES,
  onStateChange: (transport) => {
    vizSessionStore.setState((state) => ({
      ...state,
      preview: {
        ...state.preview,
        transport,
      },
    }));
  },
});

audioController = createVizEditorAudioSessionController({
  onStateChange: (session) => {
    vizSessionStore.setState((state) => ({
      ...state,
      audio: {
        ...state.audio,
        session,
        diagnostics: audioController.getDiagnostics(),
      },
    }));
  },
});

const getProjectState = () => vizSessionStore.getState().project;
const getGraphState = () => vizSessionStore.getState().graph;
const getHistoryState = () => vizSessionStore.getState().history;
const getPreviewState = () => vizSessionStore.getState().preview;
const getAudioState = () => vizSessionStore.getState().audio;

const replaceProjectState = (project: VizSessionProjectState) => {
  vizSessionStore.setState((state) => ({
    ...state,
    project,
  }));
};

const replaceGraphState = (graph: VizSessionGraphState) => {
  vizSessionStore.setState((state) => ({
    ...state,
    graph,
  }));
};

const replaceHistoryState = (history: VizSessionHistoryState) => {
  vizSessionStore.setState((state) => ({
    ...state,
    history,
  }));
};

const replacePreviewState = (preview: VizSessionPreviewState) => {
  vizSessionStore.setState((state) => ({
    ...state,
    preview,
  }));
};

const replaceAudioState = (audio: VizSessionAudioState) => {
  vizSessionStore.setState((state) => ({
    ...state,
    audio,
  }));
};

const syncNetworkOpenState = () => {
  const openNetwork = useNodeNetworkStore.getState().openNetwork;
  const networks = getGraphState().networks;
  if (openNetwork && !networks[openNetwork]) {
    useNodeNetworkStore.getState().setOpenNetwork(null);
  }
};

const updateProject = (
  nextProject: VizProjectDocument,
  options: {
    syncLayerProjections?: boolean;
    syncGraphProjection?: boolean;
  } = {},
) => {
  const canonicalProject = clone(nextProject);
  if (options.syncLayerProjections !== false) {
    syncProjectedStoresFromProject(canonicalProject);
  }
  if (options.syncGraphProjection) {
    replaceGraphState({
      networks: projectGraphsToNodeNetworks(
        canonicalProject,
        getGraphState().networks,
      ),
    });
    syncNetworkOpenState();
  }

  const projectState = getProjectState();
  replaceProjectState({
    initialized: true,
    revision: projectState.revision + 1,
    sourceProject: projectState.sourceProject ?? clone(canonicalProject),
    workingProject: canonicalProject,
  });
};

const commitGraphNetworks = (networks: Record<string, NodeNetwork>) => {
  const previousProjectedGraphIds = new Set(
    Object.keys(getGraphState().networks),
  );
  const nextNetworks = cloneNetworks(networks);
  let project = getProjectState().workingProject;

  for (const graphId of previousProjectedGraphIds) {
    project = detachGraphFromLayerInput(project, graphId);
  }

  project = {
    ...project,
    graphs: [
      ...(project.graphs ?? []).filter(
        (graph) => !previousProjectedGraphIds.has(graph.id),
      ),
      ...Object.entries(nextNetworks).map(([graphId, network]) =>
        nodeNetworkToVizGraph(graphId, network),
      ),
    ],
  };

  for (const graphId of Object.keys(nextNetworks)) {
    project = attachGraphToLayerInput(project, graphId);
  }

  replaceGraphState({ networks: nextNetworks });
  updateProject(project, {
    syncLayerProjections: false,
  });
  syncNetworkOpenState();
};

const createDefaultNetworksForLayer = (layer: VizLayer) => {
  const comp = resolveComp(layer);
  if (!comp?.defaultNetworks) {
    return;
  }

  Object.entries(comp.defaultNetworks).forEach(([path, presetOrId]) => {
    const option = resolveOptionByPath(comp, layer.id, path);
    if (!option) {
      return;
    }

    const preset =
      typeof presetOrId === 'string' ? getPresetById(presetOrId) : presetOrId;
    if (!preset) {
      return;
    }

    const outputType = safeVTypeToNodeHandleType(option.type);
    const { nodes, edges } = instantiatePreset(preset, option.id, outputType);

    vizSessionActions.graph.setNetwork(option.id, {
      name: option.id,
      isEnabled: true,
      isMinimized: false,
      nodes,
      edges,
    });
  });
};

const removeNetworksForLayer = (layer: VizLayer) => {
  const comp = resolveComp(layer);
  if (!comp) {
    return;
  }

  const config = assignDeterministicIdsToConfig(layer.id, comp.config.clone());
  const parameterIds = getParameterIdsFromConfig(config);
  parameterIds.forEach((parameterId) => {
    vizSessionActions.graph.removeNetworkForParameter(parameterId);
  });
};

const duplicateNetworksForLayer = (
  sourceLayer: VizLayer,
  nextLayer: VizLayer,
) => {
  const sourceComp = resolveComp(sourceLayer);
  const nextComp = resolveComp(nextLayer);
  if (!sourceComp || !nextComp) {
    return;
  }

  const sourceConfig = assignDeterministicIdsToConfig(
    sourceLayer.id,
    sourceComp.config.clone(),
  );
  const nextConfig = assignDeterministicIdsToConfig(
    nextLayer.id,
    nextComp.config.clone(),
  );
  const sourceParameterIds = getParameterIdsFromConfig(sourceConfig);
  const nextParameterIds = getParameterIdsFromConfig(nextConfig);

  sourceParameterIds.forEach((sourceParameterId, index) => {
    const nextParameterId = nextParameterIds[index];
    if (nextParameterId && getGraphState().networks[sourceParameterId]) {
      vizSessionActions.graph.duplicateNetwork(sourceParameterId, nextParameterId);
    }
  });
};

const applyPresetNetworksForLayer = (
  layer: VizLayer,
  preset: {
    name: string;
    values: Record<string, any>;
    networks?: Record<string, string>;
  },
) => {
  const comp = resolveComp(layer);
  if (!comp) {
    return;
  }

  const config = assignDeterministicIdsToConfig(layer.id, comp.config.clone());
  const parameterIds = getParameterIdsFromConfig(config);
  const presetNetworkPaths = new Set(Object.keys(preset.networks ?? {}));

  parameterIds.forEach((parameterId) => {
    const parameterPath = parameterId.split(':').slice(1).join('.');
    if (!presetNetworkPaths.has(parameterPath)) {
      const existingNetwork = getGraphState().networks[parameterId];
      if (existingNetwork) {
        vizSessionActions.graph.setNetwork(parameterId, {
          ...existingNetwork,
          isEnabled: false,
        });
      }
    }
  });

  Object.entries(preset.networks ?? {}).forEach(([parameterPath, presetId]) => {
    const option = resolveOptionByPath(comp, layer.id, parameterPath);
    if (!option) {
      return;
    }

    const outputType = safeVTypeToNodeHandleType(option.type);
    vizSessionActions.graph.applyPresetToNetwork(option.id, presetId, outputType);
  });
};

const buildProjectHistoryState = (): LayerEditorHistoryState => ({
  project: clone(vizSessionActions.project.exportWorkingProject()),
});

const buildBundledTrackUrl = (filename: string) => `/music/${filename}`;

export const vizSessionActions = {
  project: {
    initializeProjectState(force = false) {
      const state = getProjectState();
      if (state.initialized) {
        syncProjectedStoresFromProject(state.workingProject);
        replaceGraphState({
          networks: projectGraphsToNodeNetworks(
            state.workingProject,
            getGraphState().networks,
          ),
        });
        transportController.setDurationFrames(
          state.workingProject.timeline.durationInFrames,
        );
        if (force) {
          replaceProjectState({
            ...state,
            revision: state.revision + 1,
          });
        }
        return;
      }

      const project =
        state.workingProject.schemaVersion === VIZ_PROJECT_SCHEMA_VERSION
          ? state.workingProject
          : createEmptyVizProjectDocument();
      syncProjectedStoresFromProject(project);
      replaceGraphState({
        networks: projectGraphsToNodeNetworks(
          project,
          getGraphState().networks,
        ),
      });
      transportController.setDurationFrames(project.timeline.durationInFrames);
      replaceProjectState({
        initialized: true,
        revision: force ? state.revision + 1 : state.revision,
        sourceProject: clone(project),
        workingProject: clone(project),
      });
    },
    importWorkingProject(project: VizProjectDocument) {
      assertValidProjectDocument(project);
      syncProjectedStoresFromProject(project);
      replaceGraphState({
        networks: projectGraphsToNodeNetworks(
          project,
          getGraphState().networks,
        ),
      });
      syncNetworkOpenState();
      transportController.setDurationFrames(project.timeline.durationInFrames);
      const current = getProjectState();
      replaceProjectState({
        initialized: true,
        revision: current.revision + 1,
        sourceProject: clone(project),
        workingProject: clone(project),
      });
    },
    exportWorkingProject() {
      return clone(getProjectState().workingProject);
    },
    refreshCompDefinitions() {
      if (!getProjectState().initialized) {
        return;
      }
      syncProjectedStoresFromProject(getProjectState().workingProject);
    },
    addLayer(comp: Comp) {
      if (!getProjectState().initialized) {
        vizSessionActions.project.initializeProjectState();
      }

      const layer = createVizLayerFromComp(comp, generateLayerId(comp.name));
      useEditorStore.getState().setLayerExpanded(layer.id, true);

      const project = getProjectState().workingProject;
      updateProject({
        ...project,
        layerOrder: [...project.layerOrder, layer.id],
        layers: [...project.layers, layer],
      });
      createDefaultNetworksForLayer(layer);
    },
    removeLayer(layerId: string) {
      if (!getProjectState().initialized) {
        vizSessionActions.project.initializeProjectState();
      }

      const currentLayer = getProjectState().workingProject.layers.find(
        (layer) => layer.id === layerId,
      );
      if (!currentLayer) {
        return;
      }

      removeNetworksForLayer(currentLayer);
      useEditorStore.getState().pruneLayerUi(
        getProjectState().workingProject.layerOrder.filter(
          (id) => id !== layerId,
        ),
      );
      const project = getProjectState().workingProject;
      updateProject({
        ...project,
        layerOrder: project.layerOrder.filter((id) => id !== layerId),
        layers: project.layers.filter((layer) => layer.id !== layerId),
      });
    },
    duplicateLayer(layerId: string) {
      if (!getProjectState().initialized) {
        vizSessionActions.project.initializeProjectState();
      }

      const sourceLayer = getProjectState().workingProject.layers.find(
        (layer) => layer.id === layerId,
      );
      if (!sourceLayer) {
        return;
      }

      const duplicatedLayer: VizLayer = {
        ...clone(sourceLayer),
        id: generateLayerId(sourceLayer.name),
        name: sourceLayer.name,
        inputs: Object.fromEntries(
          Object.entries(sourceLayer.inputs ?? {}).filter(
            ([, source]) => source.kind !== 'graph-output',
          ),
        ),
      };
      useEditorStore.getState().setLayerExpanded(duplicatedLayer.id, true);

      const project = getProjectState().workingProject;
      updateProject({
        ...project,
        layerOrder: [...project.layerOrder, duplicatedLayer.id],
        layers: [...project.layers, duplicatedLayer],
      });
      duplicateNetworksForLayer(sourceLayer, duplicatedLayer);
    },
    reorderLayers(activeId: string, overId: string) {
      if (!getProjectState().initialized) {
        vizSessionActions.project.initializeProjectState();
      }
      if (activeId === overId) {
        return;
      }

      const project = getProjectState().workingProject;
      const oldIndex = project.layerOrder.indexOf(activeId);
      const nextIndex = project.layerOrder.indexOf(overId);
      if (oldIndex === -1 || nextIndex === -1) {
        return;
      }
      updateProject({
        ...project,
        layerOrder: arrayMove(project.layerOrder, oldIndex, nextIndex),
      });
    },
    setLayerExpanded(layerId: string, isExpanded: boolean) {
      if (!getProjectState().initialized) {
        vizSessionActions.project.initializeProjectState();
      }
      useEditorStore.getState().setLayerExpanded(layerId, isExpanded);
      syncProjectedStoresFromProject(getProjectState().workingProject);
    },
    setAllLayersExpanded(isExpanded: boolean) {
      if (!getProjectState().initialized) {
        vizSessionActions.project.initializeProjectState();
      }
      useEditorStore
        .getState()
        .setAllLayersExpanded(
          getProjectState().workingProject.layerOrder,
          isExpanded,
        );
      syncProjectedStoresFromProject(getProjectState().workingProject);
    },
    setLayerDebugEnabled(layerId: string, isDebugEnabled: boolean) {
      if (!getProjectState().initialized) {
        vizSessionActions.project.initializeProjectState();
      }
      useEditorStore
        .getState()
        .setLayerDebugEnabled(layerId, isDebugEnabled);
      syncProjectedStoresFromProject(getProjectState().workingProject);
    },
    updateLayerSettings(layerId: string, settings: LayerSettings) {
      if (!getProjectState().initialized) {
        vizSessionActions.project.initializeProjectState();
      }
      const project = getProjectState().workingProject;
      updateProject({
        ...project,
        layers: project.layers.map((layer) =>
          layer.id === layerId
            ? applyEditorLayerSettings(layer, settings)
            : layer,
        ),
      });
    },
    updateLayerValue(
      layerId: string,
      path: (string | number)[],
      value: any,
    ) {
      if (!getProjectState().initialized) {
        vizSessionActions.project.initializeProjectState();
      }
      const project = getProjectState().workingProject;
      updateProject({
        ...project,
        layers: project.layers.map((layer) =>
          layer.id === layerId
            ? {
                ...layer,
                settings: updateNestedValue(
                  layer.settings ?? {},
                  path,
                  value,
                ),
              }
            : layer,
        ),
      });
    },
    applyLayerPreset(
      layerId: string,
      preset: {
        name: string;
        values: Record<string, any>;
        networks?: Record<string, string>;
      },
    ) {
      if (!getProjectState().initialized) {
        vizSessionActions.project.initializeProjectState();
      }

      const currentLayer = getProjectState().workingProject.layers.find(
        (layer) => layer.id === layerId,
      );
      if (!currentLayer) {
        return;
      }

      applyPresetNetworksForLayer(currentLayer, preset);
      const project = getProjectState().workingProject;
      updateProject({
        ...project,
        layers: project.layers.map((layer) =>
          layer.id === layerId
            ? { ...layer, settings: clone(preset.values) }
            : layer,
        ),
      });
    },
    setState(partial: Partial<VizSessionProjectState>) {
      const nextState = {
        ...getProjectState(),
        ...partial,
      };
      replaceProjectState(nextState);
      syncProjectedStoresFromProject(nextState.workingProject);
      replaceGraphState({
        networks: projectGraphsToNodeNetworks(
          nextState.workingProject,
          getGraphState().networks,
        ),
      });
    },
  },
  graph: {
    importNetworks(networks: Record<string, NodeNetwork>) {
      commitGraphNetworks(networks);
    },
    replaceNetworks(networks: Record<string, NodeNetwork>) {
      vizSessionActions.graph.importNetworks(networks);
    },
    exportNetworks() {
      return cloneNetworks(getGraphState().networks);
    },
    reset() {
      commitGraphNetworks({});
    },
    setNetwork(parameterId: string, network: NodeNetwork) {
      commitGraphNetworks({
        ...getGraphState().networks,
        [parameterId]: cloneNetworks({ [parameterId]: network })[parameterId],
      });
    },
    setNetworkEnabled(parameterId: string, isEnabled: boolean, type: VType) {
      if (!getGraphState().networks[parameterId]) {
        if (!isEnabled) {
          return;
        }

        vizSessionActions.graph.createNetworkForParameter(parameterId, type);
        return;
      }

      commitGraphNetworks({
        ...getGraphState().networks,
        [parameterId]: {
          ...getGraphState().networks[parameterId],
          isEnabled,
        },
      });
    },
    addNodeToNetwork(parameterId: string, node: GraphNode) {
      const existingNetwork = getGraphState().networks[parameterId];
      if (!existingNetwork) {
        return;
      }

      commitGraphNetworks({
        ...getGraphState().networks,
        [parameterId]: {
          ...existingNetwork,
          nodes: [
            ...existingNetwork.nodes,
            {
              ...node,
              data: {
                ...node.data,
                inputValues: { ...node.data.inputValues },
                state: { ...node.data.state },
              },
            },
          ],
        },
      });
    },
    setNodesInNetwork(parameterId: string, nodes: GraphNode[]) {
      const network = getGraphState().networks[parameterId];
      if (!network) {
        return;
      }

      commitGraphNetworks({
        ...getGraphState().networks,
        [parameterId]: {
          ...network,
          nodes,
        },
      });
    },
    setEdgesInNetwork(parameterId: string, edges: Edge[]) {
      const network = getGraphState().networks[parameterId];
      if (!network) {
        return;
      }

      commitGraphNetworks({
        ...getGraphState().networks,
        [parameterId]: {
          ...network,
          edges,
        },
      });
    },
    createNetworkForParameter(parameterId: string, type: VType) {
      commitGraphNetworks({
        ...getGraphState().networks,
        [parameterId]: createEmptyNetwork(parameterId, type),
      });
    },
    removeNetworkForParameter(parameterId: string) {
      if (!getGraphState().networks[parameterId]) {
        return;
      }

      const networks = { ...getGraphState().networks };
      delete networks[parameterId];
      commitGraphNetworks(networks);
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

      const { nodes, edges } = instantiatePreset(
        preset,
        parameterId,
        outputType,
      );

      vizSessionActions.graph.setNetwork(parameterId, {
        name: parameterId,
        isEnabled: true,
        isMinimized: false,
        nodes,
        edges,
      });
    },
    updateNodeInputValue(
      parameterId: string,
      nodeId: string,
      inputId: string,
      value: any,
    ) {
      const network = getGraphState().networks[parameterId];
      if (!network) {
        return;
      }

      commitGraphNetworks({
        ...getGraphState().networks,
        [parameterId]: {
          ...network,
          nodes: network.nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    inputValues: {
                      ...node.data.inputValues,
                      [inputId]: value,
                    },
                  },
                }
              : node,
          ),
        },
      });
    },
    computeNetworkOutput(parameterId: string, inputData: AnimInputData) {
      const startTime = performance.now();
      const network = getGraphState().networks[parameterId];

      if (!network || !network.isEnabled) {
        throw new Error('Network not found or not enabled');
      }

      const { setNodeOutput, setGlobalAnimData } = useNodeOutputCache.getState();
      setGlobalAnimData(inputData);
      const { setNodeInputValue } = useNodeLiveValuesStore.getState();
      const nodeOutputs: Record<string, any> = {};

      const computeNodeOutput = (node: GraphNode): any => {
        if (node.id in nodeOutputs) {
          return nodeOutputs[node.id];
        }

        if (node.data.definition.label === 'Input') {
          const output = node.data.definition.computeSignal(inputData, inputData);
          nodeOutputs[node.id] = output;
          setNodeOutput(node.id, output);
          return output;
        }

        const inputs = node.data.definition.inputs.reduce(
          (acc, input) => {
            const edge = network.edges.find(
              (candidate) =>
                candidate.target === node.id &&
                candidate.targetHandle === input.id,
            );

            let resolvedValue;
            if (edge) {
              const sourceNode = network.nodes.find(
                (candidate) => candidate.id === edge.source,
              );

              if (sourceNode) {
                const sourceOutput = computeNodeOutput(sourceNode);
                if (
                  edge.sourceHandle &&
                  sourceOutput?.[edge.sourceHandle] !== undefined
                ) {
                  resolvedValue = sourceOutput[edge.sourceHandle];
                } else if (
                  !edge.sourceHandle &&
                  typeof sourceOutput === 'object' &&
                  sourceOutput !== null
                ) {
                  resolvedValue = Object.values(sourceOutput)[0];
                }
              }
            } else {
              resolvedValue = node.data.inputValues[input.id];
              if (resolvedValue === undefined) {
                if (input.id === 'audioSignal') {
                  resolvedValue = (inputData as any)?.audioSignal;
                } else if (input.id === 'frequencyAnalysis') {
                  resolvedValue = (inputData as any)?.frequencyAnalysis;
                }
              }
            }

            if (input.type === 'number' && typeof resolvedValue === 'string') {
              const parsed = parseFloat(resolvedValue);
              acc[input.id] = Number.isNaN(parsed) ? 0 : parsed;
            } else if (input.type === 'string') {
              acc[input.id] = String(resolvedValue);
            } else {
              acc[input.id] = resolvedValue;
            }

            if (resolvedValue !== undefined) {
              setNodeInputValue(node.id, input.id, acc[input.id]);
            }

            return acc;
          },
          {} as Record<string, any>,
        );

        const output = node.data.definition.computeSignal(inputs, inputData, node);
        nodeOutputs[node.id] = output;
        setNodeOutput(node.id, output);
        return output;
      };

      const outputNode = network.nodes.find(
        (node) => node.data.definition.label === 'Output',
      );
      if (!outputNode) {
        throw new Error('Output node not found in network');
      }

      const output = computeNodeOutput(outputNode);
      const computeTime = performance.now() - startTime;

      reportNodeNetworkMetric({
        parameterId,
        parameterName: network.name || parameterId,
        computeTime,
        nodeCount: network.nodes.length,
      });

      return output;
    },
    duplicateNetwork(fromParameterId: string, toParameterId: string) {
      const sourceNetwork = getGraphState().networks[fromParameterId];
      if (!sourceNetwork) {
        return;
      }

      commitGraphNetworks({
        ...getGraphState().networks,
        [toParameterId]: duplicateNetworkGraph(
          fromParameterId,
          toParameterId,
          sourceNetwork,
        ),
      });
    },
    clearStaleNetworks(validParameterIds?: Iterable<string>) {
      const validIds = new Set(validParameterIds ?? []);

      if (validIds.size === 0 && typeof window !== 'undefined') {
        try {
          const { layers } = useEditorLayerProjectionStore.getState();
          layers.forEach((layer: any) => {
            if (layer.config?.options) {
              const parameterIds = getParameterIdsFromConfig(layer.config);
              parameterIds.forEach((parameterId: string) =>
                validIds.add(parameterId),
              );
            }
          });
        } catch (error) {
          console.error('Error resolving valid graph parameter ids:', error);
          return;
        }
      }

      const nextNetworks = Object.fromEntries(
        Object.entries(getGraphState().networks).filter(([parameterId]) =>
          validIds.has(parameterId),
        ),
      );
      commitGraphNetworks(nextNetworks);
    },
    setState(partial: Partial<VizSessionGraphState>) {
      if (partial.networks) {
        commitGraphNetworks(partial.networks);
      }
    },
  },
  preview: {
    play() {
      transportController.play();
    },
    pause() {
      transportController.pause();
    },
    togglePlayback() {
      transportController.togglePlayback();
    },
    seekToFrame(frame: number) {
      transportController.seekToFrame(frame);
    },
    seekToSeconds(seconds: number) {
      const fps =
        getPreviewState().transport.fps > 0
          ? getPreviewState().transport.fps
          : DEFAULT_FPS;
      transportController.seekToFrame(Math.floor(seconds * fps));
    },
    syncCurrentFrame(frame: number) {
      if (frame === getPreviewState().transport.currentFrame) {
        return;
      }
      transportController.seekToFrame(frame);
    },
    setDurationFrames(durationFrames: number) {
      transportController.setDurationFrames(durationFrames);
      const project = getProjectState().workingProject;
      if (
        Number.isInteger(durationFrames) &&
        durationFrames > 0 &&
        project.timeline.durationInFrames !== durationFrames
      ) {
        updateProject(
          {
            ...project,
            timeline: {
            ...project.timeline,
              durationInFrames: durationFrames,
            },
          },
          {
            syncLayerProjections: false,
          },
        );
      }
    },
    reset() {
      transportController.pause();
      transportController.seekToFrame(0);
      transportController.setDurationFrames(DEFAULT_DURATION_FRAMES);
      replacePreviewState({
        ...getPreviewState(),
        transport: transportController.getState(),
        runtimeInspection: createInitialRuntimeInspectionState(),
      });
    },
    renderRuntimePreviewFrame(frame: VizSessionRuntimePreviewFrame) {
      try {
        const layerResults =
          useEditorRuntimePreviewAttachmentStore
            .getState()
            .renderAllLayers(frame);
        const lastRenderedLayerIds = Object.keys(layerResults);
        const runtimeBackedLayerIds = Object.entries(layerResults)
          .filter(([, result]) => result.runtimeBacked)
          .map(([layerId]) => layerId);
        const nextPreview = getPreviewState();

        replacePreviewState({
          ...nextPreview,
          runtimeInspection: {
            ...nextPreview.runtimeInspection,
            status: 'idle',
            lastRequestedFrame: frame,
            lastCompletedFrame: frame,
            renderCycle: nextPreview.runtimeInspection.renderCycle + 1,
            lastRenderedLayerIds,
            runtimeBackedLayerIds,
            lastError: null,
          },
        });
      } catch (error) {
        const nextPreview = getPreviewState();
        replacePreviewState({
          ...nextPreview,
          runtimeInspection: {
            ...nextPreview.runtimeInspection,
            status: 'failed',
            lastRequestedFrame: frame,
            lastError: {
              message:
                error instanceof Error
                  ? error.message
                  : 'Unknown runtime preview error',
              frame,
            },
          },
        });
        throw error;
      }
    },
    inspectRuntimePreview() {
      const state = vizSessionStore.getState();
      return {
        projectRevision: state.project.revision,
        layerCount: state.project.workingProject.layers.length,
        ...state.preview.runtimeInspection,
        lastRenderedLayerIds: [
          ...state.preview.runtimeInspection.lastRenderedLayerIds,
        ],
        runtimeBackedLayerIds: [
          ...state.preview.runtimeInspection.runtimeBackedLayerIds,
        ],
      };
    },
    setState(partial: Partial<VizSessionPreviewState>) {
      replacePreviewState({
        ...getPreviewState(),
        ...partial,
      });
    },
  },
  audio: {
    setTrackList(trackList: string[]) {
      replaceAudioState({
        ...getAudioState(),
        trackList,
      });
    },
    setCurrentTime(currentTime: number) {
      replaceAudioState({
        ...getAudioState(),
        currentTime,
      });
    },
    setVisualTime(visualTime: number) {
      replaceAudioState({
        ...getAudioState(),
        visualTime,
      });
    },
    attachBundledTrack(filename: string, index?: number) {
      const url = buildBundledTrackUrl(filename);
      useAudioEngineStore.getState().loadAudioUrl(url);
      audioController.attachSource({
        kind: 'media-element',
        id: filename,
        label: filename,
        uri: url,
      });
      vizSessionActions.preview.seekToFrame(0);
      replaceAudioState({
        ...getAudioState(),
        session: audioController.getState(),
        diagnostics: audioController.getDiagnostics(),
        audioFile: null,
        currentTrackUrl: url,
        currentTrackIndex:
          typeof index === 'number' ? index : getAudioState().currentTrackIndex,
        currentTime: 0,
        visualTime: 0,
      });
    },
    attachLocalFile(audioFile: File, objectUrl: string) {
      useAudioEngineStore.getState().loadAudioUrl(objectUrl);
      audioController.attachSource({
        kind: 'file',
        id: `${audioFile.name}:${audioFile.lastModified}`,
        label: audioFile.name,
        uri: objectUrl,
      });
      vizSessionActions.preview.seekToFrame(0);
      replaceAudioState({
        ...getAudioState(),
        session: audioController.getState(),
        diagnostics: audioController.getDiagnostics(),
        audioFile,
        currentTrackUrl: objectUrl,
        currentTrackIndex: -1,
        currentTime: 0,
        visualTime: 0,
      });
    },
    attachCapturedStream(label: string) {
      audioController.attachSource({
        kind: 'stream',
        id: 'captured-tab-audio',
        label,
      });
      vizSessionActions.preview.seekToFrame(0);
      replaceAudioState({
        ...getAudioState(),
        session: audioController.getState(),
        diagnostics: audioController.getDiagnostics(),
        currentTime: 0,
        visualTime: 0,
      });
    },
    detachCapturedStream() {
      const { currentTrackUrl } = getAudioState();
      audioController.clearSource();
      audioController.setLiveInputAvailable(false);
      audioController.setAnalyzerState('idle');
      vizSessionActions.preview.seekToFrame(0);

      replaceAudioState({
        ...getAudioState(),
        session: audioController.getState(),
        diagnostics: audioController.getDiagnostics(),
        currentTime: 0,
        visualTime: 0,
      });

      if (currentTrackUrl) {
        useAudioEngineStore.getState().restoreElementUrl(currentTrackUrl);
        audioController.attachSource({
          kind: getAudioState().audioFile ? 'file' : 'media-element',
          id: getAudioState().audioFile
            ? `${getAudioState().audioFile!.name}:${getAudioState().audioFile!.lastModified}`
            : currentTrackUrl,
          label:
            getAudioState().audioFile?.name ??
            getAudioState().session.source?.label,
          uri: currentTrackUrl,
        });
        replaceAudioState({
          ...getAudioState(),
          session: audioController.getState(),
          diagnostics: audioController.getDiagnostics(),
        });
      } else {
        useAudioEngineStore.getState().clearElementSource();
      }
    },
    setAnalyzerState(analyzerState: VizEditorAudioAnalyzerState) {
      audioController.setAnalyzerState(analyzerState);
    },
    setLiveInputAvailable(liveInputAvailable: boolean) {
      audioController.setLiveInputAvailable(liveInputAvailable);
    },
    skipToNext() {
      const { trackList, currentTrackIndex } = getAudioState();
      if (trackList.length === 0) {
        return;
      }
      const nextIndex = (currentTrackIndex + 1) % trackList.length;
      const nextTrack = trackList[nextIndex];
      vizSessionActions.audio.attachBundledTrack(nextTrack, nextIndex);
    },
    skipToPrevious() {
      const { trackList, currentTrackIndex } = getAudioState();
      if (trackList.length === 0) {
        return;
      }
      const currentTime = useAudioEngineStore.getState().getElementCurrentTime();
      if (currentTime > 3) {
        vizSessionActions.audio.restartTrack();
        return;
      }
      const prevIndex =
        currentTrackIndex <= 0 ? trackList.length - 1 : currentTrackIndex - 1;
      const prevTrack = trackList[prevIndex];
      vizSessionActions.audio.attachBundledTrack(prevTrack, prevIndex);
    },
    restartTrack() {
      useAudioEngineStore.getState().seekElementToTime(0);
      vizSessionActions.preview.seekToFrame(0);
      replaceAudioState({
        ...getAudioState(),
        currentTime: 0,
        visualTime: 0,
      });
    },
    clearSelection() {
      audioController.clearSource();
      audioController.setLiveInputAvailable(false);
      audioController.setAnalyzerState('idle');
      useAudioEngineStore.getState().clearElementSource();
      vizSessionActions.preview.seekToFrame(0);
      replaceAudioState({
        ...getAudioState(),
        session: audioController.getState(),
        diagnostics: audioController.getDiagnostics(),
        audioFile: null,
        currentTrackUrl: null,
        currentTrackIndex: -1,
        currentTime: 0,
        visualTime: 0,
      });
    },
    reset() {
      audioController.clearSource();
      audioController.setLiveInputAvailable(false);
      audioController.setAnalyzerState('idle');
      replaceAudioState({
        session: audioController.getState(),
        diagnostics: audioController.getDiagnostics(),
        audioFile: null,
        currentTrackUrl: null,
        trackList: [],
        currentTrackIndex: -1,
        currentTime: 0,
        visualTime: 0,
      });
    },
    attachSource(source: VizEditorAudioSource) {
      audioController.attachSource(source);
      replaceAudioState({
        ...getAudioState(),
        session: audioController.getState(),
        diagnostics: audioController.getDiagnostics(),
      });
    },
    clearSource() {
      audioController.clearSource();
      replaceAudioState({
        ...getAudioState(),
        session: audioController.getState(),
        diagnostics: audioController.getDiagnostics(),
      });
    },
    setState(partial: Partial<VizSessionAudioState>) {
      replaceAudioState({
        ...getAudioState(),
        ...partial,
      });
    },
  },
  history: {
    initializeLayerHistory() {
      const state = getHistoryState();
      if (!getProjectState().initialized) {
        vizSessionActions.project.initializeProjectState();
      }
      const project = vizSessionActions.project.exportWorkingProject();

      if (
        state.layerHistory.present.project.layers.length === 0 &&
        state.layerHistory.past.length === 0 &&
        project.layers.length > 0
      ) {
        const initialState: LayerEditorHistoryState = {
          project: clone(project),
        };

        replaceHistoryState({
          ...state,
          layerHistory: {
            past: [],
            present: initialState,
            future: [],
          },
        });
      }
    },
    pushLayerHistory(skipDebounce = false) {
      const state = getHistoryState();
      if (state.isBypassingHistory) {
        return;
      }
      if (state.debounceTimer !== null) {
        clearTimeout(state.debounceTimer);
        replaceHistoryState({
          ...state,
          debounceTimer: null,
        });
      }

      const newState = buildProjectHistoryState();

      const executePush = () => {
        const currentState = getHistoryState();
        if (
          JSON.stringify(newState) ===
          JSON.stringify(currentState.layerHistory.present)
        ) {
          return;
        }

        const newPast = [
          ...currentState.layerHistory.past,
          currentState.layerHistory.present,
        ];
        if (newPast.length > MAX_HISTORY_SIZE) {
          newPast.shift();
        }

        replaceHistoryState({
          ...currentState,
          layerHistory: {
            past: newPast,
            present: newState,
            future: [],
          },
          debounceTimer: null,
        });
      };

      if (!skipDebounce) {
        const timer = setTimeout(executePush, 300);
        replaceHistoryState({
          ...getHistoryState(),
          debounceTimer: timer as any,
        });
      } else {
        executePush();
      }
    },
    flushPendingLayerHistory() {
      const state = getHistoryState();
      if (state.debounceTimer === null) {
        return;
      }

      clearTimeout(state.debounceTimer);
      const currentState = buildProjectHistoryState();

      if (
        JSON.stringify(currentState) !==
        JSON.stringify(state.layerHistory.present)
      ) {
        const newPast = [...state.layerHistory.past, state.layerHistory.present];
        if (newPast.length > MAX_HISTORY_SIZE) {
          newPast.shift();
        }
        replaceHistoryState({
          ...state,
          layerHistory: {
            past: newPast,
            present: currentState,
            future: [],
          },
          debounceTimer: null,
        });
        return;
      }

      replaceHistoryState({
        ...state,
        debounceTimer: null,
      });
    },
    applyLayerHistoryState(state: LayerEditorHistoryState) {
      vizSessionActions.project.importWorkingProject(clone(state.project));
    },
    undoLayerEditor() {
      vizSessionActions.history.flushPendingLayerHistory();
      const state = getHistoryState();
      if (state.layerHistory.past.length === 0) {
        return;
      }
      replaceHistoryState({
        ...state,
        isBypassingHistory: true,
      });

      const previous = state.layerHistory.past[state.layerHistory.past.length - 1];
      const newPast = state.layerHistory.past.slice(0, -1);
      const newFuture = [state.layerHistory.present, ...state.layerHistory.future];

      replaceHistoryState({
        ...getHistoryState(),
        layerHistory: {
          past: newPast,
          present: previous,
          future: newFuture,
        },
      });

      vizSessionActions.history.applyLayerHistoryState(previous);
      toast.success('Undo', {
        description: `${newPast.length} step${newPast.length !== 1 ? 's' : ''} back available`,
        duration: 1500,
      });
      setTimeout(() => {
        replaceHistoryState({
          ...getHistoryState(),
          isBypassingHistory: false,
        });
      }, 0);
    },
    redoLayerEditor() {
      vizSessionActions.history.flushPendingLayerHistory();
      const state = getHistoryState();
      if (state.layerHistory.future.length === 0) {
        return;
      }
      replaceHistoryState({
        ...state,
        isBypassingHistory: true,
      });
      const next = state.layerHistory.future[0];
      const newFuture = state.layerHistory.future.slice(1);
      const newPast = [...state.layerHistory.past, state.layerHistory.present];
      replaceHistoryState({
        ...getHistoryState(),
        layerHistory: {
          past: newPast,
          present: next,
          future: newFuture,
        },
      });
      vizSessionActions.history.applyLayerHistoryState(next);
      toast.success('Redo', {
        description: `${newFuture.length} step${newFuture.length !== 1 ? 's' : ''} forward available`,
        duration: 1500,
      });
      setTimeout(() => {
        replaceHistoryState({
          ...getHistoryState(),
          isBypassingHistory: false,
        });
      }, 0);
    },
    resetLayerHistory() {
      replaceHistoryState({
        ...getHistoryState(),
        layerHistory: createEmptyLayerHistory(),
      });
    },
    initializeNodeHistory(networkId: string) {
      const state = getHistoryState();
      if (!state.nodeHistories[networkId]) {
        const network = getGraphState().networks[networkId];
        if (network) {
          replaceHistoryState({
            ...state,
            nodeHistories: {
              ...state.nodeHistories,
              [networkId]: {
                past: [],
                present: {
                  nodes: network.nodes,
                  edges: network.edges,
                },
                future: [],
              },
            },
          });
        }
      }
    },
    pushNodeHistory(networkId: string, nodes: any[], edges: any[]) {
      const state = getHistoryState();
      if (state.nodeDragBypass[networkId]) {
        return;
      }
      const history = state.nodeHistories[networkId];
      if (!history) {
        return;
      }
      const newState = { nodes, edges };
      if (JSON.stringify(newState) === JSON.stringify(history.present)) {
        return;
      }
      const newPast = [...history.past, history.present];
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift();
      }
      replaceHistoryState({
        ...state,
        nodeHistories: {
          ...state.nodeHistories,
          [networkId]: {
            past: newPast,
            present: newState,
            future: [],
          },
        },
      });
    },
    undoNodeEditor(networkId: string) {
      const state = getHistoryState();
      const history = state.nodeHistories[networkId];
      if (!history || history.past.length === 0) {
        return;
      }
      const previous = history.past[history.past.length - 1];
      const newPast = history.past.slice(0, -1);
      const newFuture = [history.present, ...history.future];
      replaceHistoryState({
        ...state,
        nodeHistories: {
          ...state.nodeHistories,
          [networkId]: {
            past: newPast,
            present: previous,
            future: newFuture,
          },
        },
      });
      vizSessionActions.graph.setNodesInNetwork(networkId, previous.nodes);
      vizSessionActions.graph.setEdgesInNetwork(networkId, previous.edges);
    },
    redoNodeEditor(networkId: string) {
      const state = getHistoryState();
      const history = state.nodeHistories[networkId];
      if (!history || history.future.length === 0) {
        return;
      }
      const next = history.future[0];
      const newFuture = history.future.slice(1);
      const newPast = [...history.past, history.present];
      replaceHistoryState({
        ...state,
        nodeHistories: {
          ...state.nodeHistories,
          [networkId]: {
            past: newPast,
            present: next,
            future: newFuture,
          },
        },
      });
      vizSessionActions.graph.setNodesInNetwork(networkId, next.nodes);
      vizSessionActions.graph.setEdgesInNetwork(networkId, next.edges);
    },
    startNodeDrag(networkId: string) {
      replaceHistoryState({
        ...getHistoryState(),
        nodeDragBypass: {
          ...getHistoryState().nodeDragBypass,
          [networkId]: true,
        },
      });
    },
    endNodeDrag(networkId: string) {
      replaceHistoryState({
        ...getHistoryState(),
        nodeDragBypass: {
          ...getHistoryState().nodeDragBypass,
          [networkId]: false,
        },
      });
    },
    setNodeEditorFocused(focused: boolean) {
      replaceHistoryState({
        ...getHistoryState(),
        isNodeEditorFocused: focused,
      });
    },
    undo() {
      const state = getHistoryState();
      const openNodeNetwork = useNodeNetworkStore.getState().openNetwork;
      if (
        openNodeNetwork &&
        state.isNodeEditorFocused &&
        state.nodeHistories[openNodeNetwork]?.past.length > 0
      ) {
        vizSessionActions.history.undoNodeEditor(openNodeNetwork);
      } else if (state.layerHistory.past.length > 0) {
        vizSessionActions.history.undoLayerEditor();
      }
    },
    redo() {
      const state = getHistoryState();
      const openNodeNetwork = useNodeNetworkStore.getState().openNetwork;
      if (
        openNodeNetwork &&
        state.isNodeEditorFocused &&
        state.nodeHistories[openNodeNetwork]?.future.length > 0
      ) {
        vizSessionActions.history.redoNodeEditor(openNodeNetwork);
      } else if (state.layerHistory.future.length > 0) {
        vizSessionActions.history.redoLayerEditor();
      }
    },
    canUndo() {
      const state = getHistoryState();
      const openNodeNetwork = useNodeNetworkStore.getState().openNetwork;
      if (openNodeNetwork && state.isNodeEditorFocused) {
        const history = state.nodeHistories[openNodeNetwork];
        return history ? history.past.length > 0 : false;
      }
      return state.layerHistory.past.length > 0;
    },
    canRedo() {
      const state = getHistoryState();
      const openNodeNetwork = useNodeNetworkStore.getState().openNetwork;
      if (openNodeNetwork && state.isNodeEditorFocused) {
        const history = state.nodeHistories[openNodeNetwork];
        return history ? history.future.length > 0 : false;
      }
      return state.layerHistory.future.length > 0;
    },
    setBypassHistory(bypass: boolean) {
      replaceHistoryState({
        ...getHistoryState(),
        isBypassingHistory: bypass,
      });
    },
    setState(partial: Partial<VizSessionHistoryState>) {
      replaceHistoryState({
        ...getHistoryState(),
        ...partial,
      });
    },
  },
};

export const getVizSessionState = () => vizSessionStore.getState();
