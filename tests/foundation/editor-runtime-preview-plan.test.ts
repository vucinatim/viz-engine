import { describe, expect, it } from 'vitest';

import { CompDefinitionMap } from '@/components/comps';
import { NodeDefinitionMap } from '@/components/node-network/animation-nodes';
import {
  createEditorComponentPreviewPlan,
  isEditorComponentRuntimeBacked,
} from '@/lib/editor-component-preview-plan';
import { studioCatalogComponents } from '@/lib/viz-capabilities';
import { createVizSessionRuntimePreviewFrame } from '@/lib/viz-session';
import {
  createVizSessionRuntimePreviewPlan,
  resetVizSessionRuntimePreviewPlanCache,
} from '@/lib/viz-session/runtime-preview-plan';
import { createCoreComponentRegistry } from '@viz-engine/components-core';
import type { VizAudioFeatureTimelineArtifact } from '@viz-engine/contracts';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import {
  SIGNAL_CATHEDRAL_AUDIO_ARTIFACT_ID,
  SIGNAL_CATHEDRAL_AUDIO_ASSET_ID,
  SIGNAL_CATHEDRAL_GRAPH_ID,
  createSignalCathedralProject,
} from '@viz-engine/production-signal-cathedral';
import { applyVizComponentDefaultAssets } from '@viz-engine/runtime';
import { createTestProject } from './viz-session-test-utils';

const FullscreenShader = CompDefinitionMap.get('Fullscreen Shader')!;
const StageScene = CompDefinitionMap.get('Stage Scene')!;

const audioFrameData = {
  frequencyData: Uint8Array.from({ length: 128 }, (_, index) =>
    Math.max(0, 255 - index * 2),
  ),
  timeDomainData: new Uint8Array(128),
  sampleRate: 44100,
  fftSize: 2048,
};

describe('Editor runtime preview planning', () => {
  it('keeps the runtime session across graph-layout-only revisions', () => {
    resetVizSessionRuntimePreviewPlanCache();
    const project = createTestProject(FullscreenShader, 'layout-only-layer');
    project.graphs = [
      {
        id: 'layout-only-graph',
        name: 'Layout-only graph',
        enabled: true,
        nodes: [
          {
            id: 'constant',
            type: 'Constant',
            position: { x: 10, y: 20 },
            inputs: {
              value: { kind: 'literal', value: 0.5 },
            },
          },
        ],
        outputs: [
          {
            key: 'value',
            nodeId: 'constant',
            output: 'value',
          },
        ],
      },
    ];
    const frame = createVizSessionRuntimePreviewFrame({
      currentFrame: 12,
      time: 0.2,
      dt: 1 / 60,
      fps: 60,
      mode: 'live',
    });
    const firstPlan = createVizSessionRuntimePreviewPlan({
      project,
      projectRevision: 1,
      frame,
      viewport: { width: 640, height: 360 },
      audioFrameData,
      isPlaying: true,
    });
    const nextProject = {
      ...project,
      graphs: project.graphs.map((graph) => ({
        ...graph,
        nodes: graph.nodes.map((node) => ({
          ...node,
          position: { x: 30, y: 40 },
        })),
      })),
    };
    const nextPlan = createVizSessionRuntimePreviewPlan({
      project: nextProject,
      projectRevision: 2,
      frame,
      viewport: { width: 640, height: 360 },
      audioFrameData,
      isPlaying: true,
    });

    expect(nextPlan.viewport).toBe(firstPlan.viewport);
    expect(nextPlan.graphResults).toStrictEqual(firstPlan.graphResults);
  });

  it('evaluates the complete canonical project into one runtime plan', () => {
    const components = Array.from(CompDefinitionMap.values());
    const first = components[0];
    const second = components[1];
    if (!first || !second) {
      throw new Error('Expected at least two editor components.');
    }

    const firstProject = createTestProject(first, 'runtime-layer-a');
    const secondProject = createTestProject(second, 'runtime-layer-b');
    const project = {
      ...firstProject,
      layerOrder: ['runtime-layer-a', 'runtime-layer-b'],
      layers: [firstProject.layers[0]!, secondProject.layers[0]!],
    };
    const frame = createVizSessionRuntimePreviewFrame({
      currentFrame: 24,
      time: 0.8,
      dt: 1 / 30,
      fps: 30,
      mode: 'live',
    });

    const renderPlan = createVizSessionRuntimePreviewPlan({
      project,
      projectRevision: 1,
      frame,
      viewport: { width: 640, height: 360 },
      audioFrameData,
      isPlaying: true,
    });

    expect(renderPlan.layers.map((layer) => layer.layerId)).toEqual([
      'runtime-layer-a',
      'runtime-layer-b',
    ]);
    expect(renderPlan.layers.every((layer) => layer.node)).toBe(true);
    expect(renderPlan.issues).toEqual([]);
  });

  it('injects one shared frame audio snapshot through runtime inputs', () => {
    const curveSpectrum = CompDefinitionMap.get('Curve Spectrum');
    if (!curveSpectrum) {
      throw new Error('Expected Curve Spectrum component.');
    }
    const project = createTestProject(curveSpectrum, 'curve-spectrum-runtime');
    const renderPlan = createVizSessionRuntimePreviewPlan({
      project,
      projectRevision: 2,
      frame: createVizSessionRuntimePreviewFrame({
        currentFrame: 12,
        time: 0.4,
        dt: 1 / 30,
        fps: 30,
        mode: 'live',
      }),
      viewport: { width: 640, height: 360 },
      audioFrameData,
      isPlaying: true,
    });

    expect(renderPlan.layers[0]?.resolvedInputs.spectrum?.value).toBe(
      audioFrameData.frequencyData,
    );
    const node = renderPlan.layers[0]?.node;
    if (!node || node.kind !== 'group') {
      throw new Error('Expected Curve Spectrum group node.');
    }
    expect(
      node.children.filter((child) => child.kind === 'polyline'),
    ).toHaveLength(1);
    expect(node.children.some((child) => child.kind === 'group')).toBe(false);
    expect(renderPlan.issues).toEqual([]);
  });

  it('resolves baked graph features from the live session resources', () => {
    const series = (name: string, value: number) => ({
      name,
      unit: 'unit' as const,
      normalization: 'custom' as const,
      values: Array.from({ length: 720 }, () => value),
    });
    const artifact: VizAudioFeatureTimelineArtifact = {
      schemaVersion: 1,
      id: SIGNAL_CATHEDRAL_AUDIO_ARTIFACT_ID,
      kind: 'audio-feature-timeline',
      label: 'Preview resource fixture',
      sourceAssetId: SIGNAL_CATHEDRAL_AUDIO_ASSET_ID,
      profile: 'standard',
      sourceWindow: {
        startSample: 0,
        sampleCount: 576_000,
        startSeconds: 0,
        durationSeconds: 12,
      },
      frameAlignment: {
        fps: 60,
        frameCount: 720,
        alignment: 'frame-centered',
      },
      featureSeries: [
        series('bass-energy', 0.5),
        series('mid-energy', 0.4),
        series('loudness', 0.6),
        series('treble-energy', 0.3),
        series('onset-strength', 0.2),
        series('spectral-flux', 0.1),
      ],
    };
    const project = createSignalCathedralProject({
      audioArtifactRef: artifact,
    });
    const renderPlan = createVizSessionRuntimePreviewPlan({
      project,
      projectRevision: 8,
      resourceRevision: 3,
      resolvedArtifacts: [
        {
          id: artifact.id,
          kind: artifact.kind,
          uri: 'memory://preview-resource-fixture.json',
          payload: artifact,
        },
      ],
      frame: createVizSessionRuntimePreviewFrame({
        currentFrame: 120,
        time: 2,
        dt: 1 / 60,
        fps: 60,
        mode: 'live',
      }),
      viewport: { width: 640, height: 360 },
      audioFrameData,
      isPlaying: true,
    });

    const graph = renderPlan.graphResults.find(
      (candidate) => candidate.graphId === SIGNAL_CATHEDRAL_GRAPH_ID,
    );
    expect(graph?.issues).toEqual([]);
    expect(graph?.values.structurePulse).toBeCloseTo(0.62);
    expect(graph?.values.coreEnergy).toBeCloseTo(0.48);
    expect(graph?.values.spectralShimmer).toBeCloseTo(0.402);
    expect(graph?.values.shockwaveTrigger).toBeCloseTo(0.34);
    expect(graph?.values.bloomAccent).toBeCloseTo(0.145);
  });

  it('evaluates editor node graphs into runtime component settings', () => {
    const project = createTestProject(FullscreenShader, 'node-driven-shader');
    project.graphs = [
      {
        id: 'node-driven-shader:speed',
        name: 'Shader speed',
        enabled: true,
        nodes: [
          {
            id: 'input',
            type: 'Input',
          },
          {
            id: 'sine',
            type: 'Sine',
            inputs: {
              time: {
                kind: 'node-output',
                nodeId: 'input',
                output: 'time',
              },
              frequency: { kind: 'literal', value: 1 },
              phase: { kind: 'literal', value: 0 },
              amplitude: { kind: 'literal', value: 1 },
            },
          },
          {
            id: 'normalize',
            type: 'Normalize',
            inputs: {
              value: {
                kind: 'node-output',
                nodeId: 'sine',
                output: 'value',
              },
              inputMin: { kind: 'literal', value: -1 },
              inputMax: { kind: 'literal', value: 1 },
              outputMin: { kind: 'literal', value: 0 },
              outputMax: { kind: 'literal', value: 4 },
            },
          },
          {
            id: 'output',
            type: 'Output',
            inputs: {
              output: {
                kind: 'node-output',
                nodeId: 'normalize',
                output: 'result',
              },
            },
          },
        ],
        outputs: [
          {
            key: 'value',
            nodeId: 'output',
            output: 'value',
          },
        ],
      },
    ];
    project.layers[0]!.inputs = {
      speed: {
        kind: 'graph-output',
        graphId: 'node-driven-shader:speed',
        output: 'value',
      },
    };
    const renderPlan = createVizSessionRuntimePreviewPlan({
      project,
      projectRevision: 3,
      frame: createVizSessionRuntimePreviewFrame({
        currentFrame: 15,
        time: 0.25,
        dt: 1 / 60,
        fps: 60,
        mode: 'live',
      }),
      viewport: { width: 640, height: 360 },
      audioFrameData,
      isPlaying: true,
    });

    expect(renderPlan.layers[0]?.resolvedInputs.speed?.value).toBeCloseTo(4);
    expect(renderPlan.layers[0]?.resolvedSettings?.speed).toBeCloseTo(4);
    const node = renderPlan.layers[0]?.node;
    if (!node || node.kind !== 'shader') {
      throw new Error('Expected a shader runtime node.');
    }
    expect(node.uniforms.uTime).toBeCloseTo(1);
    expect(renderPlan.issues).toEqual([]);
  });

  it('registers every editor graph node kernel with the canonical runtime', () => {
    const registry = createCoreNodeRegistry();

    for (const nodeType of NodeDefinitionMap.keys()) {
      expect(registry.get(nodeType), nodeType).toBeDefined();
    }
    expect(registry.get('Output')).toBeDefined();
  });

  it('builds component-catalog previews through the package registry', () => {
    const renderPlan = createEditorComponentPreviewPlan({
      comp: FullscreenShader,
      viewportWidth: 320,
      viewportHeight: 180,
      time: 0.5,
      configValues: {
        ...FullscreenShader.defaultValues,
        shader: 'Cyber Grid',
        speed: 2,
      },
      audioFrameData,
    });

    expect(isEditorComponentRuntimeBacked(FullscreenShader)).toBe(true);
    expect(renderPlan.issues).toEqual([]);

    const node = renderPlan.layers[0]?.node;
    if (!node || node.kind !== 'shader') {
      throw new Error('Expected catalog preview shader render node.');
    }

    expect(node.programId).toBe('viz-core/fullscreen-shader/Cyber Grid');
    expect(node.uniforms.uTime).toBe(1);
    expect(node.uniforms.uResolution).toEqual({
      type: 'vec2',
      value: [320, 180],
    });
  });

  it('keeps all preserved editor components runtime-backed and callback-free', () => {
    const components = Array.from(CompDefinitionMap.values());

    expect(components).toHaveLength(studioCatalogComponents.length);
    for (const comp of components) {
      expect(isEditorComponentRuntimeBacked(comp)).toBe(true);
      expect(comp).not.toHaveProperty('draw');
      expect(comp).not.toHaveProperty('init3D');
      expect(comp).not.toHaveProperty('draw3D');
      expect(comp).not.toHaveProperty('createState');
    }
  });

  it('keeps editor action buttons out of canonical runtime settings', () => {
    expect(StageScene.defaultValues.camera.enterWasdMode).toBeNull();
    expect(() => structuredClone(StageScene.defaultValues)).not.toThrow();
  });

  it('attaches and materializes the canonical Stage character assets', () => {
    const renderPlan = createEditorComponentPreviewPlan({
      comp: StageScene,
      viewportWidth: 640,
      viewportHeight: 360,
      time: 1.25,
      configValues: StageScene.defaultValues,
      audioFrameData,
    });
    const node = renderPlan.layers[0]?.node;
    if (!node || node.kind !== 'three-program') {
      throw new Error('Expected a Stage Three program node.');
    }

    expect(renderPlan.issues).toEqual([]);
    expect(renderPlan.materializedAssets).toHaveLength(4);
    expect(
      renderPlan.materializedAssets.every((asset) => asset.kind === 'model'),
    ).toBe(true);
    expect(node.parameters).toMatchObject({
      djModelAssetId: 'viz-builtin-stage-female-dj',
      crowdModelAssetIds: [
        'viz-builtin-stage-female-dancer',
        'viz-builtin-stage-male-dancer',
        'viz-builtin-stage-male-cheer',
      ],
      characterAnimationSpeed: 1,
    });
  });

  it('does not attach a default model when a Stage input is customized', () => {
    const project = createTestProject(StageScene, 'custom-stage-model');
    project.assetRefs = [
      {
        id: 'custom-dj',
        kind: 'model',
        source: 'local',
        label: 'Custom DJ',
      },
    ];
    project.layers[0]!.inputs = {
      djModel: {
        kind: 'asset-ref',
        assetId: 'custom-dj',
      },
    };
    const registry = createCoreComponentRegistry();
    const normalized = applyVizComponentDefaultAssets(project, (componentId) =>
      registry.get(componentId),
    );

    expect(
      normalized.assetRefs?.some(
        (asset) => asset.id === 'viz-builtin-stage-female-dj',
      ),
    ).toBe(false);
    expect(normalized.layers[0]?.inputs?.djModel).toEqual({
      kind: 'asset-ref',
      assetId: 'custom-dj',
    });
    expect(normalized.assetRefs).toHaveLength(4);
  });
});
