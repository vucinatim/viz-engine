import { createCoreComponentRegistry } from '@viz-engine/components-core';
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from '@viz-engine/example-projects';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import {
  createVizFramePlan,
  createVizRenderPlan,
  createVizRuntimeSession,
} from '@viz-engine/runtime';
import { describe, expect, it } from 'vitest';

const nodeRegistry = createCoreNodeRegistry();

describe('Viz frame planning', () => {
  it('resolves artifact-backed inputs into a deterministic layer frame plan', () => {
    const session = createVizRuntimeSession({
      project: exampleProjectDocument,
      mode: 'render',
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: 'test-seed',
    });

    const registry = createCoreComponentRegistry();
    const framePlan = createVizFramePlan({
      session,
      frame: 36,
      registry,
      nodeRegistry,
    });

    expect(framePlan.issues).toHaveLength(0);
    expect(framePlan.layers).toHaveLength(4);
    expect(framePlan.frameContext.frame).toBe(36);

    const coverLayer = framePlan.layers.find(
      (layer) => layer.layerId === 'layer-cover',
    );
    const reactiveBarsLayer = framePlan.layers.find(
      (layer) => layer.layerId === 'layer-bars',
    );

    expect(coverLayer?.componentName).toBe('Cover Image');
    expect(coverLayer?.resolvedInputs.image.status).toBe('resolved');
    expect(coverLayer?.resolvedInputs.image.value).toMatchObject({
      id: 'asset-image-cover',
      kind: 'image',
    });
    expect(
      typeof (
        coverLayer?.resolvedInputs.image.value as
          { imageSourceUri?: unknown } | undefined
      )?.imageSourceUri,
    ).toBe('string');
    expect(reactiveBarsLayer?.componentName).toBe('Reactive Bars');
    expect(reactiveBarsLayer?.resolvedInputs.bass.status).toBe('resolved');
    expect(reactiveBarsLayer?.resolvedInputs.bass.sourceKind).toBe(
      'graph-output',
    );
    expect(typeof reactiveBarsLayer?.resolvedInputs.bass.value).toBe('number');
    expect(typeof reactiveBarsLayer?.resolvedInputs.loudness.value).toBe(
      'number',
    );
  });

  it('executes components into a deterministic render plan', () => {
    const session = createVizRuntimeSession({
      project: exampleProjectDocument,
      mode: 'render',
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: 'render-seed',
    });

    const renderPlan = createVizRenderPlan({
      session,
      frame: 36,
      registry: createCoreComponentRegistry(),
      nodeRegistry,
    });

    expect(renderPlan.issues).toHaveLength(0);
    expect(renderPlan.layers).toHaveLength(4);
    expect(renderPlan.materializedAssets).toHaveLength(2);
    expect(
      renderPlan.layers.every(
        (layer) => layer.node !== undefined && layer.node !== null,
      ),
    ).toBe(true);

    const coverLayer = renderPlan.layers.find(
      (layer) => layer.layerId === 'layer-cover',
    );
    const barsLayer = renderPlan.layers.find(
      (layer) => layer.layerId === 'layer-bars',
    );
    expect(coverLayer?.node?.kind).toBe('group');
    expect(barsLayer?.node?.kind).toBe('group');
    for (const layer of renderPlan.layers) {
      if (layer.node?.kind === 'group') {
        expect(layer.node.style?.opacity).toBeUndefined();
        expect(layer.node.style?.blendMode).toBeUndefined();
      }
    }
  });

  it('carries layer-surface backgrounds into the canonical frame and render plans', () => {
    const project = structuredClone(exampleProjectDocument);
    project.layers[0]!.surface = {
      backgroundColor: 'rgba(12, 34, 56, 0.4)',
    };
    const session = createVizRuntimeSession({
      project,
      mode: 'render',
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: 'layer-surface-seed',
    });
    const framePlan = createVizFramePlan({
      session,
      frame: 12,
      registry: createCoreComponentRegistry(),
      nodeRegistry,
    });
    const renderPlan = createVizRenderPlan({
      session,
      frame: 12,
      registry: createCoreComponentRegistry(),
      nodeRegistry,
    });

    expect(framePlan.layers[0]?.backgroundColor).toBe('rgba(12, 34, 56, 0.4)');
    expect(renderPlan.layers[0]?.backgroundColor).toBe('rgba(12, 34, 56, 0.4)');
  });

  it('applies frame-scoped runtime input values without mutating the project', () => {
    const session = createVizRuntimeSession({
      project: exampleProjectDocument,
      mode: 'live',
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: 'frame-input-seed',
    });
    const originalBassInput = structuredClone(
      exampleProjectDocument.layers.find((layer) => layer.id === 'layer-bars')
        ?.inputs?.bass,
    );

    const framePlan = createVizFramePlan({
      session,
      frame: 12,
      registry: createCoreComponentRegistry(),
      nodeRegistry,
      inputValues: {
        'layer-bars': {
          bass: 0.875,
        },
      },
    });

    const barsLayer = framePlan.layers.find(
      (layer) => layer.layerId === 'layer-bars',
    );
    expect(barsLayer?.resolvedInputs.bass).toMatchObject({
      sourceKind: 'literal',
      status: 'resolved',
      value: 0.875,
    });
    expect(
      exampleProjectDocument.layers.find((layer) => layer.id === 'layer-bars')
        ?.inputs?.bass,
    ).toEqual(originalBassInput);
  });

  it('renders transient layer settings without mutating the runtime project', () => {
    const session = createVizRuntimeSession({
      project: exampleProjectDocument,
      mode: 'live',
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: 'live-setting-seed',
    });
    const originalSettings = structuredClone(
      session.project.layers.find((layer) => layer.id === 'layer-background')
        ?.settings,
    );
    const layerValues = {
      'layer-background': {
        ...session.project.layers.find(
          (layer) => layer.id === 'layer-background',
        )!,
        settings: {
          color: '#445566',
        },
      },
    };

    const framePlan = createVizFramePlan({
      session,
      frame: 12,
      registry: createCoreComponentRegistry(),
      nodeRegistry,
      layerValues,
    });
    const renderPlan = createVizRenderPlan({
      session,
      frame: 12,
      registry: createCoreComponentRegistry(),
      nodeRegistry,
      layerValues,
    });

    expect(
      framePlan.layers.find((layer) => layer.layerId === 'layer-background')
        ?.settings,
    ).toEqual(layerValues['layer-background'].settings);
    expect(
      renderPlan.layers.find((layer) => layer.layerId === 'layer-background')
        ?.settings,
    ).toEqual(layerValues['layer-background'].settings);
    expect(
      session.project.layers.find((layer) => layer.id === 'layer-background')
        ?.settings,
    ).toEqual(originalSettings);
  });
});
