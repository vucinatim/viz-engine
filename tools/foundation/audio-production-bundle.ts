import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizArtifactRef,
  type VizAssetRef,
  type VizProjectDocument,
  type VizResolvedAsset,
} from '@viz-engine/contracts';
import {
  loadLocalVizProjectBundle,
  writeLocalVizProjectBundle,
  type VizExecutionManifestEnvironment,
} from '@viz-engine/project-bundle/node';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export interface PrepareAudioProductionBundleOptions {
  production: string;
  outputDirectory: string;
  sourcePath: string;
  derivativePath: string;
  sourceStartSeconds: number;
  durationSeconds: number;
  audioAssetRef: VizAssetRef;
  backgroundColor: string;
  contentIdentityFormat?: 'qualified' | 'hex';
}

export const prepareAudioProductionBundle = ({
  production,
  outputDirectory,
  sourcePath,
  derivativePath,
  sourceStartSeconds,
  durationSeconds,
  audioAssetRef,
  backgroundColor,
  contentIdentityFormat = 'qualified',
}: PrepareAudioProductionBundleOptions) => {
  mkdirSync(new URL('.', pathToFileURL(derivativePath)), { recursive: true });
  const ffmpeg = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-ss',
      String(sourceStartSeconds),
      '-i',
      sourcePath,
      '-t',
      String(durationSeconds),
      '-vn',
      '-map_metadata',
      '-1',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '192k',
      derivativePath,
    ],
    { encoding: 'utf8' },
  );
  if (ffmpeg.status !== 0) {
    throw new Error(
      `FFmpeg failed to derive production audio: ${ffmpeg.stderr}`,
    );
  }

  const bytes = readFileSync(derivativePath);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const contentIdentity =
    contentIdentityFormat === 'qualified' ? `sha256:${digest}` : digest;
  const preparedAssetRef: VizAssetRef = {
    ...audioAssetRef,
    metadata: {
      ...audioAssetRef.metadata,
      sourceContentIdentity: contentIdentity,
      derivationTool: 'ffmpeg',
      derivationArguments: {
        sourceStartSeconds,
        durationSeconds,
        codec: 'libmp3lame',
        bitrate: '192k',
        stripMetadata: true,
      },
    },
  };
  const bootstrapProject: VizProjectDocument = {
    schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
    projectId: `project-${production}-audio-bootstrap`,
    name: `${production} Audio Bootstrap`,
    timeline: { fps: 60, durationInFrames: Math.round(durationSeconds * 60) },
    viewport: { width: 1920, height: 1080, backgroundColor },
    layerOrder: [],
    layers: [],
    assetRefs: [preparedAssetRef],
    metadata: { temporaryPurpose: 'canonical-audio-bake-input', production },
  };
  const written = writeLocalVizProjectBundle({
    bundleDirectory: outputDirectory,
    project: bootstrapProject,
    resolvedAssets: [
      { ...preparedAssetRef, uri: pathToFileURL(derivativePath).href },
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

  return {
    outputDirectory,
    audioAssetId: preparedAssetRef.id,
    sourceWindow: { startSeconds: sourceStartSeconds, durationSeconds },
    derivative: {
      path: derivativePath,
      byteLength: bytes.byteLength,
      contentIdentity,
    },
  };
};

export interface FinalizeAudioProductionBundleOptions {
  production: string;
  sourceDirectory: string;
  outputDirectory: string;
  audioAssetId: string;
  createProject(resources: {
    audioAssetRef: VizAssetRef;
    audioArtifactRef: VizArtifactRef;
  }): VizProjectDocument;
  additionalResolvedAssets?: VizResolvedAsset[];
  executionEnvironment: VizExecutionManifestEnvironment;
}

export const finalizeAudioProductionBundle = ({
  production,
  sourceDirectory,
  outputDirectory,
  audioAssetId,
  createProject,
  additionalResolvedAssets = [],
  executionEnvironment,
}: FinalizeAudioProductionBundleOptions) => {
  const loaded = loadLocalVizProjectBundle(sourceDirectory);
  if (loaded.issues.length > 0) {
    throw new Error(
      `Cannot finalize bundle with issues: ${loaded.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    );
  }
  const audioAssetRef = loaded.project.assetRefs?.find(
    (asset) => asset.id === audioAssetId,
  );
  if (!audioAssetRef) {
    throw new Error(`Baked bundle is missing audio asset "${audioAssetId}".`);
  }
  const audioArtifactRef = loaded.project.artifactRefs?.find(
    (artifact) =>
      artifact.kind === 'audio-feature-timeline' &&
      artifact.sourceAssetId === audioAssetId,
  );
  if (!audioArtifactRef) {
    throw new Error(
      `Baked bundle is missing a canonical audio artifact for "${audioAssetId}".`,
    );
  }
  const resolvedAudio = loaded.resolvedAssets.find(
    (asset) => asset.id === audioAssetId,
  );
  const resolvedArtifact = loaded.resolvedArtifacts.find(
    (artifact) => artifact.id === audioArtifactRef.id,
  );
  if (!resolvedAudio?.uri.startsWith('file:')) {
    throw new Error(`Baked audio asset "${audioAssetId}" is not file-backed.`);
  }
  if (resolvedArtifact?.payload === undefined) {
    throw new Error(
      `Baked artifact "${audioArtifactRef.id}" has no portable payload.`,
    );
  }
  const bakeExecutionIdentity = audioArtifactRef.metadata?.executionIdentity;
  if (typeof bakeExecutionIdentity !== 'string') {
    throw new Error(
      `Baked artifact "${audioArtifactRef.id}" has no execution identity.`,
    );
  }

  const project = createProject({ audioAssetRef, audioArtifactRef });
  const resolvedAssets = [...loaded.resolvedAssets];
  for (const asset of additionalResolvedAssets) {
    if (!resolvedAssets.some((candidate) => candidate.id === asset.id)) {
      resolvedAssets.push(asset);
    }
  }
  const written = writeLocalVizProjectBundle({
    bundleDirectory: outputDirectory,
    project,
    resolvedAssets,
    resolvedArtifacts: [resolvedArtifact],
    executionEnvironment: {
      ...executionEnvironment,
      metadata: {
        ...executionEnvironment.metadata,
        determinism: 'semantic',
        production,
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

  return {
    sourceDirectory,
    outputDirectory,
    projectId: project.projectId,
    audioAssetId,
    audioArtifactId: audioArtifactRef.id,
    graphIds: project.graphs?.map((graph) => graph.id) ?? [],
    layerIds: project.layerOrder,
    manifest: written.manifest,
    executionManifest: written.executionManifest,
  };
};
