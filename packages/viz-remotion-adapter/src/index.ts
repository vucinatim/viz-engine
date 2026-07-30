import type {
  VizExecutionMode,
  VizProjectDocument,
  VizRenderPlan,
  VizResolvedArtifact,
  VizResolvedAsset,
} from '@viz-engine/contracts';
import { renderVizRenderPlanToSvgMarkup } from '@viz-engine/renderer-svg';
import {
  createVizRenderPlan,
  createVizRuntimeSession,
  sampleProjectAudioFrameSnapshot,
  type VizComponentRegistry,
  type VizNodeRegistry,
} from '@viz-engine/runtime';

export interface VizRemotionCompositionConfig {
  id: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}

export interface CreateVizRemotionFrameStateOptions {
  project: VizProjectDocument;
  frame: number;
  mode?: Extract<VizExecutionMode, 'render' | 'bake'>;
  resolvedAssets?: VizResolvedAsset[];
  resolvedArtifacts?: VizResolvedArtifact[];
  seed?: string;
}

export interface CreateVizRemotionRenderPlanOptions extends CreateVizRemotionFrameStateOptions {
  registry: VizComponentRegistry;
  nodeRegistry?: VizNodeRegistry;
}

export const createVizRemotionCompositionConfig = (
  project: VizProjectDocument,
): VizRemotionCompositionConfig => {
  return {
    id: project.projectId,
    width: project.viewport.width,
    height: project.viewport.height,
    fps: project.timeline.fps,
    durationInFrames: project.timeline.durationInFrames,
  };
};

export const createVizRemotionFrameState = ({
  project,
  frame,
  mode = 'render',
  resolvedAssets,
  resolvedArtifacts,
  seed,
}: CreateVizRemotionFrameStateOptions) => {
  const sessionOptions = {
    project,
    mode,
    ...(resolvedAssets === undefined ? {} : { resolvedAssets }),
    ...(resolvedArtifacts === undefined ? {} : { resolvedArtifacts }),
    ...(seed === undefined ? {} : { seed }),
  };

  const session = createVizRuntimeSession(sessionOptions);

  return {
    composition: createVizRemotionCompositionConfig(project),
    frameContext: session.getFrameContext(frame),
    layers: session.getOrderedLayers(),
  };
};

export const createVizRemotionRenderPlan = ({
  registry,
  nodeRegistry,
  ...options
}: CreateVizRemotionRenderPlanOptions): VizRenderPlan => {
  const session = createVizRuntimeSession({
    project: options.project,
    mode: options.mode ?? 'render',
    ...(options.resolvedAssets === undefined
      ? {}
      : { resolvedAssets: options.resolvedAssets }),
    ...(options.resolvedArtifacts === undefined
      ? {}
      : { resolvedArtifacts: options.resolvedArtifacts }),
    ...(options.seed === undefined ? {} : { seed: options.seed }),
  });

  return createVizRenderPlan({
    session,
    frame: options.frame,
    registry,
    ...(nodeRegistry === undefined ? {} : { nodeRegistry }),
    runtimeInputProvider: (frame) => {
      const audio = sampleProjectAudioFrameSnapshot(
        options.project,
        options.resolvedArtifacts ?? [],
        frame,
      );
      return audio === undefined ? {} : { audio };
    },
  });
};

export const createVizRemotionSvgMarkup = (
  options: CreateVizRemotionRenderPlanOptions,
): string => {
  const renderPlan = createVizRemotionRenderPlan(options);
  return renderVizRenderPlanToSvgMarkup(renderPlan);
};
