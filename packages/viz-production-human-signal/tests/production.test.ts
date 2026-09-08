import {
  coreComponentCapabilityPack,
  coreComponents,
  STAGE_MODEL_ASSET_DEFINITIONS,
} from '@viz-engine/components-core';
import {
  createHumanSignalDirection,
  createHumanSignalProject,
  humanSignalProductionIdentity,
  humanSignalProvenance,
} from '@viz-engine/production-human-signal';
import {
  createHumanSignalExecutionEnvironment,
  verifyHumanSignalSources,
  writeHumanSignalBundle,
} from '@viz-engine/production-human-signal/node';
import * as bundleModule from '@viz-engine/project-bundle/node';
import {
  createVizExecutionManifest,
  loadLocalVizProjectBundle,
} from '@viz-engine/project-bundle/node';
import { vizThreeBrowserBackendIdentity } from '@viz-engine/renderer-three';
import {
  resolveVizProjectAudioAsset,
  validateProjectDocument,
} from '@viz-engine/runtime';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import * as directionModule from '../src/direction.js';

const root = process.cwd();
const temporary = mkdtempSync(resolve(tmpdir(), 'viz-human-signal-'));
const bundleDirectory = resolve(temporary, 'bundle');
let written: ReturnType<typeof writeHumanSignalBundle>;
beforeAll(() => {
  written = writeHumanSignalBundle({ repositoryRoot: root, bundleDirectory });
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => rmSync(temporary, { recursive: true, force: true }));

const readBundle = () => loadLocalVizProjectBundle(bundleDirectory);

describe('Human Signal production ownership', () => {
  it('creates independent canonical baseline data without claiming the later skeleton', () => {
    const first = createHumanSignalProject();
    const second = createHumanSignalProject();
    expect(first).toEqual(second);
    expect(validateProjectDocument(first)).toEqual({ ok: true, issues: [] });
    expect(first.timeline).toEqual({ fps: 60, durationInFrames: 2880 });
    expect(first.layers).toHaveLength(9);
    expect(
      first.layers.filter((layer) => layer.enabled).map((layer) => layer.id),
    ).toEqual([
      'layer-void-field',
      'layer-grain-veil',
      'layer-human-stage',
      'layer-atmospheric-haze',
      'layer-signal-horizon',
    ]);
    expect(first.graphs).toEqual([]);
    expect(first.artifactRefs).toEqual([]);
    expect(first.metadata).toMatchObject({
      realization: {
        status: 'ownership-foundation',
        audio: 'source-provenance-outside-project-assets',
        implementedGraphs: 0,
      },
      audioRecipe: { status: 'planned-not-created' },
    });
    expect(
      first.layers
        .flatMap((layer) => Object.values(layer.inputs ?? {}))
        .every((input) => input.kind === 'asset-ref'),
    ).toBe(true);
    expect(
      first.layers.find((layer) => layer.componentId === 'stage-scene')
        ?.requiredAssetIds,
    ).toEqual(STAGE_MODEL_ASSET_DEFINITIONS.map(({ asset }) => asset.id));
    first.layers[0]!.settings!.intensity = 99;
    first.assetRefs![0]!.label = 'changed';
    (
      first.metadata!.direction as ReturnType<typeof createHumanSignalDirection>
    ).acts[0]!.title = 'changed';
    expect(createHumanSignalProject()).toEqual(second);
  });

  it('binds the exact approved score, source coordinates and pending recipes', () => {
    expect(verifyHumanSignalSources(root)).toHaveLength(9);
    const direction = createHumanSignalDirection();
    expect(direction.music.source).toEqual({
      frameStart: 135,
      frameEndExclusive: 3015,
      sampleStart: 108000,
      sampleEndExclusive: 2412000,
    });
    expect(direction.music.local).toEqual({
      frameStart: 0,
      frameEndExclusive: 2880,
      sampleStart: 0,
      sampleEndExclusive: 2304000,
    });
    expect(direction.acts.map((act) => act.range)).toEqual([
      { localFrameStart: 0, localFrameEndExclusive: 405 },
      { localFrameStart: 405, localFrameEndExclusive: 1125 },
      { localFrameStart: 1125, localFrameEndExclusive: 1605 },
      { localFrameStart: 1605, localFrameEndExclusive: 2205 },
      { localFrameStart: 2205, localFrameEndExclusive: 2880 },
    ]);
    expect(direction.graphs).toHaveLength(7);
    expect(
      direction.graphs
        .filter((graph) =>
          graph.outputs.some((output) => output.consumer.startsWith('gap:')),
        )
        .map((graph) => graph.id),
    ).toEqual(['graph-score-direction', 'graph-compositor-choreography']);
    expect(written.executionManifest!.metadata).toMatchObject({
      provenance: humanSignalProvenance,
      renderSettings: {
        width: 1920,
        height: 1080,
        fps: 60,
        videoCodec: 'h264',
        audioCodec: 'aac',
        quality: 'high',
      },
    });
  });

  it.each(['frameStart', 'sampleStart'] as const)(
    'rejects a shifted approved source %s before writing',
    (key) => {
      const changed = createHumanSignalDirection();
      changed.music.source[key] += 1;
      vi.spyOn(directionModule, 'createHumanSignalDirection').mockReturnValue(
        changed,
      );
      expect(() => verifyHumanSignalSources(root)).toThrow(
        'differs from the approved treatment',
      );
    },
  );

  it('binds actual package and capability registrations, not historical availability', () => {
    const ownManifest = JSON.parse(
      readFileSync(
        resolve(root, 'packages/viz-production-human-signal/package.json'),
        'utf8',
      ),
    );
    expect(humanSignalProductionIdentity).toMatchObject({
      packageId: ownManifest.name,
      version: ownManifest.version,
    });
    const execution = written.executionManifest!;
    expect(execution.renderer.backend).toEqual(vizThreeBrowserBackendIdentity);
    const used = [
      ...new Set(
        createHumanSignalProject().layers.map((layer) => layer.componentId),
      ),
    ].sort();
    expect(execution.components).toEqual(
      used.map((componentId) => ({
        componentId,
        implementationVersion: coreComponents.find(
          (component) => component.id === componentId,
        )!.implementationVersion,
        capabilityPack: {
          id: coreComponentCapabilityPack.manifest.id,
          version: coreComponentCapabilityPack.manifest.version,
        },
      })),
    );
    for (const identity of [execution.runtime, execution.renderer.package]) {
      const packageDirectory = identity.packageId.replace(
        '@viz-engine/',
        'viz-',
      );
      const manifest = JSON.parse(
        readFileSync(
          resolve(root, 'packages', packageDirectory, 'package.json'),
          'utf8',
        ),
      );
      expect(identity).toEqual({
        packageId: manifest.name,
        version: manifest.version,
      });
    }
    const bundle = readBundle();
    const environment = createHumanSignalExecutionEnvironment();
    environment.components = environment.components.filter(
      ({ component }) => component.id !== 'stage-scene',
    );
    expect(() =>
      createVizExecutionManifest({
        bundleDirectory,
        bundleManifest: bundle.manifest,
        project: bundle.project,
        resolvedArtifacts: bundle.resolvedArtifacts,
        environment,
      }),
    ).toThrow('absent from the execution registry');
  });

  it('round-trips real model bytes with no invented audio derivative or bake', () => {
    const bundle = readBundle();
    expect(bundle.issues).toEqual([]);
    expect(bundle.project).toEqual(createHumanSignalProject());
    expect(
      resolveVizProjectAudioAsset(bundle.project, bundle.resolvedAssets),
    ).toBeUndefined();
    expect(
      bundle.project.assetRefs?.some((asset) => asset.kind === 'audio'),
    ).toBe(false);
    expect(bundle.executionManifest).toEqual(written.executionManifest);
    expect(bundle.executionManifest!.assets).toHaveLength(4);
    expect(bundle.executionManifest!.artifacts).toEqual([]);
    expect(bundle.executionManifest!.bakes).toEqual([]);
    const approvedIdentities = [
      ...createHumanSignalDirection().models.map(
        (model) => model.contentIdentity,
      ),
    ];
    expect(
      bundle.executionManifest!.assets.map((asset) => asset.contentIdentity),
    ).toEqual(approvedIdentities);
    expect(JSON.stringify(bundle.project)).not.toContain(root);
    expect(JSON.stringify(bundle.executionManifest)).not.toContain(root);
  });

  it('rejects a model registration redirected to another approved performer', () => {
    const asset = STAGE_MODEL_ASSET_DEFINITIONS[0]!.asset;
    const original = asset.originalFileName!;
    try {
      asset.originalFileName =
        STAGE_MODEL_ASSET_DEFINITIONS[1]!.asset.originalFileName!;
      expect(() =>
        writeHumanSignalBundle({
          repositoryRoot: root,
          bundleDirectory: resolve(temporary, 'redirected-model'),
        }),
      ).toThrow('model registry identity differs from approved source');
    } finally {
      asset.originalFileName = original;
    }
  });

  it('rejects paired filename/hash redirection that duplicates one performer and omits another', () => {
    const asset = STAGE_MODEL_ASSET_DEFINITIONS[0]!.asset;
    const original = structuredClone(asset);
    const other = STAGE_MODEL_ASSET_DEFINITIONS[1]!.asset;
    try {
      asset.originalFileName = other.originalFileName!;
      asset.metadata = structuredClone(other.metadata!);
      expect(() =>
        writeHumanSignalBundle({
          repositoryRoot: root,
          bundleDirectory: resolve(temporary, 'duplicate-performer'),
        }),
      ).toThrow(
        'model assignments must cover every approved performer exactly once',
      );
    } finally {
      Object.assign(asset, original);
    }
  });

  it('rejects a self-consistent bundle whose source changes at the writer handoff', () => {
    const write = bundleModule.writeLocalVizProjectBundle;
    vi.spyOn(bundleModule, 'writeLocalVizProjectBundle').mockImplementation(
      (options) =>
        write({
          ...options,
          resolvedAssets: options.resolvedAssets.map((asset, index) =>
            index === 0
              ? { ...asset, bytes: new Uint8Array([1, 2, 3]).buffer }
              : asset,
          ),
        }),
    );
    const output = resolve(temporary, 'changed-source');
    expect(() =>
      writeHumanSignalBundle({ repositoryRoot: root, bundleDirectory: output }),
    ).toThrow('bundled assets differ from the approved source identities');
    // The generic bundle is internally valid: the production provenance check
    // must reject it for a stronger reason than a corrupt/missing output file.
    expect(loadLocalVizProjectBundle(output).issues).toEqual([]);
  });

  it('rejects changed asset and project bytes after materialization', () => {
    for (const path of [
      written.manifest.projectFile,
      written.manifest.assetEntries[0]!.path,
    ]) {
      const file = resolve(bundleDirectory, path);
      const original = readFileSync(file);
      try {
        writeFileSync(file, Buffer.concat([original, Buffer.from(' ')]));
        expect(
          readBundle().issues.some(
            (issue) => issue.code === 'execution-content-identity-mismatch',
          ),
        ).toBe(true);
      } finally {
        writeFileSync(file, original);
      }
    }
    expect(readBundle().issues).toEqual([]);
  });
});
