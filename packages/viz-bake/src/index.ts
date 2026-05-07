import type { VizAudioFeatureProfile, VizProjectDocument } from "@viz-engine/contracts";

export interface VizBakeRequest {
  kind: "audio-feature-timeline";
  sourceAssetId: string;
  profile: VizAudioFeatureProfile;
}

export interface VizBakePlan {
  projectId: string;
  requests: VizBakeRequest[];
}

export const createBakePlan = (project: VizProjectDocument): VizBakePlan => {
  const audioAssets = (project.assetRefs ?? []).filter((asset) => asset.kind === "audio");

  return {
    projectId: project.projectId,
    requests: audioAssets.map((asset) => ({
      kind: "audio-feature-timeline",
      sourceAssetId: asset.id,
      profile: "standard",
    })),
  };
};
