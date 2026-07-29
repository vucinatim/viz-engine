import { createCoreComponentRegistry } from '@viz-engine/components-core';
import {
  type VizProjectDocument,
  type VizRenderPlan,
  type VizValueSource,
} from '@viz-engine/contracts';
import { createVizRenderPlan, createVizRuntimeSession } from '@viz-engine/runtime';
import type { Comp } from '@/components/config/create-component';
import { LayerData } from '@/lib/editor-layer-types';
import {
  createEmptyVizProjectDocument,
  toEditorComponentId,
} from '@/lib/viz-session/project-adapters';
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

export const isEditorComponentRuntimeBacked = (comp: Comp): boolean =>
  Boolean(runtimeComponentRegistry.get(toEditorComponentId(comp.name)));

export const createRuntimeRenderPlanForEditorComponentPreview = ({
  comp,
  viewportWidth,
  viewportHeight,
  time,
  configValues,
  audioFrameData,
}: {
  comp: Comp;
  viewportWidth: number;
  viewportHeight: number;
  time: number;
  configValues: Record<string, any>;
  audioFrameData: RuntimeBridgeAudioFrameData;
}): VizRenderPlan | null => {
  const componentId = toEditorComponentId(comp.name);
  if (!runtimeComponentRegistry.get(componentId)) {
    return null;
  }

  const fps = 60;
  const frame = Math.max(0, Math.floor(time * fps));
  const layerId = `component-preview-${componentId}`;
  const liveInputs: Record<string, VizValueSource> =
    componentId === 'curve-spectrum'
      ? {
          spectrum: createLiteralInput(Array.from(audioFrameData.frequencyData)),
          sampleRate: createLiteralInput(audioFrameData.sampleRate),
          fftSize: createLiteralInput(audioFrameData.fftSize),
        }
      : {};
  const project: VizProjectDocument = {
    ...createEmptyVizProjectDocument({
      projectId: `component-preview-${componentId}`,
      name: `${comp.name} Preview`,
      timeline: {
        fps,
        durationInFrames: Math.max(frame + 1, fps * 5),
      },
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
        backgroundColor: '#000000',
      },
    }),
    layerOrder: [layerId],
    layers: [
      {
        id: layerId,
        name: comp.name,
        componentId,
        enabled: true,
        opacity: 1,
        blendMode: 'normal',
        settings: structuredClone(configValues),
        inputs: liveInputs,
      },
    ],
  };
  const runtimeSession = createVizRuntimeSession({
    project,
    mode: 'live',
    seed: `component-preview-${componentId}`,
  });

  return createVizRenderPlan({
    session: runtimeSession,
    frame,
    registry: runtimeComponentRegistry,
  });
};
