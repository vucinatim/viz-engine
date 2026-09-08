import { STAGE_MODEL_ASSET_DEFINITIONS } from '@viz-engine/components-core';
import type { VizAssetRef } from '@viz-engine/contracts';
import { createHumanSignalDirection } from './direction.js';

export const HUMAN_SIGNAL_SOURCE_AUDIO_ID = 'asset-human-signal-source-audio';
export const HUMAN_SIGNAL_AUDIO_ID = 'asset-human-signal-approved-window';
export const HUMAN_SIGNAL_AUDIO_ARTIFACT_ID =
  'artifact-human-signal-audio-standard';

export const createHumanSignalModelAssets = (): VizAssetRef[] =>
  STAGE_MODEL_ASSET_DEFINITIONS.map(({ asset }) => structuredClone(asset));

/** Recipes are not asset/artifact refs until their bytes have been produced. */
export const createHumanSignalAudioRecipe = () => {
  const { music } = createHumanSignalDirection();
  return {
    status: 'planned-not-created' as const,
    sourceAssetId: HUMAN_SIGNAL_SOURCE_AUDIO_ID,
    sourcePath: music.sourcePath,
    sourceDisposition: 'verified-input-not-bundled' as const,
    sourceContentIdentity: music.sourceContentIdentity,
    approvedDecodedPcmContentIdentity: music.decodedPcmContentIdentity,
    sampleRate: music.sampleRate,
    sourceSampleRange: [
      music.source.sampleStart,
      music.source.sampleEndExclusive,
    ],
    outputSampleRange: [
      music.local.sampleStart,
      music.local.sampleEndExclusive,
    ],
    derivedAssetId: HUMAN_SIGNAL_AUDIO_ID,
    artifactId: HUMAN_SIGNAL_AUDIO_ARTIFACT_ID,
    bakeProfile: 'standard',
    timelineFps: music.timelineFps,
  };
};
