import { applyVizProjectActions } from '@viz-engine/actions';
import {
  createVizAudioFeatureBakeJobService,
  type VizAudioFeatureBakeJobRequest,
} from '@viz-engine/bake';
import { createVizNodeAudioBakeSourceResolver } from '@viz-engine/bake/node';
import type { VizResolvedAsset } from '@viz-engine/contracts';
import {
  loadLocalVizProjectBundle,
  writeLocalVizProjectBundle,
} from '@viz-engine/project-bundle/node';

export interface BakeLocalBundleAudioOptions {
  sourceBundleDirectory: string;
  outputBundleDirectory: string;
  sourceAssetId?: string;
  fps?: number;
  fftSize?: number;
  startSeconds?: number;
  durationSeconds?: number;
}

const selectAudioAsset = (
  assets: readonly VizResolvedAsset[],
  requestedAssetId: string | undefined,
): VizResolvedAsset | undefined =>
  assets.find(
    (asset) =>
      asset.kind === 'audio' &&
      (requestedAssetId === undefined || asset.id === requestedAssetId),
  );

export const bakeLocalBundleAudio = async ({
  sourceBundleDirectory,
  outputBundleDirectory,
  sourceAssetId,
  fps,
  fftSize,
  startSeconds,
  durationSeconds,
}: BakeLocalBundleAudioOptions) => {
  const loaded = loadLocalVizProjectBundle(sourceBundleDirectory);
  if (loaded.issues.length > 0) {
    return {
      ok: false,
      payload: {
        sourceBundleDirectory: loaded.bundleDirectory,
        issues: loaded.issues,
      },
    };
  }
  const sourceAsset = selectAudioAsset(loaded.resolvedAssets, sourceAssetId);
  if (!sourceAsset) {
    return {
      ok: false,
      payload: {
        sourceBundleDirectory: loaded.bundleDirectory,
        issues: [
          {
            code: 'missing-audio-asset',
            message:
              sourceAssetId === undefined
                ? 'The bundle has no resolved audio asset.'
                : `The bundle has no resolved audio asset "${sourceAssetId}".`,
          },
        ],
      },
    };
  }

  const service = createVizAudioFeatureBakeJobService({
    sourceResolver: createVizNodeAudioBakeSourceResolver({
      resolveFilePath: () => sourceAsset.uri,
    }),
  });
  const request: VizAudioFeatureBakeJobRequest = {
    kind: 'audio-feature-timeline',
    sourceAssetId: sourceAsset.id,
    profile: 'standard',
    fps: fps ?? loaded.project.timeline.fps,
    ...(fftSize === undefined ? {} : { fftSize }),
    ...(startSeconds === undefined && durationSeconds === undefined
      ? {}
      : {
          sourceWindow: {
            ...(startSeconds === undefined ? {} : { startSeconds }),
            ...(durationSeconds === undefined ? {} : { durationSeconds }),
          },
        }),
  };
  const started = service.start(request, {
    kind: 'agent',
    id: 'viz-dev',
  });
  const completed = await service.wait(started.id);
  if (completed.status !== 'succeeded' || !completed.result) {
    return {
      ok: false,
      payload: {
        sourceBundleDirectory: loaded.bundleDirectory,
        job: completed,
      },
    };
  }

  const artifact = completed.result.artifact;
  const actionResult = applyVizProjectActions(loaded.project, [
    {
      type: 'artifact.attach',
      payload: {
        artifact: {
          id: artifact.id,
          kind: artifact.kind,
          label: artifact.label,
          sourceAssetId: artifact.sourceAssetId,
          metadata: {
            profile: artifact.profile,
            executionIdentity: completed.result.executionIdentity,
          },
        },
      },
    },
  ]);
  const bundleWrite = writeLocalVizProjectBundle({
    bundleDirectory: outputBundleDirectory,
    project: actionResult.project,
    resolvedAssets: loaded.resolvedAssets,
    resolvedArtifacts: [
      ...loaded.resolvedArtifacts.filter(
        (candidate) => candidate.id !== artifact.id,
      ),
      completed.result.resolvedArtifact,
    ],
  });

  return {
    ok: actionResult.ok && bundleWrite.issues.length === 0,
    payload: {
      sourceBundleDirectory: loaded.bundleDirectory,
      outputBundleDirectory: bundleWrite.bundleDirectory,
      job: {
        id: completed.id,
        status: completed.status,
        inputIdentity: completed.inputIdentity,
        executionIdentity: completed.result.executionIdentity,
        metrics: completed.result.metrics,
        outputArtifactId: artifact.id,
      },
      actionWarnings: actionResult.warnings,
      actionErrors: actionResult.errors,
      manifest: bundleWrite.manifest,
      issues: bundleWrite.issues,
    },
  };
};
