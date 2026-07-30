import type { Comp } from '@/components/config/create-component';
import {
  applyEditorDefaultNetworks,
  createEmptyVizProjectDocument,
  toEditorComponentId,
} from '@/lib/viz-session/project-adapters';
import {
  createCoreComponentRegistry,
  resolveBundledStageModelAssets,
} from '@viz-engine/components-core';
import type { VizProjectDocument, VizRenderPlan } from '@viz-engine/contracts';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import {
  applyVizComponentDefaultAssets,
  createVizRenderPlan,
  createVizRuntimeSession,
} from '@viz-engine/runtime';

const componentRegistry = createCoreComponentRegistry();
const nodeRegistry = createCoreNodeRegistry();

export interface EditorComponentPreviewAudioFrameData {
  frequencyData: Uint8Array;
  timeDomainData?: Uint8Array;
  sampleRate: number;
  fftSize: number;
}

export const isEditorComponentRuntimeBacked = (comp: Comp): boolean =>
  Boolean(componentRegistry.get(toEditorComponentId(comp.name)));

export const createEditorComponentPreviewPlan = ({
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
  audioFrameData: EditorComponentPreviewAudioFrameData;
}): VizRenderPlan => {
  const componentId = toEditorComponentId(comp.name);
  if (!componentRegistry.get(componentId)) {
    throw new Error(
      `Missing runtime component "${componentId}" for the editor catalog.`,
    );
  }

  const fps = 60;
  const frame = Math.max(0, Math.floor(time * fps));
  const layerId = `component-preview-${componentId}`;
  const baseProject: VizProjectDocument = {
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
      },
    ],
  };
  const projectWithNetworks = applyEditorDefaultNetworks({
    project: baseProject,
    layerId,
    comp,
  });
  const project = applyVizComponentDefaultAssets(
    projectWithNetworks,
    (candidateId) => componentRegistry.get(candidateId),
  );
  const session = createVizRuntimeSession({
    project,
    mode: 'live',
    seed: `component-preview-${componentId}`,
    resolvedAssets: resolveBundledStageModelAssets(
      project.assetRefs ?? [],
    ),
  });

  return createVizRenderPlan({
    session,
    frame,
    registry: componentRegistry,
    nodeRegistry,
    runtimeInputs: {
      audio: {
        frequencyData: audioFrameData.frequencyData,
        timeDomainData:
          audioFrameData.timeDomainData ?? new Uint8Array(),
        sampleRate: audioFrameData.sampleRate,
        fftSize: audioFrameData.fftSize,
        minDecibels: -90,
        maxDecibels: -10,
        provenance: 'live',
      },
    },
  });
};
