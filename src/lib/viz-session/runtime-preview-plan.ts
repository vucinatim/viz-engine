import { resolveBundledStageModelAssets } from '@viz-engine/components-core';
import type {
  VizExecutionMode,
  VizProjectDocument,
  VizRenderPlan,
  VizResolvedArtifact,
  VizResolvedAsset,
  VizRuntimeAudioFrameSnapshot,
} from '@viz-engine/contracts';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import {
  createVizRenderPlan,
  createVizRuntimeSession,
  resolveVizComponentRuntimeInputValues,
  sampleProjectAudioFrameSnapshot,
  type VizComponentRuntimeCheckpoint,
  type VizGraphRuntimeCheckpoint,
  type VizRuntimeFrameInputValues,
  type VizRuntimeGraphValues,
  type VizRuntimeLayerValues,
  type VizRuntimeSession,
} from '@viz-engine/runtime';

import { studioComponentRegistry } from '@/lib/viz-capabilities';
import type {
  VizSessionRuntimePreviewAudioFrameData,
  VizSessionRuntimePreviewFrame,
} from './types';

interface RuntimePreviewSessionCache {
  revision: number;
  resourceRevision: number;
  mode: VizExecutionMode;
  fps: number;
  viewportWidth: number;
  viewportHeight: number;
  durationInFrames: number;
  project: VizProjectDocument;
  session: VizRuntimeSession;
  lastFrame?: number;
}

interface CreateRuntimePreviewPlanOptions {
  project: VizProjectDocument;
  projectRevision: number;
  frame: VizSessionRuntimePreviewFrame;
  viewport: {
    width: number;
    height: number;
  };
  audioFrameData: VizSessionRuntimePreviewAudioFrameData;
  isPlaying: boolean;
  resourceRevision?: number;
  resolvedAssets?: VizResolvedAsset[];
  resolvedArtifacts?: VizResolvedArtifact[];
  layerValues?: VizRuntimeLayerValues;
  graphValues?: VizRuntimeGraphValues;
}

const componentRegistry = studioComponentRegistry;
const nodeRegistry = createCoreNodeRegistry();
const frozenAudioByLayerId = new Map<string, VizRuntimeAudioFrameSnapshot>();
let sessionCache: RuntimePreviewSessionCache | null = null;

const toExecutionMode = (
  mode: VizSessionRuntimePreviewFrame['mode'],
): VizExecutionMode => (mode === 'export' ? 'render' : 'live');

const cloneAudioFrameData = (
  audioFrameData: VizRuntimeAudioFrameSnapshot,
): VizRuntimeAudioFrameSnapshot => ({
  frequencyData: audioFrameData.frequencyData.slice(),
  timeDomainData: audioFrameData.timeDomainData.slice(),
  sampleRate: audioFrameData.sampleRate,
  fftSize: audioFrameData.fftSize,
  minDecibels: audioFrameData.minDecibels,
  maxDecibels: audioFrameData.maxDecibels,
  provenance: audioFrameData.provenance,
  ...(audioFrameData.sourceAssetId === undefined
    ? {}
    : { sourceAssetId: audioFrameData.sourceAssetId }),
  ...(audioFrameData.artifactId === undefined
    ? {}
    : { artifactId: audioFrameData.artifactId }),
  ...(audioFrameData.artifactFrame === undefined
    ? {}
    : { artifactFrame: audioFrameData.artifactFrame }),
});

const toRuntimeAudioSnapshot = (
  audioFrameData: VizSessionRuntimePreviewAudioFrameData,
): VizRuntimeAudioFrameSnapshot => ({
  frequencyData: audioFrameData.frequencyData,
  timeDomainData: audioFrameData.timeDomainData,
  sampleRate: audioFrameData.sampleRate,
  fftSize: audioFrameData.fftSize,
  minDecibels: audioFrameData.minDecibels ?? -90,
  maxDecibels: audioFrameData.maxDecibels ?? -10,
  provenance: audioFrameData.provenance ?? 'live',
  ...(audioFrameData.sourceAssetId === undefined
    ? {}
    : { sourceAssetId: audioFrameData.sourceAssetId }),
  ...(audioFrameData.artifactId === undefined
    ? {}
    : { artifactId: audioFrameData.artifactId }),
  ...(audioFrameData.artifactFrame === undefined
    ? {}
    : { artifactFrame: audioFrameData.artifactFrame }),
});

const createSessionProject = ({
  project,
  frame,
  viewport,
}: Pick<
  CreateRuntimePreviewPlanOptions,
  'project' | 'frame' | 'viewport'
>) => ({
  ...project,
  timeline: {
    ...project.timeline,
    fps: frame.fps,
    durationInFrames: Math.max(
      project.timeline.durationInFrames,
      frame.currentFrame + 1,
    ),
  },
  viewport: {
    ...project.viewport,
    width: viewport.width,
    height: viewport.height,
  },
});

const createGraphRuntimeIdentity = (
  graph: NonNullable<VizProjectDocument['graphs']>[number],
): string =>
  JSON.stringify({
    id: graph.id,
    enabled: graph.enabled,
    inputs: graph.inputs,
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      inputs: node.inputs,
    })),
    outputs: graph.outputs.map((output) => ({
      key: output.key,
      nodeId: output.nodeId,
      output: output.output,
    })),
  });

const collectReusableGraphCheckpoints = (
  cached: RuntimePreviewSessionCache,
  options: CreateRuntimePreviewPlanOptions,
  mode: VizExecutionMode,
): VizGraphRuntimeCheckpoint[] => {
  if (
    cached.resourceRevision !== (options.resourceRevision ?? 0) ||
    cached.mode !== mode ||
    cached.fps !== options.frame.fps
  ) {
    return [];
  }

  const previousGraphs = new Map(
    (cached.project.graphs ?? []).map((graph) => [graph.id, graph]),
  );
  return (options.project.graphs ?? []).flatMap((graph) => {
    const previous = previousGraphs.get(graph.id);
    if (
      !previous ||
      (previous !== graph &&
        createGraphRuntimeIdentity(previous) !==
          createGraphRuntimeIdentity(graph))
    ) {
      return [];
    }
    const checkpoint = cached.session.getGraphCheckpointBeforeOrAt(
      graph.id,
      options.frame.currentFrame,
    );
    return checkpoint ? [checkpoint] : [];
  });
};

const createComponentRuntimeIdentity = (
  project: VizProjectDocument,
  layer: VizProjectDocument['layers'][number],
): string => {
  const referencedGraphIds = new Set(
    Object.values(layer.inputs ?? {}).flatMap((source) =>
      source.kind === 'graph-output' ? [source.graphId] : [],
    ),
  );
  return JSON.stringify({
    componentId: layer.componentId,
    enabled: layer.enabled,
    settings: layer.settings,
    inputs: layer.inputs,
    graphs: (project.graphs ?? [])
      .filter((graph) => referencedGraphIds.has(graph.id))
      .map(createGraphRuntimeIdentity),
  });
};

const collectReusableComponentCheckpoints = (
  cached: RuntimePreviewSessionCache,
  options: CreateRuntimePreviewPlanOptions,
  mode: VizExecutionMode,
): VizComponentRuntimeCheckpoint[] => {
  if (
    cached.resourceRevision !== (options.resourceRevision ?? 0) ||
    cached.mode !== mode ||
    cached.fps !== options.frame.fps ||
    cached.viewportWidth !== options.viewport.width ||
    cached.viewportHeight !== options.viewport.height
  ) {
    return [];
  }

  const previousLayers = new Map(
    cached.project.layers.map((layer) => [layer.id, layer]),
  );
  return options.project.layers.flatMap((layer) => {
    const component = componentRegistry.get(layer.componentId);
    const previous = previousLayers.get(layer.id);
    if (
      !component?.temporal ||
      !previous ||
      createComponentRuntimeIdentity(cached.project, previous) !==
        createComponentRuntimeIdentity(options.project, layer)
    ) {
      return [];
    }
    const checkpoint = cached.session.getComponentCheckpointBeforeOrAt(
      layer.id,
      component.id,
      component.implementationVersion,
      options.frame.currentFrame,
    );
    return checkpoint ? [checkpoint] : [];
  });
};

const hasEquivalentRuntimeProject = (
  cached: RuntimePreviewSessionCache,
  project: VizProjectDocument,
): boolean => {
  if (
    cached.project.timeline !== project.timeline ||
    cached.project.layers !== project.layers ||
    cached.project.layerOrder !== project.layerOrder ||
    cached.project.assetRefs !== project.assetRefs ||
    cached.project.artifactRefs !== project.artifactRefs ||
    cached.project.viewport.backgroundColor !== project.viewport.backgroundColor
  ) {
    return false;
  }

  const previousGraphs = cached.project.graphs ?? [];
  const nextGraphs = project.graphs ?? [];
  return (
    previousGraphs.length === nextGraphs.length &&
    previousGraphs.every((graph, index) => {
      const nextGraph = nextGraphs[index];
      return (
        nextGraph !== undefined &&
        (graph === nextGraph ||
          createGraphRuntimeIdentity(graph) ===
            createGraphRuntimeIdentity(nextGraph))
      );
    })
  );
};

const getRuntimeSession = (
  options: CreateRuntimePreviewPlanOptions,
): VizRuntimeSession => {
  const mode = toExecutionMode(options.frame.mode);
  const cached = sessionCache;
  const hasLiveDiscontinuity =
    cached !== null &&
    (options.audioFrameData.provenance ?? 'live') === 'live' &&
    cached.lastFrame !== undefined &&
    options.frame.currentFrame !== cached.lastFrame &&
    options.frame.currentFrame !== cached.lastFrame + 1;

  if (
    cached &&
    !hasLiveDiscontinuity &&
    cached.revision === options.projectRevision &&
    cached.resourceRevision === (options.resourceRevision ?? 0) &&
    cached.mode === mode &&
    cached.fps === options.frame.fps &&
    cached.viewportWidth === options.viewport.width &&
    cached.viewportHeight === options.viewport.height &&
    cached.durationInFrames >= options.frame.currentFrame + 1
  ) {
    return cached.session;
  }

  if (
    cached &&
    !hasLiveDiscontinuity &&
    cached.resourceRevision === (options.resourceRevision ?? 0) &&
    cached.mode === mode &&
    cached.fps === options.frame.fps &&
    cached.viewportWidth === options.viewport.width &&
    cached.viewportHeight === options.viewport.height &&
    cached.durationInFrames >= options.frame.currentFrame + 1 &&
    hasEquivalentRuntimeProject(cached, options.project)
  ) {
    sessionCache = {
      ...cached,
      revision: options.projectRevision,
      project: options.project,
    };
    return cached.session;
  }

  const bundledAssets = resolveBundledStageModelAssets(
    options.project.assetRefs ?? [],
  );
  const resolvedAssets = new Map(
    bundledAssets.map((asset) => [asset.id, asset]),
  );
  for (const asset of options.resolvedAssets ?? []) {
    resolvedAssets.set(asset.id, asset);
  }
  const session = createVizRuntimeSession({
    project: createSessionProject(options),
    mode,
    seed: 'editor-runtime-preview',
    resolvedAssets: [...resolvedAssets.values()],
    resolvedArtifacts: options.resolvedArtifacts ?? [],
    initialGraphCheckpoints: cached
      ? hasLiveDiscontinuity
        ? []
        : collectReusableGraphCheckpoints(cached, options, mode)
      : [],
    initialComponentCheckpoints: cached
      ? hasLiveDiscontinuity
        ? []
        : collectReusableComponentCheckpoints(cached, options, mode)
      : [],
  });
  sessionCache = {
    revision: options.projectRevision,
    resourceRevision: options.resourceRevision ?? 0,
    mode,
    fps: options.frame.fps,
    viewportWidth: options.viewport.width,
    viewportHeight: options.viewport.height,
    durationInFrames: session.project.timeline.durationInFrames,
    project: options.project,
    session,
  };
  frozenAudioByLayerId.clear();
  return session;
};

const createFrameInputValues = ({
  project,
  frame,
  audioFrameData,
  isPlaying,
}: CreateRuntimePreviewPlanOptions): VizRuntimeFrameInputValues => {
  const runtimeAudio = toRuntimeAudioSnapshot(audioFrameData);
  const activeLayerIds = new Set(project.layers.map((layer) => layer.id));

  for (const layerId of frozenAudioByLayerId.keys()) {
    if (!activeLayerIds.has(layerId)) {
      frozenAudioByLayerId.delete(layerId);
    }
  }

  return Object.fromEntries(
    project.layers.flatMap((layer) => {
      const shouldFreeze =
        frame.mode === 'live' &&
        layer.surface?.freezeWhenPaused !== false &&
        !isPlaying;
      if (!shouldFreeze) {
        frozenAudioByLayerId.set(layer.id, cloneAudioFrameData(runtimeAudio));
        return [];
      }

      const component = componentRegistry.get(layer.componentId);
      if (!component) {
        return [];
      }
      const layerAudio =
        frozenAudioByLayerId.get(layer.id) ?? cloneAudioFrameData(runtimeAudio);
      const values = resolveVizComponentRuntimeInputValues(component, {
        audio: layerAudio,
      });
      if (Object.keys(values).length === 0) {
        return [];
      }
      return [[layer.id, values]];
    }),
  );
};

export const createVizSessionRuntimePreviewPlan = (
  options: CreateRuntimePreviewPlanOptions,
): VizRenderPlan => {
  const session = getRuntimeSession(options);

  const plan = createVizRenderPlan({
    session,
    frame: options.frame.currentFrame,
    registry: componentRegistry,
    nodeRegistry,
    inputValues: createFrameInputValues(options),
    layerValues: options.layerValues,
    graphValues: options.graphValues,
    runtimeInputs: {
      audio: toRuntimeAudioSnapshot(options.audioFrameData),
    },
    runtimeInputProvider: (requestedFrame) => {
      const audio = sampleProjectAudioFrameSnapshot(
        options.project,
        options.resolvedArtifacts ?? [],
        requestedFrame,
      );
      return audio === undefined ? undefined : { audio };
    },
  });
  if (sessionCache?.session === session) {
    sessionCache.lastFrame = options.frame.currentFrame;
  }
  return plan;
};

export const resetVizSessionRuntimePreviewPlanCache = (): void => {
  sessionCache = null;
  frozenAudioByLayerId.clear();
};
