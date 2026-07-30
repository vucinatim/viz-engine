import { createCoreComponentRegistry } from "@viz-engine/components-core";
import type { VizAudioFeatureBakeJobService } from "@viz-engine/bake";
import type {
  VizActionActor,
  VizComponentRegistry,
  VizProjectAction,
  VizProjectDocument,
  VizProjectTransaction,
  VizResolvedArtifact,
  VizResolvedAsset,
} from "@viz-engine/contracts";
import {
  createVizEditorAudioSessionController,
  createVizEditorSession,
  createVizEditorTransportController,
  type VizEditorAudioAnalyzerState,
  type VizEditorAudioSessionController,
  type VizEditorAudioSessionState,
  type VizEditorAudioSource,
  type VizEditorLiveInputDiagnostics,
  type VizEditorSession,
  type VizEditorSessionMutationResult,
  type VizEditorSessionSnapshot,
  type VizEditorTransportController,
  type VizEditorTransportState,
  type VizEditorUiState,
} from "@viz-engine/editor-session";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import {
  type VizNodeRegistry,
  validateProjectDocument,
} from "@viz-engine/runtime";

export interface VizSessionSource {
  kind: "example" | "bundle" | "memory";
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
}

export interface VizSessionHostSnapshot {
  source: VizSessionSource;
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
  getWorkingProject(): VizProjectDocument;
  getProjectResources(): VizSessionProjectResources;
  getComponentRegistry(): VizComponentRegistry;
  getNodeRegistry(): VizNodeRegistry;
  getServices(): VizSessionServices;
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
  ): VizSessionHostSnapshot;
  play(): VizSessionHostSnapshot;
  pause(): VizSessionHostSnapshot;
  togglePlayback(): VizSessionHostSnapshot;
  seekToFrame(frame: number): VizSessionHostSnapshot;
  advanceBySeconds(seconds: number): VizSessionHostSnapshot;
  setLoop(loop: boolean): VizSessionHostSnapshot;
  setTransportDurationFrames(durationFrames: number): VizSessionHostSnapshot;
  setPreviewMode(mode: VizEditorTransportState["mode"]): VizSessionHostSnapshot;
  attachAudioSource(source: VizEditorAudioSource): VizSessionHostSnapshot;
  clearAudioSource(): VizSessionHostSnapshot;
  setAudioAnalyzerState(
    state: VizEditorAudioAnalyzerState,
  ): VizSessionHostSnapshot;
  setLiveInputAvailable(available: boolean): VizSessionHostSnapshot;
  setBakedArtifactAvailable(available: boolean): VizSessionHostSnapshot;
  subscribe(listener: (snapshot: VizSessionHostSnapshot) => void): () => void;
}

const clone = <T>(value: T): T => structuredClone(value);

const assertValidResources = (
  resources: VizSessionProjectResources,
): void => {
  const validation = validateProjectDocument(resources.project);

  if (!validation.ok) {
    throw new Error(
      `Cannot load invalid Viz project: ${validation.issues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }
};

export const createVizSessionHost = ({
  actor = { kind: "user" },
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
  const listeners = new Set<(snapshot: VizSessionHostSnapshot) => void>();
  const session: VizEditorSession = createVizEditorSession({
    project: currentResources.project,
    actor,
    ...(normalizeProject === undefined ? {} : { normalizeProject }),
    previewState: {
      mode: "live",
    },
  });
  let transportController: VizEditorTransportController;
  let audioSessionController: VizEditorAudioSessionController;

  const getSnapshot = (): VizSessionHostSnapshot => ({
    source: clone(currentResources.source),
    session: session.getSnapshot(),
    transport: transportController.getState(),
    audioSession: audioSessionController.getState(),
    audioDiagnostics: audioSessionController.getDiagnostics(),
    resourceCounts: {
      assets: currentResources.resolvedAssets.length,
      artifacts: currentResources.resolvedArtifacts.length,
    },
  });

  const emit = () => {
    if (
      transportController === undefined ||
      audioSessionController === undefined
    ) {
      return;
    }
    const snapshot = getSnapshot();
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  transportController = createVizEditorTransportController({
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

  audioSessionController = createVizEditorAudioSessionController({
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

  session.subscribe(() => {
    emit();
  });

  services.audioFeatureBakeJobs?.subscribe(({ job }) => {
    if (job.status !== "succeeded" || !job.result) {
      return;
    }
    const artifact = clone(job.result.resolvedArtifact);
    currentResources.resolvedArtifacts = [
      ...currentResources.resolvedArtifacts.filter(
        (candidate) => candidate.id !== artifact.id,
      ),
      artifact,
    ];
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
    emit();
    return getSnapshot();
  };

  const syncTimelineAfterMutation = (
    result: VizEditorSessionMutationResult,
  ): VizEditorSessionMutationResult => {
    if (
      result.status === "applied" &&
      transportController.getState().durationFrames !==
        result.project.timeline.durationInFrames
    ) {
      transportController.setDurationFrames(
        result.project.timeline.durationInFrames,
      );
    }
    return result;
  };

  return {
    getSnapshot,
    getWorkingProject: () => session.exportWorkingProject(),
    getProjectResources: () => ({
      project: session.exportWorkingProject(),
      resolvedAssets: clone(currentResources.resolvedAssets),
      resolvedArtifacts: clone(currentResources.resolvedArtifacts),
      source: clone(currentResources.source),
    }),
    getComponentRegistry: () => componentRegistry,
    getNodeRegistry: () => nodeRegistry,
    getServices: () => services,
    registerResolvedAsset,
    registerResolvedArtifact,
    loadProject: (resources) => {
      assertValidResources(resources);
      currentResources = clone(resources);
      session.loadProject(currentResources.project, {
        previewState: {
          mode: transportController.getState().mode,
        },
      });
      transportController.pause();
      transportController.setDurationFrames(
        currentResources.project.timeline.durationInFrames,
      );
      transportController.seekToFrame(0);
      audioSessionController.setBakedArtifactId(
        currentResources.project.artifactRefs?.[0]?.id,
      );
      audioSessionController.setBakedArtifactAvailable(
        (currentResources.project.artifactRefs?.length ?? 0) > 0,
      );
      return getSnapshot();
    },
    transact: (transaction, options) =>
      syncTimelineAfterMutation(session.transact(transaction, options)),
    applyAction: (action, options) =>
      syncTimelineAfterMutation(session.applyAction(action, options)),
    applyActions: (actions, options) =>
      syncTimelineAfterMutation(session.applyActions(actions, options)),
    undo: () => {
      session.undo();
      transportController.setDurationFrames(
        session.getWorkingProject().timeline.durationInFrames,
      );
      return getSnapshot();
    },
    redo: () => {
      session.redo();
      transportController.setDurationFrames(
        session.getWorkingProject().timeline.durationInFrames,
      );
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
      return getSnapshot();
    },
    play: () => {
      transportController.play();
      return getSnapshot();
    },
    pause: () => {
      transportController.pause();
      return getSnapshot();
    },
    togglePlayback: () => {
      transportController.togglePlayback();
      return getSnapshot();
    },
    seekToFrame: (frame) => {
      transportController.seekToFrame(frame);
      return getSnapshot();
    },
    advanceBySeconds: (seconds) => {
      transportController.advanceBySeconds(seconds);
      return getSnapshot();
    },
    setLoop: (loop) => {
      transportController.setLoop(loop);
      return getSnapshot();
    },
    setTransportDurationFrames: (durationFrames) => {
      transportController.setDurationFrames(durationFrames);
      return getSnapshot();
    },
    setPreviewMode: (mode) => {
      transportController.setMode(mode);
      return getSnapshot();
    },
    attachAudioSource: (source) => {
      audioSessionController.attachSource(source);
      return getSnapshot();
    },
    clearAudioSource: () => {
      audioSessionController.clearSource();
      return getSnapshot();
    },
    setAudioAnalyzerState: (state) => {
      audioSessionController.setAnalyzerState(state);
      return getSnapshot();
    },
    setLiveInputAvailable: (available) => {
      audioSessionController.setLiveInputAvailable(available);
      return getSnapshot();
    },
    setBakedArtifactAvailable: (available) => {
      audioSessionController.setBakedArtifactAvailable(available);
      return getSnapshot();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
