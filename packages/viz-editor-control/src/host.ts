import type { VizAudioFeatureBakeJobService } from '@viz-engine/bake';
import { createCoreComponentRegistry } from '@viz-engine/components-core';
import type {
  VizActionActor,
  VizComponentRegistry,
  VizLayer,
  VizProjectAction,
  VizProjectDocument,
  VizProjectTransaction,
  VizResolvedArtifact,
  VizResolvedAsset,
} from '@viz-engine/contracts';
import {
  createVizEditorAudioSessionController,
  createVizEditorSession,
  createVizEditorTransportController,
  type VizEditorAudioAnalyzerState,
  type VizEditorAudioSessionState,
  type VizEditorAudioSource,
  type VizEditorLiveInputDiagnostics,
  type VizEditorSession,
  type VizEditorSessionMutationResult,
  type VizEditorSessionSnapshot,
  type VizEditorTransportState,
  type VizEditorUiState,
} from '@viz-engine/editor-session';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import type { VizRenderJobService } from '@viz-engine/render';
import {
  resolveVizProjectAudioAsset,
  validateProjectDocument,
  type VizNodeRegistry,
} from '@viz-engine/runtime';
import {
  createVizLiveProjectValuesController,
  type VizLiveGraphNodeInputSnapshot,
  type VizLiveGraphNodeInputTarget,
  type VizLiveLayerPropertySnapshot,
  type VizLiveLayerPropertyTarget,
  type VizLiveLayerSettingSnapshot,
  type VizLiveLayerSettingTarget,
} from './live-project-values.js';

export type {
  VizLiveGraphNodeInputSnapshot,
  VizLiveGraphNodeInputTarget,
  VizLiveLayerPropertySnapshot,
  VizLiveLayerPropertyTarget,
  VizLiveLayerSettingSnapshot,
  VizLiveLayerSettingTarget,
} from './live-project-values.js';

export interface VizSessionSource {
  kind: 'example' | 'bundle' | 'memory';
  label: string;
  bundleDirectory?: string;
}

export interface VizSessionProjectResources {
  project: VizProjectDocument;
  resolvedAssets: VizResolvedAsset[];
  resolvedArtifacts: VizResolvedArtifact[];
  source: VizSessionSource;
}

export interface VizSessionServices {
  audioFeatureBakeJobs?: VizAudioFeatureBakeJobService;
  renderJobs?: VizRenderJobService;
}

export interface VizSessionHostSnapshot {
  source: VizSessionSource;
  resourceRevision: number;
  session: VizEditorSessionSnapshot;
  transport: VizEditorTransportState;
  audioSession: VizEditorAudioSessionState;
  audioDiagnostics: VizEditorLiveInputDiagnostics;
  resourceCounts: {
    assets: number;
    artifacts: number;
  };
}

export interface CreateVizSessionHostOptions {
  actor?: VizActionActor;
  initialProject: VizSessionProjectResources;
  componentRegistry?: VizComponentRegistry;
  nodeRegistry?: VizNodeRegistry;
  services?: VizSessionServices;
  normalizeProject?: (project: VizProjectDocument) => VizProjectDocument;
  onTransportStateChange?: (state: VizEditorTransportState) => void;
  onAudioSessionStateChange?: (
    state: VizEditorAudioSessionState,
    diagnostics: VizEditorLiveInputDiagnostics,
  ) => void;
}

export interface VizSessionHost {
  getSnapshot(): VizSessionHostSnapshot;
  getProjectRevision(): number;
  getResourceRevision(): number;
  getWorkingProject(): VizProjectDocument;
  getWorkingProjectView(): Readonly<VizProjectDocument>;
  getProjectResources(): VizSessionProjectResources;
  getComponentRegistry(): VizComponentRegistry;
  getNodeRegistry(): VizNodeRegistry;
  getServices(): VizSessionServices;
  getLiveLayerValues(): Readonly<Record<string, Readonly<VizLayer>>>;
  getLiveGraphValues(): Readonly<
    Record<
      string,
      Readonly<import('@viz-engine/contracts').VizNodeGraphDocument>
    >
  >;
  subscribeLiveProjectValues(listener: () => void): () => void;
  getLiveGraphNodeInput(
    target: VizLiveGraphNodeInputTarget,
  ): VizLiveGraphNodeInputSnapshot | undefined;
  beginLiveGraphGesture(graphId: string): void;
  updateLiveGraphNodeInput(
    target: VizLiveGraphNodeInputTarget,
    value: unknown,
  ): VizLiveGraphNodeInputSnapshot;
  commitLiveGraphGesture(
    graphId: string,
  ): VizEditorSessionMutationResult | undefined;
  cancelLiveGraphGesture(graphId: string): void;
  subscribeLiveGraphNodeInput(
    target: VizLiveGraphNodeInputTarget,
    listener: () => void,
  ): () => void;
  getLiveLayerSetting(
    target: VizLiveLayerSettingTarget,
  ): VizLiveLayerSettingSnapshot | undefined;
  beginLiveLayerSetting(
    target: VizLiveLayerSettingTarget,
  ): VizLiveLayerSettingSnapshot;
  updateLiveLayerSetting(
    target: VizLiveLayerSettingTarget,
    value: unknown,
  ): VizLiveLayerSettingSnapshot;
  commitLiveLayerSetting(
    target: VizLiveLayerSettingTarget,
    value?: unknown,
  ): VizEditorSessionMutationResult | undefined;
  cancelLiveLayerSetting(target: VizLiveLayerSettingTarget): void;
  subscribeLiveLayerSetting(
    target: VizLiveLayerSettingTarget,
    listener: () => void,
  ): () => void;
  getLiveLayerProperty(
    target: VizLiveLayerPropertyTarget,
  ): VizLiveLayerPropertySnapshot | undefined;
  beginLiveLayerProperty(
    target: VizLiveLayerPropertyTarget,
  ): VizLiveLayerPropertySnapshot;
  updateLiveLayerProperty(
    target: VizLiveLayerPropertyTarget,
    value: unknown,
  ): VizLiveLayerPropertySnapshot;
  commitLiveLayerProperty(
    target: VizLiveLayerPropertyTarget,
    value?: unknown,
  ): VizEditorSessionMutationResult | undefined;
  cancelLiveLayerProperty(target: VizLiveLayerPropertyTarget): void;
  subscribeLiveLayerProperty(
    target: VizLiveLayerPropertyTarget,
    listener: () => void,
  ): () => void;
  registerResolvedAsset(asset: VizResolvedAsset): VizSessionHostSnapshot;
  registerResolvedArtifact(
    artifact: VizResolvedArtifact,
  ): VizSessionHostSnapshot;
  loadProject(resources: VizSessionProjectResources): VizSessionHostSnapshot;
  transact(
    transaction: VizProjectTransaction,
    options?: { actor?: VizActionActor },
  ): VizEditorSessionMutationResult;
  applyAction(
    action: VizProjectAction,
    options?: { actor?: VizActionActor },
  ): VizEditorSessionMutationResult;
  applyActions(
    actions: VizProjectAction[],
    options?: { actor?: VizActionActor },
  ): VizEditorSessionMutationResult;
  undo(): VizSessionHostSnapshot;
  redo(): VizSessionHostSnapshot;
  canUndo(): boolean;
  canRedo(): boolean;
  beginHistoryGroup(): void;
  endHistoryGroup(): VizSessionHostSnapshot;
  setUiState(
    next:
      | Partial<VizEditorUiState>
      | ((
          current: VizEditorUiState,
        ) => VizEditorUiState | Partial<VizEditorUiState>),
  ): void;
  play(): void;
  pause(): void;
  togglePlayback(): void;
  seekToFrame(frame: number): void;
  advanceBySeconds(seconds: number): void;
  setLoop(loop: boolean): void;
  setTransportDurationFrames(durationFrames: number): void;
  setPreviewMode(mode: VizEditorTransportState['mode']): void;
  attachAudioSource(source: VizEditorAudioSource): void;
  clearAudioSource(): void;
  setAudioAnalyzerState(state: VizEditorAudioAnalyzerState): void;
  setLiveInputAvailable(available: boolean): void;
  setBakedArtifactAvailable(available: boolean): void;
  subscribeChanges(listener: () => void): () => void;
  subscribe(listener: (snapshot: VizSessionHostSnapshot) => void): () => void;
}

const clone = <T>(value: T): T => structuredClone(value);

const assertValidResources = (resources: VizSessionProjectResources): void => {
  const validation = validateProjectDocument(resources.project);

  if (!validation.ok) {
    throw new Error(
      `Cannot load invalid Viz project: ${validation.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    );
  }
};

const createProjectAudioSource = (
  resources: VizSessionProjectResources,
): VizEditorAudioSource | undefined => {
  const audio = resolveVizProjectAudioAsset(
    resources.project,
    resources.resolvedAssets,
  );

  if (!audio) {
    return undefined;
  }

  const durationSeconds =
    typeof audio.ref.metadata?.durationSeconds === 'number'
      ? audio.ref.metadata.durationSeconds
      : undefined;

  return {
    kind: 'media-element',
    id: audio.ref.id,
    label: audio.ref.label,
    uri: audio.resolved.uri,
    ...(durationSeconds === undefined ? {} : { durationSeconds }),
  };
};

export const createVizSessionHost = ({
  actor = { kind: 'user' },
  initialProject,
  componentRegistry = createCoreComponentRegistry(),
  nodeRegistry = createCoreNodeRegistry(),
  services = {},
  normalizeProject,
  onTransportStateChange,
  onAudioSessionStateChange,
}: CreateVizSessionHostOptions): VizSessionHost => {
  assertValidResources(initialProject);

  let currentResources = clone(initialProject);
  let resourceRevision = 0;
  const listeners = new Set<(snapshot: VizSessionHostSnapshot) => void>();
  const changeListeners = new Set<() => void>();
  const session: VizEditorSession = createVizEditorSession({
    project: currentResources.project,
    actor,
    ...(normalizeProject === undefined ? {} : { normalizeProject }),
    previewState: {
      mode: 'live',
    },
  });
  const liveProjectValues = createVizLiveProjectValuesController({
    getProject: session.getWorkingProject,
    getRevision: session.getRevision,
    applyAction: session.applyAction,
    applyActions: session.applyActions,
  });
  function emit() {
    for (const listener of changeListeners) {
      listener();
    }
    if (listeners.size === 0) {
      return;
    }
    const snapshot = getSnapshot();
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  const transportController = createVizEditorTransportController({
    fps: currentResources.project.timeline.fps,
    durationFrames: currentResources.project.timeline.durationInFrames,
    currentFrame: session.getPreviewState().currentFrame,
    isPlaying: session.getPreviewState().isPlaying,
    mode: session.getPreviewState().mode,
    onStateChange: (state) => {
      session.setPreviewState({
        currentFrame: state.currentFrame,
        isPlaying: state.isPlaying,
        mode: state.mode,
      });
      onTransportStateChange?.(state);
    },
  });

  const initialAudioSource = createProjectAudioSource(currentResources);
  const audioSessionController = createVizEditorAudioSessionController({
    ...(initialAudioSource === undefined ? {} : { source: initialAudioSource }),
    ...(currentResources.project.artifactRefs?.[0]?.id === undefined
      ? {}
      : {
          bakedArtifactId: currentResources.project.artifactRefs[0].id,
        }),
    bakedArtifactAvailable:
      (currentResources.project.artifactRefs?.length ?? 0) > 0,
    onStateChange: (state) => {
      onAudioSessionStateChange?.(
        state,
        audioSessionController.getDiagnostics(),
      );
      emit();
    },
  });

  function getSnapshot(): VizSessionHostSnapshot {
    return {
      source: clone(currentResources.source),
      resourceRevision,
      session: session.getSnapshot(),
      transport: transportController.getState(),
      audioSession: audioSessionController.getState(),
      audioDiagnostics: audioSessionController.getDiagnostics(),
      resourceCounts: {
        assets: currentResources.resolvedAssets.length,
        artifacts: currentResources.resolvedArtifacts.length,
      },
    };
  }

  session.subscribeChanges(() => {
    emit();
  });

  services.audioFeatureBakeJobs?.subscribe(({ job }) => {
    if (job.status !== 'succeeded' || !job.result) {
      return;
    }
    const artifact = clone(job.result.resolvedArtifact);
    currentResources.resolvedArtifacts = [
      ...currentResources.resolvedArtifacts.filter(
        (candidate) => candidate.id !== artifact.id,
      ),
      artifact,
    ];
    resourceRevision += 1;
    emit();
  });

  const registerResolvedAsset = (
    asset: VizResolvedAsset,
  ): VizSessionHostSnapshot => {
    currentResources.resolvedAssets = [
      ...currentResources.resolvedAssets.filter(
        (candidate) => candidate.id !== asset.id,
      ),
      clone(asset),
    ];
    resourceRevision += 1;
    emit();
    return getSnapshot();
  };

  const registerResolvedArtifact = (
    artifact: VizResolvedArtifact,
  ): VizSessionHostSnapshot => {
    currentResources.resolvedArtifacts = [
      ...currentResources.resolvedArtifacts.filter(
        (candidate) => candidate.id !== artifact.id,
      ),
      clone(artifact),
    ];
    resourceRevision += 1;
    emit();
    return getSnapshot();
  };

  const syncTransportTimeline = (project: VizProjectDocument): void => {
    const transport = transportController.getState();
    if (
      transport.fps !== project.timeline.fps ||
      transport.durationFrames !== project.timeline.durationInFrames
    ) {
      transportController.setTimeline({
        fps: project.timeline.fps,
        durationFrames: project.timeline.durationInFrames,
      });
    }
  };

  const syncTimelineAfterMutation = (
    result: VizEditorSessionMutationResult,
  ): VizEditorSessionMutationResult => {
    if (result.status === 'applied') {
      syncTransportTimeline(result.project);
    }
    return result;
  };

  return {
    getSnapshot,
    getProjectRevision: () => session.getRevision(),
    getResourceRevision: () => resourceRevision,
    getWorkingProject: () => session.exportWorkingProject(),
    getWorkingProjectView: () => session.getWorkingProjectView(),
    getProjectResources: () => ({
      project: session.exportWorkingProject(),
      resolvedAssets: clone(currentResources.resolvedAssets),
      resolvedArtifacts: clone(currentResources.resolvedArtifacts),
      source: clone(currentResources.source),
    }),
    getComponentRegistry: () => componentRegistry,
    getNodeRegistry: () => nodeRegistry,
    getServices: () => services,
    getLiveLayerValues: liveProjectValues.getLayerValues,
    getLiveGraphValues: liveProjectValues.getGraphValues,
    subscribeLiveProjectValues: liveProjectValues.subscribe,
    getLiveGraphNodeInput: liveProjectValues.getGraphNodeInput,
    beginLiveGraphGesture: (graphId) => {
      liveProjectValues.beginGraphGesture(graphId);
    },
    updateLiveGraphNodeInput: liveProjectValues.updateGraphNodeInput,
    commitLiveGraphGesture: liveProjectValues.commitGraphGesture,
    cancelLiveGraphGesture: liveProjectValues.cancelGraphGesture,
    subscribeLiveGraphNodeInput: liveProjectValues.subscribeGraphNodeInput,
    getLiveLayerSetting: liveProjectValues.getSetting,
    beginLiveLayerSetting: liveProjectValues.beginSetting,
    updateLiveLayerSetting: liveProjectValues.updateSetting,
    commitLiveLayerSetting: liveProjectValues.commitSetting,
    cancelLiveLayerSetting: liveProjectValues.cancelSetting,
    subscribeLiveLayerSetting: liveProjectValues.subscribeSetting,
    getLiveLayerProperty: liveProjectValues.getProperty,
    beginLiveLayerProperty: liveProjectValues.beginProperty,
    updateLiveLayerProperty: liveProjectValues.updateProperty,
    commitLiveLayerProperty: liveProjectValues.commitProperty,
    cancelLiveLayerProperty: liveProjectValues.cancelProperty,
    subscribeLiveLayerProperty: liveProjectValues.subscribeProperty,
    registerResolvedAsset,
    registerResolvedArtifact,
    loadProject: (resources) => {
      liveProjectValues.cancelAll();
      assertValidResources(resources);
      currentResources = clone(resources);
      resourceRevision += 1;
      session.loadProject(currentResources.project, {
        previewState: {
          mode: transportController.getState().mode,
        },
      });
      transportController.pause();
      syncTransportTimeline(currentResources.project);
      transportController.seekToFrame(0);
      const audioSource = createProjectAudioSource(currentResources);
      if (audioSource) {
        audioSessionController.attachSource(audioSource);
      }
      audioSessionController.setBakedArtifactId(
        currentResources.project.artifactRefs?.[0]?.id,
      );
      audioSessionController.setBakedArtifactAvailable(
        (currentResources.project.artifactRefs?.length ?? 0) > 0,
      );
      return getSnapshot();
    },
    transact: (transaction, options) => {
      liveProjectValues.cancelAll();
      return syncTimelineAfterMutation(session.transact(transaction, options));
    },
    applyAction: (action, options) => {
      liveProjectValues.cancelAll();
      return syncTimelineAfterMutation(session.applyAction(action, options));
    },
    applyActions: (actions, options) => {
      liveProjectValues.cancelAll();
      return syncTimelineAfterMutation(session.applyActions(actions, options));
    },
    undo: () => {
      liveProjectValues.cancelAll();
      session.undo();
      syncTransportTimeline(session.getWorkingProjectView());
      return getSnapshot();
    },
    redo: () => {
      liveProjectValues.cancelAll();
      session.redo();
      syncTransportTimeline(session.getWorkingProjectView());
      return getSnapshot();
    },
    canUndo: () => session.canUndo(),
    canRedo: () => session.canRedo(),
    beginHistoryGroup: () => {
      session.beginHistoryGroup();
    },
    endHistoryGroup: () => {
      session.endHistoryGroup();
      return getSnapshot();
    },
    setUiState: (next) => {
      session.setUiState(next);
    },
    play: () => {
      transportController.play();
    },
    pause: () => {
      transportController.pause();
    },
    togglePlayback: () => {
      transportController.togglePlayback();
    },
    seekToFrame: (frame) => {
      transportController.seekToFrame(frame);
    },
    advanceBySeconds: (seconds) => {
      transportController.advanceBySeconds(seconds);
    },
    setLoop: (loop) => {
      transportController.setLoop(loop);
    },
    setTransportDurationFrames: (durationFrames) => {
      transportController.setDurationFrames(durationFrames);
    },
    setPreviewMode: (mode) => {
      transportController.setMode(mode);
    },
    attachAudioSource: (source) => {
      audioSessionController.attachSource(source);
    },
    clearAudioSource: () => {
      audioSessionController.clearSource();
    },
    setAudioAnalyzerState: (state) => {
      audioSessionController.setAnalyzerState(state);
    },
    setLiveInputAvailable: (available) => {
      audioSessionController.setLiveInputAvailable(available);
    },
    setBakedArtifactAvailable: (available) => {
      audioSessionController.setBakedArtifactAvailable(available);
    },
    subscribeChanges: (listener) => {
      changeListeners.add(listener);
      return () => {
        changeListeners.delete(listener);
      };
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
