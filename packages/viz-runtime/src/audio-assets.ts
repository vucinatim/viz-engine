import type {
  VizAssetRef,
  VizProjectDocument,
  VizResolvedAsset,
} from '@viz-engine/contracts';

export interface VizResolvedProjectAudioAsset {
  ref: VizAssetRef;
  resolved: VizResolvedAsset;
}

/**
 * Resolves the canonical audio asset for a project.
 *
 * An audio-feature artifact's source is authoritative when present because it
 * identifies the track that drives the project's baked reactivity. Projects
 * without a baked timeline fall back to their first declared audio reference.
 * Resolved assets that are not declared by the project are never selected.
 */
export const resolveVizProjectAudioAsset = (
  project: VizProjectDocument,
  resolvedAssets: readonly VizResolvedAsset[],
): VizResolvedProjectAudioAsset | undefined => {
  const audioRefs = (project.assetRefs ?? []).filter(
    (asset): asset is VizAssetRef => asset.kind === 'audio',
  );
  const bakedSourceAssetId = project.artifactRefs?.find(
    (artifact) =>
      artifact.kind === 'audio-feature-timeline' &&
      artifact.sourceAssetId !== undefined,
  )?.sourceAssetId;
  const ref =
    audioRefs.find((asset) => asset.id === bakedSourceAssetId) ?? audioRefs[0];

  if (!ref) {
    return undefined;
  }

  const resolved = resolvedAssets.find(
    (asset) => asset.id === ref.id && asset.kind === 'audio',
  );

  return resolved ? { ref, resolved } : undefined;
};
