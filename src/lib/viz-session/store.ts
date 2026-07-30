import { Comp } from '@/components/config/create-component';
import {
  createCoreComponentRegistry,
} from '@viz-engine/components-core';
import {
  NodeHandleType,
  safeVTypeToNodeHandleType,
} from '@/components/config/node-types';
import { VType } from '@/components/config/types';
import {
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
  type VizEditorAudioAnalyzerState,
  type VizEditorAudioSource,
} from '@viz-engine/editor-session';
import {
  createVizControl,
  createVizSessionHost,
} from '@viz-engine/editor-control';
import { createVizAudioFeatureBakeJobService } from '@viz-engine/bake';
import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizProjectAction,
  type VizLayer,
  type VizProjectDocument,
} from '@viz-engine/contracts';
import {
  applyVizComponentDefaultAssets,
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
import { generateLayerId } from '@/lib/id-utils';
import { createIdbJsonStorage } from '@/lib/idb-json-storage';
import { useNodeNetworkStore } from '@/components/node-network/node-network-store';
import { toast } from 'sonner';
import { createVizBrowserAudioBakeSourceResolver } from '@/lib/utils/browser-audio-bake';

import type {
  VizSessionAudioState,
  VizSessionHistoryState,
  VizSessionPreviewState,
  VizSessionProjectState,
  VizSessionRuntimePreviewAudioFrameData,
  VizSessionRuntimeInspectionState,
  VizSessionRuntimePreviewFrame,
  VizSessionState,
} from './types';
import {
  createVizSessionRuntimePreviewPlan,
  resetVizSessionRuntimePreviewPlanCache,
} from './runtime-preview-plan';
import {
  applyEditorLayerSettings,
  createProjectedLayer,
  createVizLayerFromComp,
  findEditorCompForLayer,
  isEditorAuthoredGraph,
  nodeNetworkToVizGraph,
} from './project-adapters';
import { createEmptyVizProjectDocument } from './project-document';
import {
  getProjectedNodeNetworks,
  resetVizSessionSelectorCaches,
} from './selectors';

const DEFAULT_FPS = 60;
const DEFAULT_DURATION_FRAMES = 1;
const runtimeComponentRegistry = createCoreComponentRegistry();
const audioFeatureBakeJobs = createVizAudioFeatureBakeJobService({
  sourceResolver: createVizBrowserAudioBakeSourceResolver((request) => {
    const asset = vizSessionHost
      .getProjectResources()
      .resolvedAssets.find(
        (candidate) =>
          candidate.id === request.sourceAssetId &&
          candidate.kind === 'audio',
      );
    if (!asset) {
      throw new Error(
        `No resolved audio asset "${request.sourceAssetId}" is available in the active session.`,
      );
    }
    return asset.uri;
  }),
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createInitialRuntimeInspectionState =
  (): VizSessionRuntimeInspectionState => ({
    status: 'idle',
    lastRequestedFrame: null,
    lastCompletedFrame: null,
    renderCycle: 0,
    lastRenderedLayerIds: [],
    runtimeBackedLayerIds: [],
    lastGraphResults: [],
    lastLayerSnapshots: [],
    lastMaterializedAssets: [],
    lastPlanIssues: [],
    lastError: null,
  });

const createInitialPreviewState = (): VizSessionPreviewState => ({
  transport: vizSessionHost.getSnapshot().transport,
  runtimeInspection: createInitialRuntimeInspectionState(),
});

const createInitialHistoryState = (): VizSessionHistoryState => ({
  isNodeEditorFocused: false,
  activeGestureId: null,
});

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

export const vizSessionHost = createVizSessionHost({
  actor: { kind: 'user', id: 'viz-studio' },
  initialProject: {
    project: createEmptyVizProjectDocument(),
    resolvedAssets: [],
    resolvedArtifacts: [],
    source: {
      kind: 'memory',
      label: 'Viz Studio working project',
    },
  },
  componentRegistry: runtimeComponentRegistry,
  services: {
    audioFeatureBakeJobs,
  },
  normalizeProject: (projectDocument) =>
    applyVizComponentDefaultAssets(
      projectDocument,
      (componentId) => runtimeComponentRegistry.get(componentId),
    ),
  onTransportStateChange: (transport) => {
    vizSessionStore.setState((state) => ({
      ...state,
      preview: {
        ...state.preview,
        transport,
      },
    }));
  },
  onAudioSessionStateChange: (session, diagnostics) => {
    vizSessionStore.setState((state) => ({
      ...state,
      audio: {
        ...state.audio,
        session,
        diagnostics,
      },
    }));
  },
});

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
          })
        : null;
    })
    .filter((layer): layer is NonNullable<typeof layer> => layer !== null);

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

const createInitialAudioState = (): VizSessionAudioState => ({
  session: vizSessionHost.getSnapshot().audioSession,
  diagnostics: vizSessionHost.getSnapshot().audioDiagnostics,
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
  history: createInitialHistoryState(),
});

interface PersistedVizProjectState {
  projectDocument: VizProjectDocument;
}

export const vizSessionStore = createStore<VizSessionState>()(
  persist<VizSessionState, [], [], PersistedVizProjectState>(
    () => createInitialState(),
    {
      name: `viz-project-${VIZ_PROJECT_SCHEMA_VERSION}`,
      storage: createJSONStorage(createSessionStorage),
      partialize: (state) => ({
        projectDocument: state.project.workingProject,
      }),
      merge: (persistedState, currentState) => {
        const persistedDocument = (
          persistedState as Partial<PersistedVizProjectState>
        )?.projectDocument;
        const persistedProject =
          persistedDocument &&
          validateProjectDocument(persistedDocument).ok
            ? persistedDocument
            : currentState.project.workingProject;

        return {
          ...currentState,
          project: {
            initialized: false,
            revision: 0,
            sourceProject: null,
            workingProject: persistedProject,
          },
        };
      },
    },
  ),
);

const getProjectState = () => vizSessionStore.getState().project;
const getGraphNetworks = () =>
  getProjectedNodeNetworks(vizSessionStore.getState());
const getHistoryState = () => vizSessionStore.getState().history;
const getPreviewState = () => vizSessionStore.getState().preview;
const getAudioState = () => vizSessionStore.getState().audio;

const replaceProjectState = (project: VizSessionProjectState) => {
  vizSessionStore.setState((state) => ({
    ...state,
    project,
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
  const networks = getGraphNetworks();
  if (openNetwork && !networks[openNetwork]) {
    useNodeNetworkStore.getState().setOpenNetwork(null);
  }
};

const applyProjectActions = (
  actions: VizProjectAction[],
  options: {
    syncLayerProjections?: boolean;
  } = {},
) => {
  const result = vizSessionHost.applyActions(actions);
  if (!result.ok) {
    throw new Error(
      result.errors.map((error) => error.message).join('; ') ||
        'Viz project action failed',
    );
  }

  const canonicalProject = clone(result.project);
  if (options.syncLayerProjections !== false) {
    syncProjectedStoresFromProject(canonicalProject);
  }
  const projectState = getProjectState();
  resetVizSessionSelectorCaches();
  replaceProjectState({
    initialized: true,
    revision: vizSessionHost.getSnapshot().session.revision,
    sourceProject: projectState.sourceProject ?? clone(canonicalProject),
    workingProject: canonicalProject,
  });
};

const syncProjectSessionProject = () => {
  const project = vizSessionHost.getWorkingProject();
  syncProjectedStoresFromProject(project);
  resetVizSessionSelectorCaches();
  replaceProjectState({
    ...getProjectState(),
    initialized: true,
    revision: vizSessionHost.getSnapshot().session.revision,
    workingProject: project,
  });
  syncNetworkOpenState();
};

export const vizControl = createVizControl({
  host: vizSessionHost,
  actor: { kind: 'agent', id: 'viz-studio-live-control' },
  onProjectChange: (_snapshot, reason) => {
    if (reason === 'load') {
      const project = vizSessionHost.getWorkingProject();
      syncProjectedStoresFromProject(project);
      resetVizSessionSelectorCaches();
      replaceProjectState({
        initialized: true,
        revision: vizSessionHost.getSnapshot().session.revision,
        sourceProject: clone(project),
        workingProject: clone(project),
      });
      syncNetworkOpenState();
      return;
    }

    syncProjectSessionProject();
  },
});

const runProjectHistoryGroup = (mutation: () => void) => {
  vizSessionHost.beginHistoryGroup();
  try {
    mutation();
  } finally {
    vizSessionHost.endHistoryGroup();
    syncProjectSessionProject();
  }
};

const createGraphUpsertActions = (
  graphId: string,
  network: NodeNetwork,
): VizProjectAction[] => {
  const graph = nodeNetworkToVizGraph(graphId, network);
  const exists = (getProjectState().workingProject.graphs ?? []).some(
    (candidate) => candidate.id === graphId,
  );
  const actions: VizProjectAction[] = exists
    ? [{ type: 'graph.replace', payload: { graphId, graph } }]
    : [
        {
          type: 'graph.create',
          payload: { graphId, name: graph.name },
        },
        { type: 'graph.replace', payload: { graphId, graph } },
      ];
  const separatorIndex = graphId.indexOf(':');
  if (separatorIndex !== -1) {
    const layerId = graphId.slice(0, separatorIndex);
    const inputKey = graphId.slice(separatorIndex + 1);
    if (
      getProjectState().workingProject.layers.some(
        (layer) => layer.id === layerId,
      )
    ) {
      actions.push({
        type: 'layer.input.set',
        payload: {
          layerId,
          inputKey,
          valueSource: {
            kind: 'graph-output',
            graphId,
            output: 'value',
          },
        },
      });
    }
  }
  return actions;
};

const commitGraphNetwork = (graphId: string, network: NodeNetwork) => {
  applyProjectActions(createGraphUpsertActions(graphId, network), {
    syncLayerProjections: false,
  });
  syncNetworkOpenState();
};

const removeGraphNetwork = (graphId: string) => {
  if (
    !(getProjectState().workingProject.graphs ?? []).some(
      (graph) => graph.id === graphId,
    )
  ) {
    return;
  }
  applyProjectActions(
    [{ type: 'graph.remove', payload: { graphId } }],
    { syncLayerProjections: false },
  );
  syncNetworkOpenState();
};

const commitGraphNetworks = (networks: Record<string, NodeNetwork>) => {
  const nextNetworks = cloneNetworks(networks);
  const nextIds = new Set(Object.keys(nextNetworks));
  const actions: VizProjectAction[] = [];
  const currentGraphs = getProjectState().workingProject.graphs ?? [];
  const currentGraphsById = new Map(
    currentGraphs.map((graph) => [graph.id, graph]),
  );
  for (const graph of currentGraphs) {
    if (isEditorAuthoredGraph(graph) && !nextIds.has(graph.id)) {
      actions.push({
        type: 'graph.remove',
        payload: { graphId: graph.id },
      });
    }
  }
  for (const [graphId, network] of Object.entries(nextNetworks)) {
    const existingGraph = currentGraphsById.get(graphId);
    if (!existingGraph || isEditorAuthoredGraph(existingGraph)) {
      actions.push(...createGraphUpsertActions(graphId, network));
    }
  }
  if (actions.length > 0) {
    applyProjectActions(actions, { syncLayerProjections: false });
  }
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
    if (nextParameterId && getGraphNetworks()[sourceParameterId]) {
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
      const existingNetwork = getGraphNetworks()[parameterId];
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

const buildBundledTrackUrl = (filename: string) => `/music/${filename}`;

const loadProjectIntoVizSessionHost = (project: VizProjectDocument) => {
  vizSessionHost.loadProject({
    project,
    resolvedAssets: [],
    resolvedArtifacts: [],
    source: {
      kind: 'memory',
      label: project.name,
    },
  });
};

export const vizSessionActions = {
  inspection: {
    project() {
      const snapshot = vizSessionHost.getSnapshot().session;
      return {
        revision: snapshot.revision,
        project: snapshot.workingProject,
        validation: validateProjectDocument(snapshot.workingProject),
        issues: snapshot.issues,
        actionHistory: snapshot.actionHistory,
        canUndo: snapshot.canUndo,
        canRedo: snapshot.canRedo,
      };
    },
    graph(graphId: string) {
      const project = vizSessionHost.getWorkingProject();
      const graph = project.graphs?.find((candidate) => candidate.id === graphId);
      const runtime = getPreviewState().runtimeInspection.lastGraphResults.find(
        (result) => result.graphId === graphId,
      );
      return {
        graph: graph ? structuredClone(graph) : undefined,
        runtime: runtime ? structuredClone(runtime) : undefined,
      };
    },
    runtime() {
      return vizSessionActions.preview.inspectRuntimePreview();
    },
    assets() {
      const project = vizSessionHost.getWorkingProject();
      return {
        assetRefs: structuredClone(project.assetRefs ?? []),
        artifactRefs: structuredClone(project.artifactRefs ?? []),
        materializedAssets: structuredClone(
          getPreviewState().runtimeInspection.lastMaterializedAssets,
        ),
      };
    },
  },
  project: {
    initializeProjectState(force = false) {
      const state = getProjectState();
      if (state.initialized) {
        const project = applyVizComponentDefaultAssets(
          state.workingProject,
          (componentId) =>
            runtimeComponentRegistry.get(componentId),
        );
        syncProjectedStoresFromProject(project);
        resetVizSessionSelectorCaches();
        vizSessionHost.setTransportDurationFrames(
          project.timeline.durationInFrames,
        );
        if (force || project !== state.workingProject) {
          loadProjectIntoVizSessionHost(project);
          replaceProjectState({
            ...state,
            revision: vizSessionHost.getSnapshot().session.revision,
            sourceProject:
              state.sourceProject === null
                ? null
                : clone(
                    applyVizComponentDefaultAssets(
                      state.sourceProject,
                      (componentId) =>
                        runtimeComponentRegistry.get(componentId),
                    ),
                  ),
            workingProject: clone(project),
          });
        }
        return;
      }

      const project = applyVizComponentDefaultAssets(
        state.workingProject.schemaVersion === VIZ_PROJECT_SCHEMA_VERSION
          ? state.workingProject
          : createEmptyVizProjectDocument(),
        (componentId) => runtimeComponentRegistry.get(componentId),
      );
      syncProjectedStoresFromProject(project);
      resetVizSessionSelectorCaches();
      loadProjectIntoVizSessionHost(project);
      replaceProjectState({
        initialized: true,
        revision: vizSessionHost.getSnapshot().session.revision,
        sourceProject: clone(project),
        workingProject: clone(project),
      });
    },
    importWorkingProject(project: VizProjectDocument) {
      assertValidProjectDocument(project);
      const canonicalProject = applyVizComponentDefaultAssets(
        project,
        (componentId) => runtimeComponentRegistry.get(componentId),
      );
      syncProjectedStoresFromProject(canonicalProject);
      resetVizSessionSelectorCaches();
      loadProjectIntoVizSessionHost(canonicalProject);
      replaceProjectState({
        initialized: true,
        revision: vizSessionHost.getSnapshot().session.revision,
        sourceProject: clone(canonicalProject),
        workingProject: clone(canonicalProject),
      });
      syncNetworkOpenState();
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

      runProjectHistoryGroup(() => {
        applyProjectActions([
          {
            type: 'layer.create',
            payload: {
              layerId: layer.id,
              layer,
            },
          },
        ]);
        createDefaultNetworksForLayer(layer);
      });
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

      runProjectHistoryGroup(() => {
        removeNetworksForLayer(currentLayer);
        useEditorStore.getState().pruneLayerUi(
          getProjectState().workingProject.layerOrder.filter(
            (id) => id !== layerId,
          ),
        );
        applyProjectActions([
          {
            type: 'layer.remove',
            payload: { layerId },
          },
        ]);
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

      runProjectHistoryGroup(() => {
        applyProjectActions([
          {
            type: 'layer.create',
            payload: {
              layerId: duplicatedLayer.id,
              layer: duplicatedLayer,
            },
          },
        ]);
        duplicateNetworksForLayer(sourceLayer, duplicatedLayer);
      });
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
      applyProjectActions([
        {
          type: 'layer.move',
          payload: {
            layerId: activeId,
            index: nextIndex,
          },
        },
      ]);
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
      const layer = getProjectState().workingProject.layers.find(
        (candidate) => candidate.id === layerId,
      );
      if (!layer) {
        return;
      }
      applyProjectActions([
        {
          type: 'layer.replace',
          payload: {
            layerId,
            layer: applyEditorLayerSettings(layer, settings),
          },
        },
      ]);
    },
    updateLayerValue(
      layerId: string,
      path: (string | number)[],
      value: any,
    ) {
      if (!getProjectState().initialized) {
        vizSessionActions.project.initializeProjectState();
      }
      applyProjectActions([
        {
          type: 'layer.settings.set',
          payload: {
            layerId,
            path: path.join('.'),
            value,
          },
        },
      ]);
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

      runProjectHistoryGroup(() => {
        applyPresetNetworksForLayer(currentLayer, preset);
        applyProjectActions([
          {
            type: 'layer.replace',
            payload: {
              layerId,
              layer: {
                ...currentLayer,
                settings: clone(preset.values),
              },
            },
          },
        ]);
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
      return cloneNetworks(getGraphNetworks());
    },
    reset() {
      commitGraphNetworks({});
    },
    setNetwork(parameterId: string, network: NodeNetwork) {
      commitGraphNetwork(
        parameterId,
        cloneNetworks({ [parameterId]: network })[parameterId],
      );
    },
    setNetworkEnabled(parameterId: string, isEnabled: boolean, type: VType) {
      if (!getGraphNetworks()[parameterId]) {
        if (!isEnabled) {
          return;
        }

        vizSessionActions.graph.createNetworkForParameter(parameterId, type);
        return;
      }

      commitGraphNetwork(parameterId, {
        ...getGraphNetworks()[parameterId],
        isEnabled,
      });
    },
    addNodeToNetwork(parameterId: string, node: GraphNode) {
      const existingNetwork = getGraphNetworks()[parameterId];
      if (!existingNetwork) {
        return;
      }

      commitGraphNetwork(parameterId, {
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
      });
    },
    setNodesInNetwork(parameterId: string, nodes: GraphNode[]) {
      const network = getGraphNetworks()[parameterId];
      if (!network) {
        return;
      }

      commitGraphNetwork(parameterId, {
        ...network,
        nodes,
      });
    },
    setEdgesInNetwork(parameterId: string, edges: Edge[]) {
      const network = getGraphNetworks()[parameterId];
      if (!network) {
        return;
      }

      commitGraphNetwork(parameterId, {
        ...network,
        edges,
      });
    },
    createNetworkForParameter(parameterId: string, type: VType) {
      commitGraphNetwork(parameterId, createEmptyNetwork(parameterId, type));
    },
    removeNetworkForParameter(parameterId: string) {
      if (!getGraphNetworks()[parameterId]) {
        return;
      }

      removeGraphNetwork(parameterId);
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
      const network = getGraphNetworks()[parameterId];
      if (!network) {
        return;
      }

      commitGraphNetwork(parameterId, {
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
      });
    },
    duplicateNetwork(fromParameterId: string, toParameterId: string) {
      const sourceNetwork = getGraphNetworks()[fromParameterId];
      if (!sourceNetwork) {
        return;
      }

      commitGraphNetwork(
        toParameterId,
        duplicateNetworkGraph(
          fromParameterId,
          toParameterId,
          sourceNetwork,
        ),
      );
    },
    clearStaleNetworks(validParameterIds?: Iterable<string>) {
      const validIds = new Set(validParameterIds ?? []);

      if (validIds.size === 0 && typeof window !== 'undefined') {
        try {
          getProjectState().workingProject.layers.forEach((layer) => {
            const comp = resolveComp(layer);
            if (comp) {
              const config = assignDeterministicIdsToConfig(
                layer.id,
                comp.config.clone(),
              );
              const parameterIds = getParameterIdsFromConfig(config);
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
        Object.entries(getGraphNetworks()).filter(([parameterId]) =>
          validIds.has(parameterId),
        ),
      );
      commitGraphNetworks(nextNetworks);
    },
  },
  preview: {
    play() {
      vizSessionHost.play();
    },
    pause() {
      vizSessionHost.pause();
    },
    togglePlayback() {
      vizSessionHost.togglePlayback();
    },
    seekToFrame(frame: number) {
      vizSessionHost.seekToFrame(frame);
    },
    seekToSeconds(seconds: number) {
      const fps =
        getPreviewState().transport.fps > 0
          ? getPreviewState().transport.fps
          : DEFAULT_FPS;
      vizSessionHost.seekToFrame(Math.floor(seconds * fps));
    },
    syncCurrentFrame(frame: number) {
      if (frame === getPreviewState().transport.currentFrame) {
        return;
      }
      vizSessionHost.seekToFrame(frame);
    },
    setDurationFrames(durationFrames: number) {
      vizSessionHost.setTransportDurationFrames(durationFrames);
      const project = getProjectState().workingProject;
      if (
        Number.isInteger(durationFrames) &&
        durationFrames > 0 &&
        project.timeline.durationInFrames !== durationFrames
      ) {
        applyProjectActions(
          [
            {
              type: 'timeline.set',
              payload: {
                timeline: {
                  ...project.timeline,
                  durationInFrames: durationFrames,
                },
              },
            },
          ],
          { syncLayerProjections: false },
        );
      }
    },
    reset() {
      vizSessionHost.pause();
      vizSessionHost.seekToFrame(0);
      vizSessionHost.setTransportDurationFrames(DEFAULT_DURATION_FRAMES);
      replacePreviewState({
        ...getPreviewState(),
        transport: vizSessionHost.getSnapshot().transport,
        runtimeInspection: createInitialRuntimeInspectionState(),
      });
      resetVizSessionRuntimePreviewPlanCache();
    },
    renderRuntimePreviewFrame(
      frame: VizSessionRuntimePreviewFrame,
      providedAudioFrameData?: VizSessionRuntimePreviewAudioFrameData,
    ) {
      try {
        const attachmentStore =
          useEditorRuntimePreviewAttachmentStore.getState();
        const projectState = getProjectState();
        const analyzer = useAudioEngineStore.getState().audioAnalyzer;
        const audioFrameData =
          providedAudioFrameData ??
          (() => {
            const frequencyData = new Uint8Array(
              analyzer?.frequencyBinCount ?? 0,
            );
            const timeDomainData = new Uint8Array(
              analyzer?.frequencyBinCount ?? 0,
            );
            analyzer?.getByteFrequencyData(frequencyData);
            analyzer?.getByteTimeDomainData(timeDomainData);
            return {
              frequencyData,
              timeDomainData,
              sampleRate: analyzer?.context.sampleRate ?? 44100,
              fftSize: analyzer?.fftSize ?? 2048,
            };
          })();
        const viewport = attachmentStore.getPreviewViewport() ?? {
          width: projectState.workingProject.viewport.width,
          height: projectState.workingProject.viewport.height,
        };
        const renderPlan = createVizSessionRuntimePreviewPlan({
          project: projectState.workingProject,
          projectRevision: projectState.revision,
          frame,
          viewport,
          audioFrameData,
          isPlaying: getPreviewState().transport.isPlaying,
        });
        const lastRenderedLayerIds = attachmentStore.renderRuntimePlan(
          frame,
          audioFrameData,
          renderPlan,
        );
        const runtimeBackedLayerIds = [...lastRenderedLayerIds];
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
            lastGraphResults: structuredClone(
              renderPlan.graphResults,
            ),
            lastLayerSnapshots: structuredClone(renderPlan.layers),
            lastMaterializedAssets: structuredClone(
              renderPlan.materializedAssets,
            ),
            lastPlanIssues: structuredClone(renderPlan.issues),
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
        lastGraphResults: structuredClone(
          state.preview.runtimeInspection.lastGraphResults,
        ),
        lastLayerSnapshots: structuredClone(
          state.preview.runtimeInspection.lastLayerSnapshots,
        ),
        lastMaterializedAssets: structuredClone(
          state.preview.runtimeInspection.lastMaterializedAssets,
        ),
        lastPlanIssues: structuredClone(
          state.preview.runtimeInspection.lastPlanIssues,
        ),
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
      vizSessionHost.attachAudioSource({
        kind: 'media-element',
        id: filename,
        label: filename,
        uri: url,
      });
      vizSessionActions.preview.seekToFrame(0);
      replaceAudioState({
        ...getAudioState(),
        session: vizSessionHost.getSnapshot().audioSession,
        diagnostics: vizSessionHost.getSnapshot().audioDiagnostics,
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
      vizSessionHost.attachAudioSource({
        kind: 'file',
        id: `${audioFile.name}:${audioFile.lastModified}`,
        label: audioFile.name,
        uri: objectUrl,
      });
      vizSessionActions.preview.seekToFrame(0);
      replaceAudioState({
        ...getAudioState(),
        session: vizSessionHost.getSnapshot().audioSession,
        diagnostics: vizSessionHost.getSnapshot().audioDiagnostics,
        audioFile,
        currentTrackUrl: objectUrl,
        currentTrackIndex: -1,
        currentTime: 0,
        visualTime: 0,
      });
    },
    attachCapturedStream(label: string) {
      vizSessionHost.attachAudioSource({
        kind: 'stream',
        id: 'captured-tab-audio',
        label,
      });
      vizSessionActions.preview.seekToFrame(0);
      replaceAudioState({
        ...getAudioState(),
        session: vizSessionHost.getSnapshot().audioSession,
        diagnostics: vizSessionHost.getSnapshot().audioDiagnostics,
        currentTime: 0,
        visualTime: 0,
      });
    },
    detachCapturedStream() {
      const { currentTrackUrl } = getAudioState();
      vizSessionHost.clearAudioSource();
      vizSessionHost.setLiveInputAvailable(false);
      vizSessionHost.setAudioAnalyzerState('idle');
      vizSessionActions.preview.seekToFrame(0);

      replaceAudioState({
        ...getAudioState(),
        session: vizSessionHost.getSnapshot().audioSession,
        diagnostics: vizSessionHost.getSnapshot().audioDiagnostics,
        currentTime: 0,
        visualTime: 0,
      });

      if (currentTrackUrl) {
        useAudioEngineStore.getState().restoreElementUrl(currentTrackUrl);
        vizSessionHost.attachAudioSource({
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
          session: vizSessionHost.getSnapshot().audioSession,
          diagnostics: vizSessionHost.getSnapshot().audioDiagnostics,
        });
      } else {
        useAudioEngineStore.getState().clearElementSource();
      }
    },
    setAnalyzerState(analyzerState: VizEditorAudioAnalyzerState) {
      vizSessionHost.setAudioAnalyzerState(analyzerState);
    },
    setLiveInputAvailable(liveInputAvailable: boolean) {
      vizSessionHost.setLiveInputAvailable(liveInputAvailable);
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
      vizSessionHost.clearAudioSource();
      vizSessionHost.setLiveInputAvailable(false);
      vizSessionHost.setAudioAnalyzerState('idle');
      useAudioEngineStore.getState().clearElementSource();
      vizSessionActions.preview.seekToFrame(0);
      replaceAudioState({
        ...getAudioState(),
        session: vizSessionHost.getSnapshot().audioSession,
        diagnostics: vizSessionHost.getSnapshot().audioDiagnostics,
        audioFile: null,
        currentTrackUrl: null,
        currentTrackIndex: -1,
        currentTime: 0,
        visualTime: 0,
      });
    },
    reset() {
      vizSessionHost.clearAudioSource();
      vizSessionHost.setLiveInputAvailable(false);
      vizSessionHost.setAudioAnalyzerState('idle');
      replaceAudioState({
        session: vizSessionHost.getSnapshot().audioSession,
        diagnostics: vizSessionHost.getSnapshot().audioDiagnostics,
        audioFile: null,
        currentTrackUrl: null,
        trackList: [],
        currentTrackIndex: -1,
        currentTime: 0,
        visualTime: 0,
      });
    },
    attachSource(source: VizEditorAudioSource) {
      vizSessionHost.attachAudioSource(source);
      replaceAudioState({
        ...getAudioState(),
        session: vizSessionHost.getSnapshot().audioSession,
        diagnostics: vizSessionHost.getSnapshot().audioDiagnostics,
      });
    },
    clearSource() {
      vizSessionHost.clearAudioSource();
      replaceAudioState({
        ...getAudioState(),
        session: vizSessionHost.getSnapshot().audioSession,
        diagnostics: vizSessionHost.getSnapshot().audioDiagnostics,
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
    undo() {
      if (!vizSessionHost.canUndo()) {
        return;
      }
      vizSessionHost.undo();
      syncProjectSessionProject();
      toast.success('Undo', { duration: 1500 });
    },
    redo() {
      if (!vizSessionHost.canRedo()) {
        return;
      }
      vizSessionHost.redo();
      syncProjectSessionProject();
      toast.success('Redo', { duration: 1500 });
    },
    undoNodeEditor(networkId: string) {
      void networkId;
      vizSessionActions.history.undo();
    },
    redoNodeEditor(networkId: string) {
      void networkId;
      vizSessionActions.history.redo();
    },
    canUndo() {
      return vizSessionHost.canUndo();
    },
    canRedo() {
      return vizSessionHost.canRedo();
    },
    startNodeDrag(networkId: string) {
      vizSessionHost.beginHistoryGroup();
      replaceHistoryState({
        ...getHistoryState(),
        activeGestureId: networkId,
      });
    },
    endNodeDrag(networkId: string) {
      if (getHistoryState().activeGestureId === networkId) {
        vizSessionHost.endHistoryGroup();
        replaceHistoryState({
          ...getHistoryState(),
          activeGestureId: null,
        });
      }
    },
    setNodeEditorFocused(isNodeEditorFocused: boolean) {
      replaceHistoryState({
        ...getHistoryState(),
        isNodeEditorFocused,
      });
    },
    reset() {
      replaceHistoryState(createInitialHistoryState());
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
