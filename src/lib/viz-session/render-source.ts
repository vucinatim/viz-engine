import { resolveBundledStageModelAssets } from '@viz-engine/components-core';
import {
  createVizRenderSourceContentIdentity,
  type VizRenderSource,
} from '@viz-engine/render';

/** Studio composition resolves bundled defaults before binding export identity. */
export const createStudioRenderSource = (
  resources: Pick<
    VizRenderSource,
    'project' | 'resolvedAssets' | 'resolvedArtifacts'
  >,
  revision: number,
): VizRenderSource => {
  const assets = new Map(
    resources.resolvedAssets.map((asset) => [asset.id, asset]),
  );
  for (const asset of resolveBundledStageModelAssets(
    resources.project.assetRefs ?? [],
  )) {
    if (!assets.has(asset.id)) assets.set(asset.id, asset);
  }
  const resolved = {
    project: resources.project,
    resolvedAssets: [...assets.values()],
    resolvedArtifacts: resources.resolvedArtifacts,
  };
  return {
    ...resolved,
    contentIdentity: createVizRenderSourceContentIdentity(resolved),
    revision,
  };
};
