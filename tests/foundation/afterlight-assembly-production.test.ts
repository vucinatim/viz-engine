import { coreComponentCapabilityPack } from '@viz-engine/components-core';
import { createVizComponentRegistryFromCapabilityPacks } from '@viz-engine/contracts';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import {
  AFTERLIGHT_ASSEMBLY_GRAPH_ID,
  AFTERLIGHT_ASSEMBLY_LAYER_ID,
  createAfterlightAssemblyProject,
} from '@viz-engine/production-afterlight-assembly';
import { loadLocalVizProjectBundle } from '@viz-engine/project-bundle/node';
import {
  createVizRenderPlan,
  createVizRuntimeSession,
  validateProjectDocument,
} from '@viz-engine/runtime';
import { describe, expect, it } from 'vitest';

const bundleDirectory = 'public/productions/afterlight-assembly';

const createProductionRenderPlan = (frame: number) => {
  const bundle = loadLocalVizProjectBundle(bundleDirectory);
  if (bundle.issues.length > 0) {
    throw new Error(bundle.issues.map((issue) => issue.message).join('; '));
  }
  return createVizRenderPlan({
    session: createVizRuntimeSession({
      project: bundle.project,
      mode: 'render',
      seed: 'afterlight-assembly-test',
      resolvedAssets: bundle.resolvedAssets,
      resolvedArtifacts: bundle.resolvedArtifacts,
    }),
    frame,
    registry: createVizComponentRegistryFromCapabilityPacks(
      [coreComponentCapabilityPack],
      { strict: true },
    ),
    nodeRegistry: createCoreNodeRegistry(),
  });
};

describe('Afterlight Assembly production', () => {
  it('is valid, editable canonical project data with a readable shared graph', () => {
    const project = createAfterlightAssemblyProject();
    const graph = project.graphs?.[0];

    expect(validateProjectDocument(project)).toEqual({ ok: true, issues: [] });
    expect(project.timeline).toEqual({ fps: 60, durationInFrames: 720 });
    expect(project.layerOrder).toEqual([AFTERLIGHT_ASSEMBLY_LAYER_ID]);
    expect(graph).toMatchObject({
      id: AFTERLIGHT_ASSEMBLY_GRAPH_ID,
      metadata: { production: 'afterlight-assembly' },
    });
    expect(graph?.nodes).toHaveLength(30);
    expect(graph?.outputs).toHaveLength(12);
    expect(project.layers[0]?.inputs).toMatchObject({
      djModel: { kind: 'asset-ref' },
      'shaderWall:scale': { kind: 'graph-output', output: 'wallScale' },
      'characters:animationSpeed': {
        kind: 'graph-output',
        output: 'characterSpeed',
      },
    });
  });

  it('ships as a self-contained bundle with audio, character models, and a bake', () => {
    const bundle = loadLocalVizProjectBundle(bundleDirectory);

    expect(bundle.issues).toEqual([]);
    expect(bundle.resolvedAssets).toHaveLength(5);
    expect(
      bundle.resolvedAssets.filter((asset) => asset.kind === 'model'),
    ).toHaveLength(4);
    expect(bundle.resolvedArtifacts).toHaveLength(1);
    expect(bundle.executionManifest).toMatchObject({
      project: { projectId: 'project-afterlight-assembly' },
      metadata: {
        determinism: 'semantic',
        production: 'afterlight-assembly',
      },
    });
  });

  it('deterministically resolves changing audio features into stage parameters', () => {
    const early = createProductionRenderPlan(152);
    const repeated = createProductionRenderPlan(152);
    const drop = createProductionRenderPlan(420);

    expect(early).toEqual(repeated);
    expect(early.issues).toEqual([]);
    expect(early.graphResults[0]?.issues).toEqual([]);
    expect(early.graphResults[0]?.values).not.toEqual(
      drop.graphResults[0]?.values,
    );
    expect(early.layers[0]?.resolvedInputs).toMatchObject({
      djModel: { status: 'resolved' },
      femaleDancerModel: { status: 'resolved' },
      maleDancerModel: { status: 'resolved' },
      maleCheerModel: { status: 'resolved' },
      'shaderWall:scale': {
        status: 'resolved',
        value: early.graphResults[0]?.values.wallScale,
      },
      'overheadBlinder:intensity': {
        status: 'resolved',
        value: early.graphResults[0]?.values.overheadIntensity,
      },
    });
    expect(early.layers[0]?.node).toMatchObject({
      kind: 'three-program',
      programId: 'viz-core/stage-scene/v1',
    });
  });
});
