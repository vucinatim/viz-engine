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

const createSourceProductionSession = () => {
  const bundle = loadLocalVizProjectBundle(bundleDirectory);
  const [audioAssetRef] = bundle.project.assetRefs;
  const [audioArtifactRef] = bundle.project.artifactRefs;
  if (!audioAssetRef || !audioArtifactRef) {
    throw new Error('Afterlight bundle is missing its baked audio references.');
  }

  return createVizRuntimeSession({
    project: createAfterlightAssemblyProject({
      audioAssetRef,
      audioArtifactRef,
    }),
    mode: 'render',
    seed: 'afterlight-assembly-trajectory-test',
    resolvedAssets: bundle.resolvedAssets,
    resolvedArtifacts: bundle.resolvedArtifacts,
  });
};

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
    expect(graph?.nodes).toHaveLength(26);
    expect(graph?.outputs).toHaveLength(8);
    expect(
      new Set(
        graph?.nodes.map(
          ({ position }) => `${position?.x ?? 0}:${position?.y ?? 0}`,
        ),
      ).size,
    ).toBe(graph?.nodes.length);
    expect(project.layers[0]?.inputs).toMatchObject({
      djModel: { kind: 'asset-ref' },
      'shaderWall:scale': { kind: 'graph-output', output: 'wallScale' },
      'strobes:intensity': {
        kind: 'graph-output',
        output: 'strobeIntensity',
      },
    });
    expect(project.layers[0]?.inputs).not.toHaveProperty(
      'characters:animationSpeed',
    );
    expect(project.layers[0]?.inputs).not.toHaveProperty(
      'shaderWall:rotationSpeed',
    );
    expect(project.layers[0]?.inputs).not.toHaveProperty(
      'shaderWall:travelSpeed',
    );
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

  it('keeps continuous reactive controls bounded and smooth across the full production', () => {
    const session = createSourceProductionSession();
    const registry = createVizComponentRegistryFromCapabilityPacks(
      [coreComponentCapabilityPack],
      { strict: true },
    );
    const nodeRegistry = createCoreNodeRegistry();
    const continuousOutputs = [
      'wallScale',
      'beamIntensity',
      'movingIntensity',
      'washIntensity',
      'wallBrightness',
      'bloomStrength',
    ] as const;
    const maxDelta = Object.fromEntries(
      continuousOutputs.map((key) => [key, 0]),
    ) as Record<(typeof continuousOutputs)[number], number>;
    let previousValues: Readonly<Record<string, unknown>> | undefined;

    for (let frame = 0; frame < 720; frame += 1) {
      const plan = createVizRenderPlan({
        session,
        frame,
        registry,
        nodeRegistry,
      });
      const graph = plan.graphResults[0];

      expect(plan.issues).toEqual([]);
      expect(graph?.issues).toEqual([]);

      for (const value of Object.values(graph?.values ?? {})) {
        expect(typeof value === 'number' && Number.isFinite(value)).toBe(true);
      }

      if (previousValues) {
        for (const key of continuousOutputs) {
          maxDelta[key] = Math.max(
            maxDelta[key],
            Math.abs(Number(graph?.values[key]) - Number(previousValues[key])),
          );
        }
      }
      previousValues = graph?.values;
    }

    expect(maxDelta.wallScale).toBeLessThan(0.06);
    expect(maxDelta.beamIntensity).toBeLessThan(0.1);
    expect(maxDelta.movingIntensity).toBeLessThan(0.12);
    expect(maxDelta.washIntensity).toBeLessThan(0.18);
    expect(maxDelta.wallBrightness).toBeLessThan(0.26);
    expect(maxDelta.bloomStrength).toBeLessThan(0.11);
  });
});
