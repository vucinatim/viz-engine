import {
  studioComponentRegistry,
  studioNodeRegistry,
} from '@/lib/viz-capabilities';
import type {
  VizProjectAction,
  VizProjectDocument,
} from '@viz-engine/contracts';
import {
  createVizControl,
  createVizSessionHost,
} from '@viz-engine/editor-control';
import { applyVizComponentDefaultAssets } from '@viz-engine/runtime';

import { useNodeNetworkStore } from '@/components/node-network/node-network-store';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';

import { createStudioAudioActions } from './audio-actions';
import { createStudioBrowserAssetAttachment } from './browser-asset-attachment';
import { createStudioBrowserJobServices } from './browser-job-services';
import { createStudioGraphAuthoringActions } from './graph-authoring-actions';
import { createStudioHistoryActions } from './history-actions';
import { createStudioInspectionActions } from './inspection-actions';
import { createStudioPreviewActions } from './preview-actions';
import { createStudioProjectActions } from './project-actions';
import { createEmptyVizProjectDocument } from './project-document';
import { syncEditorProjection } from './project-projection';
import {
  getProjectedNodeNetworks,
  resetVizSessionSelectorCaches,
} from './selectors';
import { createStudioSessionStore } from './session-state';
import type {
  VizSessionAudioState,
  VizSessionHistoryState,
  VizSessionPreviewState,
  VizSessionProjectState,
} from './types';

const runtimeComponentRegistry = studioComponentRegistry;
const { audioFeatureBakeJobs, renderJobs } = createStudioBrowserJobServices({
  getHost: () => vizSessionHost,
  getProjectState: () => getProjectState(),
  renderRuntimePreviewFrame: (frame, audio) =>
    vizSessionActions.preview.renderRuntimePreviewFrame(frame, audio),
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

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
  nodeRegistry: studioNodeRegistry,
  services: {
    audioFeatureBakeJobs,
    renderJobs,
  },
  normalizeProject: (projectDocument) =>
    applyVizComponentDefaultAssets(projectDocument, (componentId) =>
      runtimeComponentRegistry.get(componentId),
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

let runtimePreviewResourceCache:
  | {
      resourceRevision: number;
      resolvedAssets: ReturnType<
        typeof vizSessionHost.getProjectResources
      >['resolvedAssets'];
      resolvedArtifacts: ReturnType<
        typeof vizSessionHost.getProjectResources
      >['resolvedArtifacts'];
    }
  | undefined;

const getRuntimePreviewResources = () => {
  const resourceRevision = vizSessionHost.getResourceRevision();

  if (
    !runtimePreviewResourceCache ||
    runtimePreviewResourceCache.resourceRevision !== resourceRevision
  ) {
    const resources = vizSessionHost.getProjectResources();
    runtimePreviewResourceCache = {
      resourceRevision,
      resolvedAssets: resources.resolvedAssets,
      resolvedArtifacts: resources.resolvedArtifacts,
    };
  }

  return runtimePreviewResourceCache;
};

export const vizSessionStore = createStudioSessionStore(vizSessionHost);

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

  const canonicalProject =
    vizSessionHost.getWorkingProjectView() as VizProjectDocument;
  if (options.syncLayerProjections !== false) {
    syncEditorProjection(canonicalProject);
  }
  const projectState = getProjectState();
  resetVizSessionSelectorCaches();
  replaceProjectState({
    initialized: true,
    revision: vizSessionHost.getProjectRevision(),
    sourceProject: projectState.sourceProject ?? clone(canonicalProject),
    workingProject: canonicalProject,
  });
};

const syncProjectSessionProject = () => {
  const project = vizSessionHost.getWorkingProjectView() as VizProjectDocument;
  syncEditorProjection(project);
  resetVizSessionSelectorCaches();
  replaceProjectState({
    ...getProjectState(),
    initialized: true,
    revision: vizSessionHost.getProjectRevision(),
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
      const audioSource = vizSessionHost.getSnapshot().audioSession.source;
      if (audioSource?.uri) {
        useAudioEngineStore.getState().loadAudioUrl(audioSource.uri);
      } else {
        useAudioEngineStore.getState().clearElementSource();
      }
      syncEditorProjection(project);
      resetVizSessionSelectorCaches();
      replaceProjectState({
        initialized: true,
        revision: vizSessionHost.getProjectRevision(),
        sourceProject: clone(project),
        workingProject: clone(project),
      });
      replaceAudioState({
        ...getAudioState(),
        session: vizSessionHost.getSnapshot().audioSession,
        diagnostics: vizSessionHost.getSnapshot().audioDiagnostics,
        audioFile: null,
        currentTrackUrl: audioSource?.uri ?? null,
        currentTrackIndex: -1,
        currentTime: 0,
        visualTime: 0,
      });
      syncNetworkOpenState();
      return;
    }

    syncProjectSessionProject();
  },
});

const studioGraphAuthoringActions = createStudioGraphAuthoringActions({
  host: vizSessionHost,
  getProject: () => getProjectState().workingProject,
  getNetworks: getGraphNetworks,
  applyActions: (actions) =>
    applyProjectActions(actions, { syncLayerProjections: false }),
  syncProject: syncProjectSessionProject,
  syncOpenNetwork: syncNetworkOpenState,
});
const studioBrowserAssetAttachment = createStudioBrowserAssetAttachment({
  host: vizSessionHost,
});
const studioProjectActions = createStudioProjectActions({
  host: vizSessionHost,
  componentRegistry: runtimeComponentRegistry,
  graphActions: studioGraphAuthoringActions,
  getState: getProjectState,
  replaceState: replaceProjectState,
  applyActions: applyProjectActions,
  syncProject: syncProjectSessionProject,
  syncOpenNetwork: syncNetworkOpenState,
  assetAttachment: studioBrowserAssetAttachment,
});
const studioPreviewActions = createStudioPreviewActions({
  host: vizSessionHost,
  getProjectState,
  getState: getPreviewState,
  replaceState: replacePreviewState,
  getResources: getRuntimePreviewResources,
  applyProjectActions,
});
const studioAudioActions = createStudioAudioActions({
  host: vizSessionHost,
  getState: getAudioState,
  replaceState: replaceAudioState,
  seekToFrame: (frame) => vizSessionHost.seekToFrame(frame),
});
const studioHistoryActions = createStudioHistoryActions({
  host: vizSessionHost,
  getState: getHistoryState,
  replaceState: replaceHistoryState,
  syncProject: syncProjectSessionProject,
});
const studioInspectionActions = createStudioInspectionActions({
  host: vizSessionHost,
  inspectRuntime: studioPreviewActions.inspectRuntimePreview,
});

export const vizSessionActions = {
  inspection: studioInspectionActions,
  project: studioProjectActions,
  graph: studioGraphAuthoringActions,
  preview: studioPreviewActions,
  audio: studioAudioActions,
  history: studioHistoryActions,
};

export const getVizSessionState = () => vizSessionStore.getState();
