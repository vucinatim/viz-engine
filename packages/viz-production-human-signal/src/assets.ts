import { STAGE_MODEL_ASSET_DEFINITIONS } from '@viz-engine/components-core';
import type {
  VizArtifactRef,
  VizAssetRef,
  VizDerivedAssetRef,
} from '@viz-engine/contracts';
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
    version: 'human-signal.audio-recipe.v1' as const,
    sourceAssetId: HUMAN_SIGNAL_SOURCE_AUDIO_ID,
    sourcePath: music.sourcePath,
    sourceDisposition: 'bundled-lineage' as const,
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

/** Materialized references only; sample processing belongs to @viz-engine/bake. */
export interface HumanSignalAudioMaterialization {
  sourceAsset: VizAssetRef;
  asset: VizDerivedAssetRef;
  artifact: VizArtifactRef;
}
