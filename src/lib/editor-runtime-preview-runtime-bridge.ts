import { createCoreComponentRegistry } from '@viz-engine/components-core';
import {
  type VizProjectDocument,
  type VizRenderPlan,
  type VizValueSource,
} from '@viz-engine/contracts';
import { createVizRenderPlan, createVizRuntimeSession } from '@viz-engine/runtime';
import { LayerData } from '@/lib/editor-layer-types';
import { vizSessionStore } from '@/lib/viz-session';
import type { VizSessionRuntimePreviewFrame } from '@/lib/viz-session/types';

const runtimeComponentRegistry = createCoreComponentRegistry();

type RuntimeBridgeAudioFrameData = {
  frequencyData: Uint8Array;
  sampleRate: number;
  fftSize: number;
};

const createLiteralInput = (value: unknown): VizValueSource => ({
  kind: 'literal',
  value,
});

const buildEditorLayerRuntimeProject = ({
  layer,
  viewportWidth,
  viewportHeight,
  frame,
  configValues,
  audioFrameData,
}: {
  layer: LayerData;
  viewportWidth: number;
  viewportHeight: number;
  frame: VizSessionRuntimePreviewFrame;
  configValues: Record<string, any>;
  audioFrameData: RuntimeBridgeAudioFrameData;
}): VizProjectDocument => {
  const workingProject = vizSessionStore.getState().project.workingProject;
  const sourceLayer = workingProject.layers.find(
    (candidate) => candidate.id === layer.id,
  );
  if (!sourceLayer) {
    throw new Error(`Missing canonical layer "${layer.id}" for runtime preview.`);
  }

  const liveInputs: Record<string, VizValueSource> =
    sourceLayer.componentId === 'curve-spectrum'
      ? {
          spectrum: createLiteralInput(Array.from(audioFrameData.frequencyData)),
          sampleRate: createLiteralInput(audioFrameData.sampleRate),
          fftSize: createLiteralInput(audioFrameData.fftSize),
        }
      : {};

  return {
    ...workingProject,
    timeline: {
      ...workingProject.timeline,
      fps: frame.fps,
      durationInFrames: Math.max(frame.currentFrame + 1, 1),
    },
    viewport: {
      ...workingProject.viewport,
      width: viewportWidth,
      height: viewportHeight,
    },
    layerOrder: [layer.id],
    layers: [
      {
        ...sourceLayer,
        settings: structuredClone(configValues),
        inputs: {
          ...(sourceLayer.inputs ?? {}),
          ...liveInputs,
        },
      },
    ],
  };
};

const toVizExecutionMode = (mode: VizSessionRuntimePreviewFrame['mode']) => {
  return mode === 'export' ? 'render' : 'live';
};

export const createRuntimeRenderPlanForEditorLayer = ({
  layer,
  viewportWidth,
  viewportHeight,
  frame,
  configValues,
  audioFrameData,
}: {
  layer: LayerData;
  viewportWidth: number;
  viewportHeight: number;
  frame: VizSessionRuntimePreviewFrame;
  configValues: Record<string, any>;
  audioFrameData: RuntimeBridgeAudioFrameData;
}): VizRenderPlan | null => {
  const workingProject = vizSessionStore.getState().project.workingProject;
  const sourceLayer = workingProject.layers.find(
    (candidate) => candidate.id === layer.id,
  );

  if (!sourceLayer || !runtimeComponentRegistry.get(sourceLayer.componentId)) {
    return null;
  }

  const project = buildEditorLayerRuntimeProject({
    layer,
    viewportWidth,
    viewportHeight,
    frame,
    configValues,
    audioFrameData,
  });

  const runtimeSession = createVizRuntimeSession({
    project,
    mode: toVizExecutionMode(frame.mode),
    seed: `editor-runtime-preview-${layer.id}`,
  });

  return createVizRenderPlan({
    session: runtimeSession,
    frame: frame.currentFrame,
    registry: runtimeComponentRegistry,
  });
};
