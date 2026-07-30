import {
  createCoreComponentRegistry,
  resolveBundledStageModelAssets,
} from '@viz-engine/components-core';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import type {
  VizExecutionMode,
  VizProjectDocument,
  VizRenderPlan,
  VizRuntimeAudioFrameSnapshot,
} from '@viz-engine/contracts';
import {
  createVizRenderPlan,
  createVizRuntimeSession,
  resolveVizComponentRuntimeInputValues,
  type VizRuntimeFrameInputValues,
  type VizRuntimeSession,
} from '@viz-engine/runtime';

import type {
  VizSessionRuntimePreviewAudioFrameData,
  VizSessionRuntimePreviewFrame,
} from './types';

interface RuntimePreviewSessionCache {
  revision: number;
  mode: VizExecutionMode;
  fps: number;
  viewportWidth: number;
  viewportHeight: number;
  durationInFrames: number;
  session: VizRuntimeSession;
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
}

const componentRegistry = createCoreComponentRegistry();
const nodeRegistry = createCoreNodeRegistry();
const frozenAudioByLayerId = new Map<
  string,
  VizRuntimeAudioFrameSnapshot
>();
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
}: Pick<CreateRuntimePreviewPlanOptions, 'project' | 'frame' | 'viewport'>) => ({
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

const getRuntimeSession = (
  options: CreateRuntimePreviewPlanOptions,
): VizRuntimeSession => {
  const mode = toExecutionMode(options.frame.mode);
  const cached = sessionCache;

  if (
    cached &&
    cached.revision === options.projectRevision &&
    cached.mode === mode &&
    cached.fps === options.frame.fps &&
    cached.viewportWidth === options.viewport.width &&
    cached.viewportHeight === options.viewport.height &&
    cached.durationInFrames >= options.frame.currentFrame + 1
  ) {
    return cached.session;
  }

  const session = createVizRuntimeSession({
    project: createSessionProject(options),
    mode,
    seed: 'editor-runtime-preview',
    resolvedAssets: resolveBundledStageModelAssets(
      options.project.assetRefs ?? [],
    ),
  });
  sessionCache = {
    revision: options.projectRevision,
    mode,
    fps: options.frame.fps,
    viewportWidth: options.viewport.width,
    viewportHeight: options.viewport.height,
    durationInFrames: session.project.timeline.durationInFrames,
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
        frozenAudioByLayerId.set(
          layer.id,
          cloneAudioFrameData(runtimeAudio),
        );
        return [];
      }

      const component = componentRegistry.get(layer.componentId);
      if (!component) {
        return [];
      }
      const layerAudio =
        frozenAudioByLayerId.get(layer.id) ??
        cloneAudioFrameData(runtimeAudio);
      const values = resolveVizComponentRuntimeInputValues(component, {
        audio: layerAudio,
      });
      if (Object.keys(values).length === 0) {
        return [];
      }
      return [
        [
          layer.id,
          values,
        ],
      ];
    }),
  );
};

export const createVizSessionRuntimePreviewPlan = (
  options: CreateRuntimePreviewPlanOptions,
): VizRenderPlan => {
  const session = getRuntimeSession(options);

  return createVizRenderPlan({
    session,
    frame: options.frame.currentFrame,
    registry: componentRegistry,
    nodeRegistry,
    inputValues: createFrameInputValues(options),
    runtimeInputs: {
      audio: toRuntimeAudioSnapshot(options.audioFrameData),
    },
  });
};

export const resetVizSessionRuntimePreviewPlanCache = (): void => {
  sessionCache = null;
  frozenAudioByLayerId.clear();
};
