import type {
  VizAudioFeatureBakeJobRecord,
  VizAudioFeatureBakeJobRequest,
} from "@viz-engine/bake";
import type {
  VizActionActor,
  VizCapabilityPackManifest,
  VizComponentAuthoring,
  VizComponentRegistry,
  VizGraphEvaluationIssue,
  VizGraphEvaluationResult,
  VizGraphId,
  VizJobId,
  VizProjectAction,
  VizProjectDocument,
  VizProjectTransaction,
  VizResolvedArtifact,
  VizResolvedAsset,
} from "@viz-engine/contracts";
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from "@viz-engine/example-projects";
import type {
  VizEditorAudioAnalyzerState,
  VizEditorAudioSource,
  VizEditorSessionMutationResult,
} from "@viz-engine/editor-session";
import { renderVizRenderPlanToSvgMarkup } from "@viz-engine/renderer-svg";
import {
  createVizFramePlan,
  createVizRenderPlan,
  createVizRuntimeSession,
  createVizStandardGraphRuntimeInputValues,
  evaluateVizGraphs,
  sampleProjectAudioFrameSnapshot,
  type VizGraphRuntimeCheckpoint,
  type VizNodeRegistry,
  validateProjectDocument,
} from "@viz-engine/runtime";
import {
  createVizSessionHost,
  type VizSessionHost,
  type VizSessionHostSnapshot,
  type VizSessionProjectResources,
  type VizSessionSource,
} from "./host.js";

export * from "./host.js";
export * from "./protocol.js";
export * from "./request-handler.js";

export interface VizGraphSummary {
  graphId: VizGraphId;
  name: string;
  nodeCount: number;
  outputKeys: string[];
}

export interface VizComponentSummary {
  componentId: string;
  name: string;
  rendererFamily: string;
  description: string | undefined;
  implementationVersion: string | undefined;
  compatibility: VizComponentAuthoring["compatibility"] | undefined;
  capabilityPack: VizCapabilityPackManifest | undefined;
  authoring: VizComponentAuthoring | undefined;
  inputCount: number;
  inputKeys: string[];
}

export interface VizControlSnapshot extends VizSessionHostSnapshot {
  graphSummaries: VizGraphSummary[];
  jobSummaries: VizControlJobSummary[];
}

export interface VizControlFrameInspection {
  source: VizSessionSource;
  revision: number;
  frame: number;
  framePlan: ReturnType<typeof createVizFramePlan>;
}

export interface VizControlRenderInspection {
  source: VizSessionSource;
  revision: number;
  frame: number;
  renderPlan: ReturnType<typeof createVizRenderPlan>;
}

export interface VizControlDebugSnapshot {
  source: VizSessionSource;
  revision: number;
  frame: number;
  framePlan: ReturnType<typeof createVizFramePlan>;
  renderPlan: ReturnType<typeof createVizRenderPlan>;
  svg: string;
}

export interface VizControlMutationResult {
  ok: boolean;
  snapshot: VizControlSnapshot;
  transactionResult: VizEditorSessionMutationResult;
}

export interface VizProjectInspection {
  source: VizSessionSource;
  revision: number;
  project: VizProjectDocument;
  validation: ReturnType<typeof validateProjectDocument>;
  assets: VizResolvedAsset[];
  artifacts: VizResolvedArtifact[];
  issues: VizControlSnapshot["session"]["issues"];
  actionHistory: VizControlSnapshot["session"]["actionHistory"];
}

export interface VizGraphRuntimeInspection {
  source: VizSessionSource;
  revision: number;
  frame: number;
  graphs: Array<{
    graphId: VizGraphId;
    name: string;
    values: Record<string, unknown>;
    nodes: VizGraphEvaluationResult["nodes"];
    issues: VizGraphEvaluationIssue[];
    checkpoint: VizGraphRuntimeCheckpoint | undefined;
  }>;
}

export interface VizControlJobSummary {
  id: VizJobId;
  kind: string;
  status: VizAudioFeatureBakeJobRecord["status"];
  requestedBy: VizActionActor;
  requestedAt: string;
  updatedAt: string;
  inputIdentity?: string;
  progress?: VizAudioFeatureBakeJobRecord["progress"];
  outputArtifactId?: string;
  failure?: VizAudioFeatureBakeJobRecord["failure"];
}

export type VizControlProjectChangeReason =
  | "load"
  | "transaction"
  | "undo"
  | "redo";

export interface CreateVizControlOptions {
  actor?: VizActionActor;
  host?: VizSessionHost;
  initialProject?: VizSessionProjectResources;
  componentRegistry?: VizComponentRegistry;
  nodeRegistry?: VizNodeRegistry;
  onProjectChange?: (
    snapshot: VizControlSnapshot,
    reason: VizControlProjectChangeReason,
  ) => void;
}

export interface VizControl {
  getHost(): VizSessionHost;
  openExampleProject(): VizControlSnapshot;
  openProject(resources: VizSessionProjectResources): VizControlSnapshot;
  getSnapshot(): VizControlSnapshot;
  getWorkingProject(): VizProjectDocument;
  getProjectResources(): VizSessionProjectResources;
  getUiState(): VizControlSnapshot["session"]["uiState"];
  inspectProject(): VizProjectInspection;
  setUiState(
    next:
      | Partial<VizControlSnapshot["session"]["uiState"]>
      | ((
          current: VizControlSnapshot["session"]["uiState"],
        ) =>
          | VizControlSnapshot["session"]["uiState"]
          | Partial<VizControlSnapshot["session"]["uiState"]>),
  ): VizControlSnapshot;
  inspectGraphs(): VizGraphSummary[];
  inspectComponents(): VizComponentSummary[];
  inspectGraph(
    graphId: VizGraphId,
  ): NonNullable<VizProjectDocument["graphs"]>[number] | undefined;
  inspectGraphRuntime(frame?: number): VizGraphRuntimeInspection;
  listJobs(): VizControlJobSummary[];
  inspectJob(jobId: VizJobId): VizAudioFeatureBakeJobRecord | undefined;
  startAudioFeatureBake(
    request: VizAudioFeatureBakeJobRequest,
  ): VizAudioFeatureBakeJobRecord;
  cancelJob(jobId: VizJobId): VizAudioFeatureBakeJobRecord | undefined;
  attachAudioFeatureBakeOutput(
    jobId: VizJobId,
    expectedRevision?: number,
  ): VizControlMutationResult;
  applyTransaction(
    transaction: VizProjectTransaction,
    options?: { actor?: VizActionActor },
  ): VizControlMutationResult;
  applyAction(
    action: VizProjectAction,
    options?: { actor?: VizActionActor },
  ): VizControlMutationResult;
  applyActions(
    actions: VizProjectAction[],
    options?: { actor?: VizActionActor },
  ): VizControlMutationResult;
  undo(): VizControlSnapshot;
  redo(): VizControlSnapshot;
  inspectFrame(frame?: number): VizControlFrameInspection;
  inspectRender(frame?: number): VizControlRenderInspection;
  createDebugSnapshot(frame?: number): VizControlDebugSnapshot;
  play(): VizControlSnapshot;
  pause(): VizControlSnapshot;
  seekToFrame(frame: number): VizControlSnapshot;
  advanceBySeconds(seconds: number): VizControlSnapshot;
  setLoop(loop: boolean): VizControlSnapshot;
  setTransportDurationFrames(durationFrames: number): VizControlSnapshot;
  setPreviewMode(
    mode: VizControlSnapshot["transport"]["mode"],
  ): VizControlSnapshot;
  attachAudioSource(source: VizEditorAudioSource): VizControlSnapshot;
  clearAudioSource(): VizControlSnapshot;
  setAudioAnalyzerState(
    state: VizEditorAudioAnalyzerState,
  ): VizControlSnapshot;
  setLiveInputAvailable(available: boolean): VizControlSnapshot;
  setBakedArtifactAvailable(available: boolean): VizControlSnapshot;
  subscribe(listener: (snapshot: VizControlSnapshot) => void): () => void;
}

const clone = <T>(value: T): T => structuredClone(value);

const createGraphSummaries = (
  project: VizProjectDocument,
): VizGraphSummary[] => {
  return (project.graphs ?? []).map((graph) => ({
    graphId: graph.id,
    name: graph.name,
    nodeCount: graph.nodes.length,
    outputKeys: graph.outputs.map((output) => output.key),
  }));
};

const createComponentSummaries = (
  registry: VizComponentRegistry,
): VizComponentSummary[] => {
  return registry.listRegistrations().map((registration) => {
    const component = registration.component;
    return {
      componentId: component.id,
      name: component.name,
      rendererFamily: component.rendererFamily,
      description: component.description,
      implementationVersion: component.implementationVersion,
      compatibility: component.authoring?.compatibility,
      capabilityPack: registration.capabilityPack,
      authoring: component.authoring,
      inputCount: component.inputs?.length ?? 0,
      inputKeys: (component.inputs ?? []).map((input) => input.key),
    };
  });
};

const createJobSummary = (
  job: VizAudioFeatureBakeJobRecord,
): VizControlJobSummary => ({
  id: job.id,
  kind: job.kind,
  status: job.status,
  requestedBy: job.requestedBy,
  requestedAt: job.requestedAt,
  updatedAt: job.updatedAt,
  ...(job.inputIdentity === undefined
    ? {}
    : { inputIdentity: job.inputIdentity }),
  ...(job.progress === undefined
    ? {}
    : { progress: job.progress }),
  ...(job.result === undefined
    ? {}
    : { outputArtifactId: job.result.artifact.id }),
  ...(job.failure === undefined ? {} : { failure: job.failure }),
});

const createRuntimeSessionForInspection = ({
  project,
  resolvedAssets,
  resolvedArtifacts,
  frameMode,
}: {
  project: VizProjectDocument;
  resolvedAssets: VizResolvedAsset[];
  resolvedArtifacts: VizResolvedArtifact[];
  frameMode: VizControlSnapshot["transport"]["mode"];
}) => {
  return createVizRuntimeSession({
    project,
    mode: frameMode,
    resolvedAssets,
    resolvedArtifacts,
    seed: "viz-control-seed",
  });
};

const createRuntimeInputsForInspection = (
  resources: VizSessionProjectResources,
  frame: number,
) => {
  const audio = sampleProjectAudioFrameSnapshot(
    resources.project,
    resources.resolvedArtifacts,
    frame,
  );
  return audio === undefined ? {} : { audio };
};

const createExampleResources = (): VizSessionProjectResources => ({
  project: clone(exampleProjectDocument),
  resolvedAssets: clone(exampleResolvedAssets),
  resolvedArtifacts: clone(exampleResolvedArtifacts),
  source: {
    kind: "example",
    label: "Canonical Example Project",
  },
});

export const createVizControl = (
  options: CreateVizControlOptions = {},
): VizControl => {
  const actor = options.actor ?? {
    kind: "agent",
    id: "local-viz-control",
  };

  if (
    options.host !== undefined &&
    (options.initialProject !== undefined ||
      options.componentRegistry !== undefined ||
      options.nodeRegistry !== undefined)
  ) {
    throw new Error(
      "An injected VizSessionHost already owns project resources and registries.",
    );
  }

  const host =
    options.host ??
    createVizSessionHost({
      actor,
      initialProject: options.initialProject ?? createExampleResources(),
      ...(options.componentRegistry === undefined
        ? {}
        : { componentRegistry: options.componentRegistry }),
      ...(options.nodeRegistry === undefined
        ? {}
        : { nodeRegistry: options.nodeRegistry }),
    });

  const getSnapshot = (): VizControlSnapshot => {
    const hostSnapshot = host.getSnapshot();
    return {
      ...hostSnapshot,
      graphSummaries: createGraphSummaries(
        hostSnapshot.session.workingProject,
      ),
      jobSummaries:
        host
          .getServices()
          .audioFeatureBakeJobs?.list()
          .map(createJobSummary) ?? [],
    };
  };

  const notifyProjectChange = (reason: VizControlProjectChangeReason) => {
    const snapshot = getSnapshot();
    options.onProjectChange?.(snapshot, reason);
    return snapshot;
  };

  const openProject = (
    resources: VizSessionProjectResources,
  ): VizControlSnapshot => {
    host.loadProject(resources);
    return notifyProjectChange("load");
  };

  const getSelectedFrame = (frame: number | undefined): number => {
    return frame ?? host.getSnapshot().transport.currentFrame;
  };

  const createFrameInspection = (
    frame?: number,
  ): VizControlFrameInspection => {
    const resources = host.getProjectResources();
    const hostSnapshot = host.getSnapshot();
    const selectedFrame = getSelectedFrame(frame);
    const runtimeSession = createRuntimeSessionForInspection({
      project: resources.project,
      resolvedAssets: resources.resolvedAssets,
      resolvedArtifacts: resources.resolvedArtifacts,
      frameMode: hostSnapshot.transport.mode,
    });
    const framePlan = createVizFramePlan({
      session: runtimeSession,
      frame: selectedFrame,
      registry: host.getComponentRegistry(),
      nodeRegistry: host.getNodeRegistry(),
      runtimeInputs: createRuntimeInputsForInspection(
        resources,
        selectedFrame,
      ),
    });

    return {
      source: clone(resources.source),
      revision: hostSnapshot.session.revision,
      frame: selectedFrame,
      framePlan,
    };
  };

  const createRenderInspection = (
    frame?: number,
  ): VizControlRenderInspection => {
    const resources = host.getProjectResources();
    const hostSnapshot = host.getSnapshot();
    const selectedFrame = getSelectedFrame(frame);
    const runtimeSession = createRuntimeSessionForInspection({
      project: resources.project,
      resolvedAssets: resources.resolvedAssets,
      resolvedArtifacts: resources.resolvedArtifacts,
      frameMode: hostSnapshot.transport.mode,
    });
    const renderPlan = createVizRenderPlan({
      session: runtimeSession,
      frame: selectedFrame,
      registry: host.getComponentRegistry(),
      nodeRegistry: host.getNodeRegistry(),
      runtimeInputProvider: (requestedFrame) =>
        createRuntimeInputsForInspection(resources, requestedFrame),
    });

    return {
      source: clone(resources.source),
      revision: hostSnapshot.session.revision,
      frame: selectedFrame,
      renderPlan,
    };
  };

  const createGraphRuntimeInspection = (
    frame?: number,
  ): VizGraphRuntimeInspection => {
    const resources = host.getProjectResources();
    const hostSnapshot = host.getSnapshot();
    const selectedFrame = getSelectedFrame(frame);
    const runtimeSession = createRuntimeSessionForInspection({
      project: resources.project,
      resolvedAssets: resources.resolvedAssets,
      resolvedArtifacts: resources.resolvedArtifacts,
      frameMode: hostSnapshot.transport.mode,
    });
    const graphResults = evaluateVizGraphs({
      session: runtimeSession,
      frame: selectedFrame,
      registry: host.getNodeRegistry(),
      inputValues: Object.fromEntries(
        (resources.project.graphs ?? []).map((graph) => [
          graph.id,
          createVizStandardGraphRuntimeInputValues(
            runtimeSession.getFrameContext(selectedFrame)
              .timeInSeconds,
            createRuntimeInputsForInspection(
              resources,
              selectedFrame,
            ),
          ),
        ]),
      ),
    });

    return {
      source: clone(resources.source),
      revision: hostSnapshot.session.revision,
      frame: selectedFrame,
      graphs: (resources.project.graphs ?? []).map((graph) => ({
        graphId: graph.id,
        name: graph.name,
        values: clone(graphResults.get(graph.id)?.values ?? {}),
        nodes: clone(graphResults.get(graph.id)?.nodes ?? {}),
        issues: clone(graphResults.get(graph.id)?.issues ?? []),
        checkpoint: runtimeSession.getGraphCheckpointBeforeOrAt(
          graph.id,
          selectedFrame,
        ),
      })),
    };
  };

  const createMutationResult = (
    transactionResult: VizEditorSessionMutationResult,
  ): VizControlMutationResult => {
    const snapshot =
      transactionResult.status === "applied"
        ? notifyProjectChange("transaction")
        : getSnapshot();
    return {
      ok: transactionResult.ok,
      snapshot,
      transactionResult,
    };
  };

  const getAudioFeatureBakeJobs = () => {
    const service = host.getServices().audioFeatureBakeJobs;
    if (!service) {
      throw new Error(
        "This Viz session host has no audio-feature bake job service.",
      );
    }
    return service;
  };

  const attachAudioFeatureBakeOutput = (
    jobId: VizJobId,
    expectedRevision?: number,
  ): VizControlMutationResult => {
    const job = getAudioFeatureBakeJobs().get(jobId);
    if (job?.status !== "succeeded" || !job.result) {
      throw new Error(
        `Audio bake job "${jobId}" has no successful output to attach.`,
      );
    }
    host.registerResolvedArtifact(job.result.resolvedArtifact);
    const artifact = job.result.artifact;
    return createMutationResult(
      host.transact(
        {
          id: `attach-${job.id}`,
          ...(expectedRevision === undefined
            ? {}
            : { expectedRevision }),
          actions: [
            {
              type: "artifact.attach",
              payload: {
                artifact: {
                  id: artifact.id,
                  kind: artifact.kind,
                  label: artifact.label,
                  sourceAssetId: artifact.sourceAssetId,
                  metadata: {
                    profile: artifact.profile,
                    executionIdentity:
                      job.result.executionIdentity,
                    sourceContentIdentity:
                      artifact.analysis?.sourceContentIdentity,
                  },
                },
              },
            },
          ],
        },
        { actor },
      ),
    );
  };

  return {
    getHost: () => host,
    openExampleProject: () => openProject(createExampleResources()),
    openProject,
    getSnapshot,
    getWorkingProject: () => host.getWorkingProject(),
    getProjectResources: () => host.getProjectResources(),
    getUiState: () => clone(host.getSnapshot().session.uiState),
    inspectProject: () => {
      const resources = host.getProjectResources();
      const snapshot = host.getSnapshot();
      return {
        source: clone(resources.source),
        revision: snapshot.session.revision,
        project: clone(resources.project),
        validation: validateProjectDocument(resources.project),
        assets: clone(resources.resolvedAssets),
        artifacts: clone(resources.resolvedArtifacts),
        issues: clone(snapshot.session.issues),
        actionHistory: clone(snapshot.session.actionHistory),
      };
    },
    setUiState: (next) => {
      host.setUiState(next);
      return getSnapshot();
    },
    inspectGraphs: () => createGraphSummaries(host.getWorkingProject()),
    inspectComponents: () =>
      clone(createComponentSummaries(host.getComponentRegistry())),
    inspectGraph: (graphId) => {
      return clone(
        host
          .getWorkingProject()
          .graphs?.find((graph) => graph.id === graphId),
      );
    },
    inspectGraphRuntime: createGraphRuntimeInspection,
    listJobs: () =>
      getAudioFeatureBakeJobs().list().map(createJobSummary),
    inspectJob: (jobId) => getAudioFeatureBakeJobs().get(jobId),
    startAudioFeatureBake: (request) =>
      getAudioFeatureBakeJobs().start(request, actor),
    cancelJob: (jobId) => getAudioFeatureBakeJobs().cancel(jobId),
    attachAudioFeatureBakeOutput,
    applyTransaction: (transaction, transactionOptions) =>
      createMutationResult(
        host.transact(transaction, {
          actor: transactionOptions?.actor ?? actor,
        }),
      ),
    applyAction: (action, transactionOptions) =>
      createMutationResult(
        host.applyAction(action, {
          actor: transactionOptions?.actor ?? actor,
        }),
      ),
    applyActions: (actions, transactionOptions) =>
      createMutationResult(
        host.applyActions(actions, {
          actor: transactionOptions?.actor ?? actor,
        }),
      ),
    undo: () => {
      const previousRevision = host.getSnapshot().session.revision;
      host.undo();
      return host.getSnapshot().session.revision === previousRevision
        ? getSnapshot()
        : notifyProjectChange("undo");
    },
    redo: () => {
      const previousRevision = host.getSnapshot().session.revision;
      host.redo();
      return host.getSnapshot().session.revision === previousRevision
        ? getSnapshot()
        : notifyProjectChange("redo");
    },
    inspectFrame: createFrameInspection,
    inspectRender: createRenderInspection,
    createDebugSnapshot: (frame) => {
      const frameInspection = createFrameInspection(frame);
      const renderInspection = createRenderInspection(frameInspection.frame);

      return {
        source: clone(renderInspection.source),
        revision: renderInspection.revision,
        frame: renderInspection.frame,
        framePlan: frameInspection.framePlan,
        renderPlan: renderInspection.renderPlan,
        svg: renderVizRenderPlanToSvgMarkup(renderInspection.renderPlan),
      };
    },
    play: () => {
      host.play();
      return getSnapshot();
    },
    pause: () => {
      host.pause();
      return getSnapshot();
    },
    seekToFrame: (frame) => {
      host.seekToFrame(frame);
      return getSnapshot();
    },
    advanceBySeconds: (seconds) => {
      host.advanceBySeconds(seconds);
      return getSnapshot();
    },
    setLoop: (loop) => {
      host.setLoop(loop);
      return getSnapshot();
    },
    setTransportDurationFrames: (durationFrames) => {
      host.setTransportDurationFrames(durationFrames);
      return getSnapshot();
    },
    setPreviewMode: (mode) => {
      host.setPreviewMode(mode);
      return getSnapshot();
    },
    attachAudioSource: (source) => {
      host.attachAudioSource(source);
      return getSnapshot();
    },
    clearAudioSource: () => {
      host.clearAudioSource();
      return getSnapshot();
    },
    setAudioAnalyzerState: (state) => {
      host.setAudioAnalyzerState(state);
      return getSnapshot();
    },
    setLiveInputAvailable: (available) => {
      host.setLiveInputAvailable(available);
      return getSnapshot();
    },
    setBakedArtifactAvailable: (available) => {
      host.setBakedArtifactAvailable(available);
      return getSnapshot();
    },
    subscribe: (listener) => {
      const unsubscribeHost = host.subscribe(() => {
        listener(getSnapshot());
      });
      const unsubscribeJobs =
        host
          .getServices()
          .audioFeatureBakeJobs?.subscribe(() => {
            listener(getSnapshot());
          }) ?? (() => {});
      return () => {
        unsubscribeHost();
        unsubscribeJobs();
      };
    },
  };
};
