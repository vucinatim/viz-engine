import { coreComponents, createCoreComponentRegistry } from "@viz-engine/components-core";
import type {
  VizActionActor,
  VizGraphEvaluationIssue,
  VizGraphId,
  VizProjectAction,
  VizProjectDocument,
  VizResolvedArtifact,
  VizResolvedAsset,
} from "@viz-engine/contracts";
import { exampleProjectDocument, exampleResolvedArtifacts, exampleResolvedAssets } from "@viz-engine/example-projects";
import {
  createVizEditorAudioSessionController,
  createVizEditorSession,
  createVizEditorTransportController,
  type VizEditorAudioAnalyzerState,
  type VizEditorAudioSource,
  type VizEditorAudioSessionController,
  type VizEditorSession,
  type VizEditorTransportController,
} from "@viz-engine/editor-session";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import { renderVizRenderPlanToSvgMarkup } from "@viz-engine/renderer-svg";
import {
  createVizFramePlan,
  createVizRenderPlan,
  createVizRuntimeSession,
  evaluateVizGraphs,
  type VizGraphRuntimeCheckpoint,
  validateProjectDocument,
} from "@viz-engine/runtime";

export interface VizEditorControlSource {
  kind: "example" | "bundle" | "memory";
  label: string;
  bundleDirectory?: string;
}

export interface VizEditorControlProjectResources {
  project: VizProjectDocument;
  resolvedAssets: VizResolvedAsset[];
  resolvedArtifacts: VizResolvedArtifact[];
  source: VizEditorControlSource;
}

export interface VizEditorGraphSummary {
  graphId: VizGraphId;
  name: string;
  nodeCount: number;
  outputKeys: string[];
}

export interface VizEditorComponentSummary {
  componentId: string;
  name: string;
  rendererFamily: string;
  description: string | undefined;
  inputCount: number;
  inputKeys: string[];
}

export interface VizEditorControlSnapshot {
  source: VizEditorControlSource;
  session: ReturnType<VizEditorSession["getSnapshot"]>;
  transport: ReturnType<VizEditorTransportController["getState"]>;
  audioSession: ReturnType<VizEditorAudioSessionController["getState"]>;
  audioDiagnostics: ReturnType<VizEditorAudioSessionController["getDiagnostics"]>;
  graphSummaries: VizEditorGraphSummary[];
  resourceCounts: {
    assets: number;
    artifacts: number;
  };
}

export interface VizEditorControlFrameInspection {
  source: VizEditorControlSource;
  revision: number;
  frame: number;
  framePlan: ReturnType<typeof createVizFramePlan>;
}

export interface VizEditorControlRenderInspection {
  source: VizEditorControlSource;
  revision: number;
  frame: number;
  renderPlan: ReturnType<typeof createVizRenderPlan>;
}

export interface VizEditorControlDebugSnapshot {
  source: VizEditorControlSource;
  revision: number;
  frame: number;
  framePlan: ReturnType<typeof createVizFramePlan>;
  renderPlan: ReturnType<typeof createVizRenderPlan>;
  svg: string;
}

export interface VizEditorControlMutationResult {
  ok: boolean;
  snapshot: VizEditorControlSnapshot;
  actionResult: ReturnType<VizEditorSession["applyActions"]>;
}

export interface VizEditorGraphRuntimeInspection {
  source: VizEditorControlSource;
  revision: number;
  frame: number;
  graphs: Array<{
    graphId: VizGraphId;
    name: string;
    values: Record<string, unknown>;
    issues: VizGraphEvaluationIssue[];
    checkpoint: VizGraphRuntimeCheckpoint | undefined;
  }>;
}

export interface CreateVizEditorControlOptions {
  actor?: VizActionActor;
  initialProject?: VizEditorControlProjectResources;
}

export interface VizEditorControl {
  openExampleProject(): VizEditorControlSnapshot;
  openProject(resources: VizEditorControlProjectResources): VizEditorControlSnapshot;
  getSnapshot(): VizEditorControlSnapshot;
  getWorkingProject(): VizProjectDocument;
  getProjectResources(): VizEditorControlProjectResources;
  getUiState(): VizEditorControlSnapshot["session"]["uiState"];
  setUiState(
    next:
      | Partial<VizEditorControlSnapshot["session"]["uiState"]>
      | ((
          current: VizEditorControlSnapshot["session"]["uiState"],
        ) =>
          | VizEditorControlSnapshot["session"]["uiState"]
          | Partial<VizEditorControlSnapshot["session"]["uiState"]>),
  ): VizEditorControlSnapshot;
  inspectGraphs(): VizEditorGraphSummary[];
  inspectComponents(): VizEditorComponentSummary[];
  inspectGraph(graphId: VizGraphId): NonNullable<VizProjectDocument["graphs"]>[number] | undefined;
  inspectGraphRuntime(frame?: number): VizEditorGraphRuntimeInspection;
  applyAction(action: VizProjectAction, options?: { actor?: VizActionActor }): VizEditorControlMutationResult;
  applyActions(actions: VizProjectAction[], options?: { actor?: VizActionActor }): VizEditorControlMutationResult;
  inspectFrame(frame?: number): VizEditorControlFrameInspection;
  inspectRender(frame?: number): VizEditorControlRenderInspection;
  createDebugSnapshot(frame?: number): VizEditorControlDebugSnapshot;
  play(): VizEditorControlSnapshot;
  pause(): VizEditorControlSnapshot;
  seekToFrame(frame: number): VizEditorControlSnapshot;
  advanceBySeconds(seconds: number): VizEditorControlSnapshot;
  setLoop(loop: boolean): VizEditorControlSnapshot;
  setTransportDurationFrames(durationFrames: number): VizEditorControlSnapshot;
  setPreviewMode(mode: VizEditorControlSnapshot["transport"]["mode"]): VizEditorControlSnapshot;
  attachAudioSource(source: VizEditorAudioSource): VizEditorControlSnapshot;
  clearAudioSource(): VizEditorControlSnapshot;
  setAudioAnalyzerState(state: VizEditorAudioAnalyzerState): VizEditorControlSnapshot;
  setLiveInputAvailable(available: boolean): VizEditorControlSnapshot;
  setBakedArtifactAvailable(available: boolean): VizEditorControlSnapshot;
}

const componentRegistry = createCoreComponentRegistry();
const nodeRegistry = createCoreNodeRegistry();

const cloneUnknown = <T>(value: T): T => structuredClone(value);

const createGraphSummaries = (project: VizProjectDocument): VizEditorGraphSummary[] => {
  return (project.graphs ?? []).map((graph) => ({
    graphId: graph.id,
    name: graph.name,
    nodeCount: graph.nodes.length,
    outputKeys: graph.outputs.map((output) => output.key),
  }));
};

const createComponentSummaries = (): VizEditorComponentSummary[] => {
  return coreComponents.map((component) => ({
    componentId: component.id,
    name: component.name,
    rendererFamily: component.rendererFamily,
    description: component.description,
    inputCount: component.inputs?.length ?? 0,
    inputKeys: (component.inputs ?? []).map((input) => input.key),
  }));
};

const createRuntimeSessionForInspection = ({
  project,
  resolvedAssets,
  resolvedArtifacts,
  frameMode,
}: {
  project: VizProjectDocument;
  resolvedAssets: VizResolvedAsset[];
  resolvedArtifacts: VizResolvedArtifact[];
  frameMode: VizEditorControlSnapshot["transport"]["mode"];
}) => {
  return createVizRuntimeSession({
    project,
    mode: frameMode,
    resolvedAssets,
    resolvedArtifacts,
    seed: "editor-control-seed",
  });
};

const createAudioSessionOptions = ({
  source,
  analyzerState,
  bakedArtifactId,
  bakedArtifactAvailable,
  liveInputAvailable,
}: {
  source: VizEditorAudioSource | undefined;
  analyzerState: VizEditorAudioAnalyzerState | undefined;
  bakedArtifactId: string | undefined;
  bakedArtifactAvailable: boolean;
  liveInputAvailable: boolean;
}) => {
  return {
    ...(source === undefined ? {} : { source }),
    ...(analyzerState === undefined ? {} : { analyzerState }),
    ...(bakedArtifactId === undefined ? {} : { bakedArtifactId }),
    bakedArtifactAvailable,
    liveInputAvailable,
  };
};

const getProjectFrame = (
  frame: number | undefined,
  session: VizEditorSession,
): number => {
  return frame ?? session.getPreviewState().currentFrame;
};

const createExampleResources = (): VizEditorControlProjectResources => ({
  project: cloneUnknown(exampleProjectDocument),
  resolvedAssets: cloneUnknown(exampleResolvedAssets),
  resolvedArtifacts: cloneUnknown(exampleResolvedArtifacts),
  source: {
    kind: "example",
    label: "Canonical Example Project",
  },
});

export const createVizEditorControl = ({
  actor = { kind: "agent", id: "local-editor-control" },
  initialProject = createExampleResources(),
}: CreateVizEditorControlOptions = {}): VizEditorControl => {
  let currentResources = cloneUnknown(initialProject);
  let editorSession = createVizEditorSession({
    project: currentResources.project,
    actor,
    previewState: {
      mode: "live",
    },
  });

  let transportController = createVizEditorTransportController({
    fps: currentResources.project.timeline.fps,
    durationFrames: currentResources.project.timeline.durationInFrames,
    currentFrame: editorSession.getPreviewState().currentFrame,
    isPlaying: editorSession.getPreviewState().isPlaying,
    mode: editorSession.getPreviewState().mode,
    onStateChange: (state) => {
      editorSession.setPreviewState({
        currentFrame: state.currentFrame,
        isPlaying: state.isPlaying,
        mode: state.mode,
      });
    },
  });

  let audioSessionController = createVizEditorAudioSessionController({
    ...createAudioSessionOptions({
      source: undefined,
      analyzerState: undefined,
      bakedArtifactId: currentResources.project.artifactRefs?.[0]?.id,
      bakedArtifactAvailable: (currentResources.project.artifactRefs?.length ?? 0) > 0,
      liveInputAvailable: false,
    }),
  });

  const rebuildControllers = () => {
    transportController = createVizEditorTransportController({
      fps: currentResources.project.timeline.fps,
      durationFrames: currentResources.project.timeline.durationInFrames,
      currentFrame: editorSession.getPreviewState().currentFrame,
      isPlaying: editorSession.getPreviewState().isPlaying,
      mode: editorSession.getPreviewState().mode,
      onStateChange: (state) => {
        editorSession.setPreviewState({
          currentFrame: state.currentFrame,
          isPlaying: state.isPlaying,
          mode: state.mode,
        });
      },
    });
    audioSessionController = createVizEditorAudioSessionController({
      ...createAudioSessionOptions({
        source: audioSessionController.getState().source,
        analyzerState: audioSessionController.getState().analyzerState,
        bakedArtifactId: currentResources.project.artifactRefs?.[0]?.id,
        bakedArtifactAvailable: (currentResources.project.artifactRefs?.length ?? 0) > 0,
        liveInputAvailable: audioSessionController.getState().liveInputAvailable,
      }),
    });
  };

  const getSnapshot = (): VizEditorControlSnapshot => {
    return {
      source: cloneUnknown(currentResources.source),
      session: editorSession.getSnapshot(),
      transport: transportController.getState(),
      audioSession: audioSessionController.getState(),
      audioDiagnostics: audioSessionController.getDiagnostics(),
      graphSummaries: createGraphSummaries(editorSession.getWorkingProject()),
      resourceCounts: {
        assets: currentResources.resolvedAssets.length,
        artifacts: currentResources.resolvedArtifacts.length,
      },
    };
  };

  const openProject = (resources: VizEditorControlProjectResources): VizEditorControlSnapshot => {
    const validation = validateProjectDocument(resources.project);

    if (!validation.ok) {
      throw new Error(
        `Cannot open invalid Viz project: ${validation.issues.map((issue) => issue.message).join("; ")}`,
      );
    }

    currentResources = cloneUnknown(resources);
    editorSession = createVizEditorSession({
      project: currentResources.project,
      actor,
      previewState: {
        mode: "live",
      },
    });
    rebuildControllers();
    return getSnapshot();
  };

  const createFrameInspection = (frame?: number): VizEditorControlFrameInspection => {
    const project = editorSession.getWorkingProject();
    const selectedFrame = getProjectFrame(frame, editorSession);
    const runtimeSession = createRuntimeSessionForInspection({
      project,
      resolvedAssets: currentResources.resolvedAssets,
      resolvedArtifacts: currentResources.resolvedArtifacts,
      frameMode: transportController.getState().mode,
    });
    const framePlan = createVizFramePlan({
      session: runtimeSession,
      frame: selectedFrame,
      registry: componentRegistry,
      nodeRegistry,
    });

    return {
      source: cloneUnknown(currentResources.source),
      revision: editorSession.getSnapshot().revision,
      frame: selectedFrame,
      framePlan,
    };
  };

  const createRenderInspection = (frame?: number): VizEditorControlRenderInspection => {
    const project = editorSession.getWorkingProject();
    const selectedFrame = getProjectFrame(frame, editorSession);
    const runtimeSession = createRuntimeSessionForInspection({
      project,
      resolvedAssets: currentResources.resolvedAssets,
      resolvedArtifacts: currentResources.resolvedArtifacts,
      frameMode: transportController.getState().mode,
    });
    const renderPlan = createVizRenderPlan({
      session: runtimeSession,
      frame: selectedFrame,
      registry: componentRegistry,
      nodeRegistry,
    });

    return {
      source: cloneUnknown(currentResources.source),
      revision: editorSession.getSnapshot().revision,
      frame: selectedFrame,
      renderPlan,
    };
  };

  const createGraphRuntimeInspection = (frame?: number): VizEditorGraphRuntimeInspection => {
    const project = editorSession.getWorkingProject();
    const selectedFrame = getProjectFrame(frame, editorSession);
    const runtimeSession = createRuntimeSessionForInspection({
      project,
      resolvedAssets: currentResources.resolvedAssets,
      resolvedArtifacts: currentResources.resolvedArtifacts,
      frameMode: transportController.getState().mode,
    });

    const graphResults = evaluateVizGraphs({
      session: runtimeSession,
      frame: selectedFrame,
      registry: nodeRegistry,
    });

    return {
      source: cloneUnknown(currentResources.source),
      revision: editorSession.getSnapshot().revision,
      frame: selectedFrame,
      graphs: (project.graphs ?? []).map((graph) => ({
        graphId: graph.id,
        name: graph.name,
        values: structuredClone(graphResults.get(graph.id)?.values ?? {}),
        issues: structuredClone(graphResults.get(graph.id)?.issues ?? []),
        checkpoint: runtimeSession.getGraphCheckpointBeforeOrAt(graph.id, selectedFrame),
      })),
    };
  };

  return {
    openExampleProject: () => openProject(createExampleResources()),
    openProject,
    getSnapshot,
    getWorkingProject: () => editorSession.exportWorkingProject(),
    getProjectResources: () => ({
      project: editorSession.exportWorkingProject(),
      resolvedAssets: cloneUnknown(currentResources.resolvedAssets),
      resolvedArtifacts: cloneUnknown(currentResources.resolvedArtifacts),
      source: cloneUnknown(currentResources.source),
    }),
    getUiState: () => cloneUnknown(editorSession.getUiState()),
    setUiState: (next) => {
      editorSession.setUiState(next);
      return getSnapshot();
    },
    inspectGraphs: () => createGraphSummaries(editorSession.getWorkingProject()),
    inspectComponents: () => cloneUnknown(createComponentSummaries()),
    inspectGraph: (graphId) => {
      return cloneUnknown(
        editorSession.getWorkingProject().graphs?.find((graph) => graph.id === graphId),
      );
    },
    inspectGraphRuntime: createGraphRuntimeInspection,
    applyAction: (action, options) => {
      const actionResult = editorSession.applyAction(action, options);

      if (actionResult.ok) {
        rebuildControllers();
      }

      return {
        ok: actionResult.ok,
        snapshot: getSnapshot(),
        actionResult,
      };
    },
    applyActions: (actions, options) => {
      const actionResult = editorSession.applyActions(actions, options);

      if (actionResult.ok) {
        rebuildControllers();
      }

      return {
        ok: actionResult.ok,
        snapshot: getSnapshot(),
        actionResult,
      };
    },
    inspectFrame: createFrameInspection,
    inspectRender: createRenderInspection,
    createDebugSnapshot: (frame) => {
      const frameInspection = createFrameInspection(frame);
      const renderInspection = createRenderInspection(frameInspection.frame);

      return {
        source: cloneUnknown(currentResources.source),
        revision: renderInspection.revision,
        frame: renderInspection.frame,
        framePlan: frameInspection.framePlan,
        renderPlan: renderInspection.renderPlan,
        svg: renderVizRenderPlanToSvgMarkup(renderInspection.renderPlan),
      };
    },
    play: () => {
      transportController.play();
      return getSnapshot();
    },
    pause: () => {
      transportController.pause();
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
  };
};
