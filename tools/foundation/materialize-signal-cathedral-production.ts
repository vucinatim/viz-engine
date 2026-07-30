import {
  VIZ_PROJECT_SCHEMA_VERSION,
  createVizComponentRegistryFromCapabilityPacks,
  type VizArtifactRef,
  type VizProjectDocument,
} from '@viz-engine/contracts';
import {
  coreNodePackageIdentity,
  createCoreNodeRegistry,
} from '@viz-engine/nodes-core';
import {
  SIGNAL_CATHEDRAL_AUDIO_ASSET_ID,
  createSignalCathedralProject,
  signalCathedralAudioAssetRef,
  signalCathedralCapabilityPack,
  signalCathedralThreeRendererExtension,
} from '@viz-engine/production-signal-cathedral';
import {
  loadLocalVizProjectBundle,
  writeLocalVizProjectBundle,
} from '@viz-engine/project-bundle/node';
import {
  createVizThreeProgramRegistry,
  vizThreeBrowserBackendIdentity,
  vizThreeRendererPackageIdentity,
} from '@viz-engine/renderer-three';
import { vizRuntimePackageIdentity } from '@viz-engine/runtime';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

const readArgument = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};

const requireArgument = (name: string): string => {
  const value = readArgument(name);
  if (!value) {
    throw new Error(`Missing ${name} argument.`);
  }
  return value;
};

const writeSummary = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

const prepare = (): void => {
  const outputDirectory = resolve(requireArgument('--out'));
  const sourcePath = resolve(
    repoRoot,
    'public/music/[House] Progressive House.mp3',
  );
  const stagingDirectory = resolve(
    repoRoot,
    '.artifacts/signal-cathedral/staging',
  );
  const derivativePath = resolve(
    stagingDirectory,
    'signal-cathedral-progressive-house-48s-60s.mp3',
  );
  mkdirSync(stagingDirectory, { recursive: true });

  const ffmpeg = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-ss',
      '48',
      '-i',
      sourcePath,
      '-t',
      '12',
      '-vn',
      '-map_metadata',
      '-1',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '192k',
      derivativePath,
    ],
    {
      encoding: 'utf8',
    },
  );
  if (ffmpeg.status !== 0) {
    throw new Error(
      `FFmpeg failed to derive production audio: ${ffmpeg.stderr}`,
    );
  }

  const bytes = readFileSync(derivativePath);
  const contentIdentity = createHash('sha256').update(bytes).digest('hex');
  const audioAssetRef = {
    ...signalCathedralAudioAssetRef,
    metadata: {
      ...signalCathedralAudioAssetRef.metadata,
      sourceContentIdentity: contentIdentity,
      derivationTool: 'ffmpeg',
      derivationArguments: {
        sourceStartSeconds: 48,
        durationSeconds: 12,
        codec: 'libmp3lame',
        bitrate: '192k',
        stripMetadata: true,
      },
    },
  };
  const bootstrapProject: VizProjectDocument = {
    schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
    projectId: 'project-signal-cathedral-audio-bootstrap',
    name: 'Signal Cathedral Audio Bootstrap',
    timeline: {
      fps: 60,
      durationInFrames: 720,
    },
    viewport: {
      width: 1920,
      height: 1080,
      backgroundColor: '#02030d',
    },
    layerOrder: [],
    layers: [],
    assetRefs: [audioAssetRef],
    metadata: {
      temporaryPurpose: 'canonical-audio-bake-input',
      production: 'signal-cathedral',
    },
  };
  const written = writeLocalVizProjectBundle({
    bundleDirectory: outputDirectory,
    project: bootstrapProject,
    resolvedAssets: [
      {
        ...audioAssetRef,
        uri: pathToFileURL(derivativePath).href,
      },
    ],
    resolvedArtifacts: [],
  });
  if (written.issues.length > 0) {
    throw new Error(
      `Could not prepare production bundle: ${written.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    );
  }

  writeSummary({
    ok: true,
    mode: 'prepare',
    outputDirectory,
    audioAssetId: SIGNAL_CATHEDRAL_AUDIO_ASSET_ID,
    sourceWindow: {
      startSeconds: 48,
      durationSeconds: 12,
    },
    derivative: {
      path: derivativePath,
      byteLength: bytes.byteLength,
      sha256: contentIdentity,
    },
  });
};

const finalize = (): void => {
  const sourceDirectory = resolve(requireArgument('--dir'));
  const outputDirectory = resolve(requireArgument('--out'));
  const loaded = loadLocalVizProjectBundle(sourceDirectory);
  if (loaded.issues.length > 0) {
    throw new Error(
      `Cannot finalize bundle with issues: ${loaded.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    );
  }
  const audioAssetRef = loaded.project.assetRefs?.find(
    (asset) => asset.id === SIGNAL_CATHEDRAL_AUDIO_ASSET_ID,
  );
  if (!audioAssetRef) {
    throw new Error(
      `Baked bundle is missing audio asset "${SIGNAL_CATHEDRAL_AUDIO_ASSET_ID}".`,
    );
  }
  const audioArtifactRef = loaded.project.artifactRefs?.find(
    (artifact) =>
      artifact.kind === 'audio-feature-timeline' &&
      artifact.sourceAssetId === SIGNAL_CATHEDRAL_AUDIO_ASSET_ID,
  );
  if (!audioArtifactRef) {
    throw new Error(
      `Baked bundle is missing a canonical audio artifact for "${SIGNAL_CATHEDRAL_AUDIO_ASSET_ID}".`,
    );
  }
  const resolvedArtifact = loaded.resolvedArtifacts.find(
    (artifact) => artifact.id === audioArtifactRef.id,
  );
  if (!resolvedArtifact) {
    throw new Error(
      `Baked bundle did not resolve artifact "${audioArtifactRef.id}".`,
    );
  }

  const project = createSignalCathedralProject({
    audioAssetRef,
    audioArtifactRef: audioArtifactRef as VizArtifactRef,
  });
  const resolvedAudioAsset = loaded.resolvedAssets.find(
    (asset) => asset.id === audioAssetRef.id,
  );
  if (!resolvedAudioAsset?.uri.startsWith('file:')) {
    throw new Error(
      `Baked bundle did not resolve file-backed audio asset "${audioAssetRef.id}".`,
    );
  }
  if (resolvedArtifact.payload === undefined) {
    throw new Error(
      `Baked artifact "${audioArtifactRef.id}" has no portable payload.`,
    );
  }
  const bakeExecutionIdentity =
    typeof audioArtifactRef.metadata?.executionIdentity === 'string'
      ? audioArtifactRef.metadata.executionIdentity
      : undefined;
  if (!bakeExecutionIdentity) {
    throw new Error(
      `Baked artifact "${audioArtifactRef.id}" has no execution identity.`,
    );
  }
  const componentRegistry = createVizComponentRegistryFromCapabilityPacks(
    [signalCathedralCapabilityPack],
    { strict: true },
  );
  const nodeRegistry = createCoreNodeRegistry();
  const rendererRegistry = createVizThreeProgramRegistry([
    signalCathedralThreeRendererExtension,
  ]);
  const written = writeLocalVizProjectBundle({
    bundleDirectory: outputDirectory,
    project,
    resolvedAssets: loaded.resolvedAssets,
    resolvedArtifacts: [resolvedArtifact],
    executionEnvironment: {
      runtime: vizRuntimePackageIdentity,
      components: componentRegistry.listRegistrations(),
      nodePackages: [
        {
          ...coreNodePackageIdentity,
          nodes: nodeRegistry.list(),
        },
      ],
      renderer: {
        package: vizThreeRendererPackageIdentity,
        backend: vizThreeBrowserBackendIdentity,
        programs: rendererRegistry.list(),
      },
      metadata: {
        determinism: 'semantic',
        production: 'signal-cathedral',
      },
    },
  });
  if (written.issues.length > 0) {
    throw new Error(
      `Could not finalize production bundle: ${written.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    );
  }

  writeSummary({
    ok: true,
    mode: 'finalize',
    sourceDirectory,
    outputDirectory,
    projectId: project.projectId,
    audioAssetId: audioAssetRef.id,
    audioArtifactId: audioArtifactRef.id,
    graphId: project.graphs?.[0]?.id,
    layerId: project.layers[0]?.id,
    manifest: written.manifest,
    executionManifest: written.executionManifest,
  });
};

const mode = process.argv[2];
if (mode === 'prepare') {
  prepare();
} else if (mode === 'finalize') {
  finalize();
} else {
  throw new Error(
    'Usage: materialize-signal-cathedral-production.ts prepare --out <dir> | finalize --dir <baked-dir> --out <dir>',
  );
}
