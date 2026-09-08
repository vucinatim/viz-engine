import {
  createVizAudioFeatureBakeJobService,
  type VizAudioFeatureBakeJobEvent,
} from '@viz-engine/bake';
import {
  createVizNodeAudioBakeSourceResolver,
  deriveVizAudioFileWindow,
  type DeriveVizAudioFileWindowOptions,
} from '@viz-engine/bake/node';
import {
  STAGE_MODEL_ASSET_DEFINITIONS,
  coreComponentCapabilityPack,
  coreComponents,
} from '@viz-engine/components-core';
import type { VizResolvedAsset } from '@viz-engine/contracts';
import {
  coreNodePackageIdentity,
  createCoreNodeRegistry,
} from '@viz-engine/nodes-core';
import {
  writeExclusiveLocalVizProjectBundle,
  type VizExecutionManifestEnvironment,
} from '@viz-engine/project-bundle/node';
import {
  coreVizThreeRendererExtension,
  createVizThreeProgramRegistry,
  vizThreeBrowserBackendIdentity,
  vizThreeRendererPackageIdentity,
} from '@viz-engine/renderer-three';
import {
  validateProjectDocument,
  vizRuntimePackageIdentity,
} from '@viz-engine/runtime';
import { deepStrictEqual } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  HUMAN_SIGNAL_AUDIO_ARTIFACT_ID,
  HUMAN_SIGNAL_AUDIO_ID,
  HUMAN_SIGNAL_SOURCE_AUDIO_ID,
  createHumanSignalModelAssets,
  type HumanSignalAudioMaterialization,
} from './assets.js';
import { createHumanSignalDirection } from './direction.js';
import { humanSignalProvenance } from './identity.js';
import {
  createHumanSignalProductionMetadata,
  createHumanSignalProject,
} from './project.js';

const contentIdentity = (bytes: Uint8Array) =>
  `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

export const createHumanSignalExecutionEnvironment =
  (): VizExecutionManifestEnvironment => ({
    runtime: vizRuntimePackageIdentity,
    components: coreComponents.map((component) => ({
      component,
      capabilityPack: coreComponentCapabilityPack.manifest,
    })),
    nodePackages: [
      { ...coreNodePackageIdentity, nodes: createCoreNodeRegistry().list() },
    ],
    renderer: {
      package: vizThreeRendererPackageIdentity,
      backend: vizThreeBrowserBackendIdentity,
      programs: createVizThreeProgramRegistry([
        coreVizThreeRendererExtension,
      ]).list(),
    },
    metadata: createHumanSignalProductionMetadata(),
  });

/** Verify source identities before any output is written. Local URIs stay in IO. */
export const verifyHumanSignalSources = (repositoryRoot: string) => {
  const direction = createHumanSignalDirection();
  const inputs = [
    ...Object.values(humanSignalProvenance),
    {
      path: direction.music.sourcePath,
      contentIdentity: direction.music.sourceContentIdentity,
    },
    ...direction.models,
  ];
  const verified = inputs.map((input) => {
    const bytes = readFileSync(resolve(repositoryRoot, input.path));
    const actual = contentIdentity(bytes);
    if (actual !== input.contentIdentity)
      throw new Error(
        `Human Signal source identity mismatch: ${input.path}; expected ${input.contentIdentity}, received ${actual}`,
      );
    return {
      path: input.path,
      contentIdentity: actual,
      byteLength: bytes.byteLength,
    };
  });
  type Direction = ReturnType<typeof createHumanSignalDirection>;
  type Treatment = Omit<Direction, 'layers'> & {
    layers: Array<Direction['layers'][number] & { component: { id: string } }>;
  };
  const treatment = JSON.parse(
    readFileSync(
      resolve(repositoryRoot, humanSignalProvenance.treatment.path),
      'utf8',
    ),
  ) as Treatment;
  const approvedProjection: Direction = {
    music: treatment.music,
    acts: treatment.acts,
    transitions: treatment.transitions,
    energyTargets: treatment.energyTargets,
    graphs: treatment.graphs,
    layers: treatment.layers.map(
      ({
        id,
        role,
        compositor,
        activeRanges,
        baselineSettings,
        authoringPresetId,
        component,
      }) => ({
        id,
        role,
        compositor,
        activeRanges,
        baselineSettings,
        authoringPresetId,
        componentId: component.id,
      }),
    ),
    models: treatment.models.map(({ path, contentIdentity, risk }) => ({
      path,
      contentIdentity,
      risk,
    })),
  };
  deepStrictEqual(
    direction,
    approvedProjection,
    'Human Signal direction differs from the approved treatment.',
  );
  return verified;
};

export const writeHumanSignalBundle = async ({
  repositoryRoot,
  bundleDirectory,
  signal,
  onDerivationProgress,
  onBakeProgress,
}: {
  repositoryRoot: string;
  bundleDirectory: string;
  signal?: AbortSignal;
  onDerivationProgress?: DeriveVizAudioFileWindowOptions['onProgress'];
  onBakeProgress?: (event: VizAudioFeatureBakeJobEvent) => void;
}) => {
  signal?.throwIfAborted();
  const sources = verifyHumanSignalSources(repositoryRoot);
  const approvedSources = new Map(
    sources.map((source) => [source.path, source.contentIdentity]),
  );
  const expectedAssets: Array<{ assetId: string; contentIdentity: string }> =
    [];
  const resolvedAssets: VizResolvedAsset[] = createHumanSignalModelAssets().map(
    (asset) => {
      const model = STAGE_MODEL_ASSET_DEFINITIONS.find(
        (definition) => definition.asset.id === asset.id,
      );
      if (!model)
        throw new Error(`Human Signal model registration missing: ${asset.id}`);
      const sourcePath = `public/models/stage/${model.asset.originalFileName}`;
      const expectedIdentity = approvedSources.get(sourcePath);
      if (!expectedIdentity)
        throw new Error(
          `Human Signal asset source is not approved: ${sourcePath}`,
        );
      if (asset.metadata?.contentIdentity !== expectedIdentity)
        throw new Error(
          `Human Signal model registry identity differs from approved source: ${asset.id}`,
        );
      expectedAssets.push({
        assetId: asset.id,
        contentIdentity: expectedIdentity,
      });
      return {
        id: asset.id,
        kind: asset.kind,
        source: asset.source,
        uri: pathToFileURL(resolve(repositoryRoot, sourcePath)).href,
        ...(asset.mimeType ? { mimeType: asset.mimeType } : {}),
      };
    },
  );
  deepStrictEqual(
    expectedAssets.map((asset) => asset.contentIdentity).sort(),
    createHumanSignalDirection()
      .models.map((model) => model.contentIdentity)
      .sort(),
    'Human Signal model assignments must cover every approved performer exactly once.',
  );
  const workspace = await mkdtemp(resolve(tmpdir(), 'viz-human-signal-audio-'));
  let workspaceCleaned = false;
  try {
    const { music } = createHumanSignalDirection();
    const derivation = await deriveVizAudioFileWindow({
      sourcePath: resolve(repositoryRoot, music.sourcePath),
      outputPath: resolve(workspace, 'human-signal.wav'),
      window: {
        startSample: music.source.sampleStart,
        endSampleExclusive: music.source.sampleEndExclusive,
      },
      expectedSourceContentIdentity: music.sourceContentIdentity,
      expectedPcm: {
        contentIdentity: music.decodedPcmContentIdentity,
        sampleRate: music.sampleRate,
        channelCount: 2,
      },
      ...(signal ? { signal } : {}),
      ...(onDerivationProgress ? { onProgress: onDerivationProgress } : {}),
    });
    signal?.throwIfAborted();
    const service = createVizAudioFeatureBakeJobService({
      sourceResolver: createVizNodeAudioBakeSourceResolver({
        resolveFilePath: () => derivation.derivative.path,
      }),
    });
    const unsubscribe = onBakeProgress
      ? service.subscribe(onBakeProgress)
      : () => {};
    const job = service.start({
      kind: 'audio-feature-timeline',
      sourceAssetId: HUMAN_SIGNAL_AUDIO_ID,
      artifactId: HUMAN_SIGNAL_AUDIO_ARTIFACT_ID,
      artifactLabel: 'Human Signal Standard Audio',
      profile: 'standard',
      fps: music.timelineFps,
      fftSize: 2048,
      minDecibels: -90,
      maxDecibels: -10,
      expectedSourceContentIdentity: derivation.derivative.contentIdentity,
    });
    const cancel = () => {
      service.cancel(job.id);
    };
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    let completed;
    try {
      completed = await service.wait(job.id);
    } finally {
      signal?.removeEventListener('abort', cancel);
      unsubscribe();
    }
    signal?.throwIfAborted();
    if (completed.status !== 'succeeded' || !completed.result) {
      const error = new Error(
        completed.failure?.message ??
          `Human Signal audio bake ${completed.status}.`,
      );
      Object.assign(error, {
        code: completed.failure?.code ?? completed.status,
      });
      throw error;
    }
    const { artifact, resolvedArtifact } = completed.result;
    const { path: _localPath, ...derivative } = derivation.derivative;
    const provenance = {
      version: derivation.version,
      source: derivation.source,
      window: derivation.window,
      derivative,
    };
    const audio: HumanSignalAudioMaterialization = {
      sourceAsset: {
        id: HUMAN_SIGNAL_SOURCE_AUDIO_ID,
        kind: 'audio',
        source: 'local',
        label: '808 Rap — original source',
        mimeType: 'audio/mpeg',
        originalFileName: '[HipHop] 808 Rap.mp3',
        metadata: { contentIdentity: music.sourceContentIdentity },
      },
      asset: {
        id: HUMAN_SIGNAL_AUDIO_ID,
        kind: 'audio',
        source: 'generated',
        sourceAssetId: HUMAN_SIGNAL_SOURCE_AUDIO_ID,
        label: 'Human Signal — approved 48-second window',
        mimeType: 'audio/wav',
        originalFileName: 'human-signal.wav',
        metadata: {
          contentIdentity: derivative.contentIdentity,
          derivation: provenance,
        },
      },
      artifact: {
        id: artifact.id,
        kind: artifact.kind,
        label: artifact.label,
        sourceAssetId: artifact.sourceAssetId,
        ...(artifact.metadata ? { metadata: artifact.metadata } : {}),
      },
    };
    const project = createHumanSignalProject(audio);
    const validation = validateProjectDocument(project);
    if (!validation.ok)
      throw new Error(
        `Invalid Human Signal project: ${JSON.stringify(validation.issues)}`,
      );
    resolvedAssets.unshift({
      id: audio.asset.id,
      kind: 'audio',
      source: 'generated',
      uri: pathToFileURL(derivation.derivative.path).href,
      mimeType: 'audio/wav',
    });
    resolvedAssets.push({
      id: audio.sourceAsset.id,
      kind: 'audio',
      source: 'local',
      uri: pathToFileURL(resolve(repositoryRoot, music.sourcePath)).href,
      mimeType: 'audio/mpeg',
    });
    expectedAssets.unshift({
      assetId: audio.asset.id,
      contentIdentity: derivative.contentIdentity,
    });
    expectedAssets.push({
      assetId: audio.sourceAsset.id,
      contentIdentity: music.sourceContentIdentity,
    });
    signal?.throwIfAborted();
    const written = await writeExclusiveLocalVizProjectBundle({
      bundleDirectory,
      project,
      resolvedAssets,
      resolvedArtifacts: [resolvedArtifact],
      executionEnvironment: createHumanSignalExecutionEnvironment(),
      ...(signal ? { signal } : {}),
      async validatePrepared(prepared) {
        deepStrictEqual(
          prepared.executionManifest?.assets,
          expectedAssets,
          'Human Signal bundled assets differ from the approved source identities.',
        );
        // No source workspace remains after the final bundle handoff.
        await rm(workspace, { recursive: true, force: true });
        workspaceCleaned = true;
      },
    });
    return {
      ...written,
      sources,
      audio,
      derivation: provenance,
      bake: completed.result.metrics,
      realization: project.metadata?.realization,
    };
  } finally {
    if (!workspaceCleaned)
      await rm(workspace, { recursive: true, force: true });
  }
};
