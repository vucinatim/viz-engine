import type { Comp } from '@/components/config/create-component';
import { safeVTypeToNodeHandleType } from '@/components/config/node-types';
import type { LayerSettings } from '@/components/editor/layer-settings';
import { getPresetById } from '@/components/node-network/presets';
import {
  assignDeterministicIdsToConfig,
  getParameterIdsFromConfig,
} from '@/lib/comp-utils/config-utils';
import { generateLayerId } from '@/lib/id-utils';
import useEditorStore from '@/lib/stores/editor-store';
import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizComponentRegistry,
  type VizLayer,
  type VizProjectAction,
  type VizProjectDocument,
} from '@viz-engine/contracts';
import type { VizSessionHost } from '@viz-engine/editor-control';
import {
  applyVizComponentDefaultAssets,
  assertValidProjectDocument,
} from '@viz-engine/runtime';

import type {
  BrowserAssetSelection,
  StudioBrowserAssetAttachment,
} from './browser-asset-attachment';
import type { StudioGraphAuthoringActions } from './graph-authoring-actions';
import {
  applyEditorLayerSettings,
  createVizLayerFromComp,
} from './project-adapters';
import { createEmptyVizProjectDocument } from './project-document';
import {
  getEditorParameterIds,
  resolveEditorComp,
  resolveEditorOptionByPath,
  syncEditorProjection,
} from './project-projection';
import { resetVizSessionSelectorCaches } from './selectors';
import type { VizSessionProjectState } from './types';

export interface StudioLayerPreset {
  name: string;
  values: Record<string, unknown>;
  networks?: Record<string, string>;
}

export const createStudioProjectActions = ({
  host,
  componentRegistry,
  graphActions,
  getState,
  replaceState,
  applyActions,
  syncProject,
  syncOpenNetwork,
  assetAttachment,
}: {
  host: VizSessionHost;
  componentRegistry: VizComponentRegistry;
  graphActions: StudioGraphAuthoringActions;
  getState: () => VizSessionProjectState;
  replaceState: (state: VizSessionProjectState) => void;
  applyActions: (actions: VizProjectAction[]) => void;
  syncProject: () => void;
  syncOpenNetwork: () => void;
  assetAttachment: StudioBrowserAssetAttachment;
}) => {
  const normalize = (project: VizProjectDocument) =>
    applyVizComponentDefaultAssets(project, (componentId) =>
      componentRegistry.get(componentId),
    );

  const loadProject = (
    project: VizProjectDocument,
    embeddedBytes: ReadonlyMap<string, ArrayBuffer> = new Map(),
  ) => {
    const assets = assetAttachment.prepareProjectAssets(project, embeddedBytes);
    host.loadProject({
      project,
      resolvedAssets: assets.resolvedAssets,
      resolvedArtifacts: [],
      source: {
        kind: 'memory',
        label: project.name,
      },
    });
    void assets.restoreMissing();
  };

  const runHistoryGroup = (mutation: () => void) => {
    host.beginHistoryGroup();
    try {
      mutation();
    } finally {
      host.endHistoryGroup();
      syncProject();
    }
  };

  const createDefaultNetworks = (layer: VizLayer) => {
    const comp = resolveEditorComp(layer);
    if (!comp?.defaultNetworks) {
      return;
    }

    for (const [path, presetOrId] of Object.entries(comp.defaultNetworks)) {
      const option = resolveEditorOptionByPath(comp, layer.id, path);
      const preset =
        typeof presetOrId === 'string' ? getPresetById(presetOrId) : presetOrId;
      if (option && preset) {
        graphActions.applyPresetDefinition(
          option.id,
          preset,
          safeVTypeToNodeHandleType(option.type),
        );
      }
    }
  };

  const removeNetworks = (layer: VizLayer) => {
    getEditorParameterIds(layer).forEach(
      graphActions.removeNetworkForParameter,
    );
  };

  const duplicateNetworks = (sourceLayer: VizLayer, nextLayer: VizLayer) => {
    const sourceComp = resolveEditorComp(sourceLayer);
    const nextComp = resolveEditorComp(nextLayer);
    if (!sourceComp || !nextComp) {
      return;
    }

    const sourceIds = getParameterIdsFromConfig(
      assignDeterministicIdsToConfig(sourceLayer.id, sourceComp.config.clone()),
    );
    const nextIds = getParameterIdsFromConfig(
      assignDeterministicIdsToConfig(nextLayer.id, nextComp.config.clone()),
    );
    const graphIds = new Set(
      (getState().workingProject.graphs ?? []).map((graph) => graph.id),
    );

    sourceIds.forEach((sourceId, index) => {
      const nextId = nextIds[index];
      if (nextId && graphIds.has(sourceId)) {
        graphActions.duplicateNetwork(sourceId, nextId);
      }
    });
  };

  const applyPresetNetworks = (layer: VizLayer, preset: StudioLayerPreset) => {
    const comp = resolveEditorComp(layer);
    if (!comp) {
      return;
    }

    const presetPaths = new Set(Object.keys(preset.networks ?? {}));
    const graphIds = new Set(
      (getState().workingProject.graphs ?? []).map((graph) => graph.id),
    );
    getEditorParameterIds(layer).forEach((parameterId) => {
      const path = parameterId.split(':').slice(1).join('.');
      if (!presetPaths.has(path) && graphIds.has(parameterId)) {
        graphActions.setGraphEnabled(parameterId, false);
      }
    });

    for (const [path, presetId] of Object.entries(preset.networks ?? {})) {
      const option = resolveEditorOptionByPath(comp, layer.id, path);
      if (option) {
        graphActions.applyPresetToNetwork(
          option.id,
          presetId,
          safeVTypeToNodeHandleType(option.type),
        );
      }
    }
  };

  const actions = {
    initializeProjectState(force = false) {
      const state = getState();
      if (state.initialized) {
        const project = normalize(state.workingProject);
        syncEditorProjection(project);
        resetVizSessionSelectorCaches();
        host.setTransportDurationFrames(project.timeline.durationInFrames);
        if (force || project !== state.workingProject) {
          loadProject(project);
          replaceState({
            ...state,
            revision: host.getSnapshot().session.revision,
            sourceProject:
              state.sourceProject === null
                ? null
                : structuredClone(normalize(state.sourceProject)),
            workingProject: structuredClone(project),
          });
        }
        return;
      }

      const project = normalize(
        state.workingProject.schemaVersion === VIZ_PROJECT_SCHEMA_VERSION
          ? state.workingProject
          : createEmptyVizProjectDocument(),
      );
      syncEditorProjection(project);
      resetVizSessionSelectorCaches();
      loadProject(project);
      replaceState({
        initialized: true,
        revision: host.getSnapshot().session.revision,
        sourceProject: structuredClone(project),
        workingProject: structuredClone(project),
      });
    },
    importWorkingProject(
      project: VizProjectDocument,
      embeddedBytes: ReadonlyMap<string, ArrayBuffer> = new Map(),
    ) {
      assertValidProjectDocument(project);
      const canonicalProject = normalize(project);
      syncEditorProjection(canonicalProject);
      resetVizSessionSelectorCaches();
      loadProject(canonicalProject, embeddedBytes);
      replaceState({
        initialized: true,
        revision: host.getSnapshot().session.revision,
        sourceProject: structuredClone(canonicalProject),
        workingProject: structuredClone(canonicalProject),
      });
      syncOpenNetwork();
    },
    exportWorkingProject() {
      return structuredClone(getState().workingProject);
    },
    refreshCompDefinitions() {
      if (getState().initialized) {
        syncEditorProjection(getState().workingProject);
      }
    },
    addLayer(comp: Comp) {
      if (!getState().initialized) {
        actions.initializeProjectState();
      }
      const layer = createVizLayerFromComp(comp, generateLayerId(comp.name));
      useEditorStore.getState().setLayerExpanded(layer.id, true);
      runHistoryGroup(() => {
        applyActions([
          {
            type: 'layer.create',
            payload: { layerId: layer.id, layer },
          },
        ]);
        createDefaultNetworks(layer);
      });
    },
    removeLayer(layerId: string) {
      if (!getState().initialized) {
        actions.initializeProjectState();
      }
      const layer = getState().workingProject.layers.find(
        (candidate) => candidate.id === layerId,
      );
      if (!layer) {
        return;
      }

      runHistoryGroup(() => {
        removeNetworks(layer);
        useEditorStore
          .getState()
          .pruneLayerUi(
            getState().workingProject.layerOrder.filter(
              (candidate) => candidate !== layerId,
            ),
          );
        applyActions([{ type: 'layer.remove', payload: { layerId } }]);
      });
    },
    duplicateLayer(layerId: string) {
      if (!getState().initialized) {
        actions.initializeProjectState();
      }
      const source = getState().workingProject.layers.find(
        (layer) => layer.id === layerId,
      );
      if (!source) {
        return;
      }

      const layer: VizLayer = {
        ...structuredClone(source),
        id: generateLayerId(source.name),
        inputs: Object.fromEntries(
          Object.entries(source.inputs ?? {}).filter(
            ([, input]) => input.kind !== 'graph-output',
          ),
        ),
      };
      useEditorStore.getState().setLayerExpanded(layer.id, true);
      runHistoryGroup(() => {
        applyActions([
          {
            type: 'layer.create',
            payload: { layerId: layer.id, layer },
          },
        ]);
        duplicateNetworks(source, layer);
      });
    },
    reorderLayers(activeId: string, overId: string) {
      if (!getState().initialized) {
        actions.initializeProjectState();
      }
      if (activeId === overId) {
        return;
      }
      const project = getState().workingProject;
      const nextIndex = project.layerOrder.indexOf(overId);
      if (project.layerOrder.includes(activeId) && nextIndex !== -1) {
        applyActions([
          {
            type: 'layer.move',
            payload: { layerId: activeId, index: nextIndex },
          },
        ]);
      }
    },
    setLayerExpanded(layerId: string, expanded: boolean) {
      if (!getState().initialized) {
        actions.initializeProjectState();
      }
      useEditorStore.getState().setLayerExpanded(layerId, expanded);
      syncEditorProjection(getState().workingProject);
    },
    setAllLayersExpanded(expanded: boolean) {
      if (!getState().initialized) {
        actions.initializeProjectState();
      }
      useEditorStore
        .getState()
        .setAllLayersExpanded(getState().workingProject.layerOrder, expanded);
      syncEditorProjection(getState().workingProject);
    },
    setLayerDebugEnabled(layerId: string, enabled: boolean) {
      if (!getState().initialized) {
        actions.initializeProjectState();
      }
      useEditorStore.getState().setLayerDebugEnabled(layerId, enabled);
      syncEditorProjection(getState().workingProject);
    },
    updateLayerSettings(layerId: string, settings: LayerSettings) {
      if (!getState().initialized) {
        actions.initializeProjectState();
      }
      const layer = getState().workingProject.layers.find(
        (candidate) => candidate.id === layerId,
      );
      if (layer) {
        applyActions([
          {
            type: 'layer.replace',
            payload: {
              layerId,
              layer: applyEditorLayerSettings(layer, settings),
            },
          },
        ]);
      }
    },
    updateLayerValue(
      layerId: string,
      path: (string | number)[],
      value: unknown,
    ) {
      if (!getState().initialized) {
        actions.initializeProjectState();
      }
      applyActions([
        {
          type: 'layer.settings.set',
          payload: { layerId, path: path.join('.'), value },
        },
      ]);
    },
    async attachLayerAsset(
      layerId: string,
      path: (string | number)[],
      selection: BrowserAssetSelection,
    ) {
      if (!getState().initialized) {
        actions.initializeProjectState();
      }
      const attachment = await assetAttachment.attach(selection);
      host.registerResolvedAsset(attachment.resolved);
      const exists = (getState().workingProject.assetRefs ?? []).some(
        (asset) => asset.id === attachment.ref.id,
      );
      applyActions([
        exists
          ? {
              type: 'asset.replace',
              payload: {
                assetId: attachment.ref.id,
                asset: attachment.ref,
              },
            }
          : {
              type: 'asset.attach',
              payload: { asset: attachment.ref },
            },
        {
          type: 'layer.settings.set',
          payload: {
            layerId,
            path: path.join('.'),
            value: `asset:${attachment.ref.id}`,
          },
        },
      ]);
      return attachment.ref;
    },
    attachLayerFileAsset(
      layerId: string,
      path: (string | number)[],
      file: File,
    ) {
      return actions.attachLayerAsset(layerId, path, { kind: 'file', file });
    },
    attachLayerExternalAsset(
      layerId: string,
      path: (string | number)[],
      uri: string,
    ) {
      return actions.attachLayerAsset(layerId, path, {
        kind: 'external-uri',
        uri,
      });
    },
    applyLayerPreset(layerId: string, preset: StudioLayerPreset) {
      if (!getState().initialized) {
        actions.initializeProjectState();
      }
      const layer = getState().workingProject.layers.find(
        (candidate) => candidate.id === layerId,
      );
      if (!layer) {
        return;
      }

      runHistoryGroup(() => {
        applyPresetNetworks(layer, preset);
        applyActions([
          {
            type: 'layer.replace',
            payload: {
              layerId,
              layer: {
                ...layer,
                settings: structuredClone(preset.values),
              },
            },
          },
        ]);
      });
    },
  };

  return actions;
};

export type StudioProjectActions = ReturnType<
  typeof createStudioProjectActions
>;
