import type {
  VizAudioFeatureSeries,
  VizAudioFeatureTimelineArtifact,
  VizResolvedArtifact,
} from "@viz-engine/contracts";

const isAudioFeatureSeries = (value: unknown): value is VizAudioFeatureSeries => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<VizAudioFeatureSeries>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.sampleRate === "number" &&
    Array.isArray(candidate.values)
  );
};

const isAudioFeatureTimelineArtifact = (
  value: unknown,
): value is VizAudioFeatureTimelineArtifact => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<VizAudioFeatureTimelineArtifact>;

  return (
    candidate.kind === "audio-feature-timeline" &&
    typeof candidate.profile === "string" &&
    typeof candidate.fps === "number" &&
    typeof candidate.frameCount === "number" &&
    Array.isArray(candidate.featureSeries) &&
    candidate.featureSeries.every(isAudioFeatureSeries)
  );
};

export const getAudioFeatureTimelineArtifact = (
  artifact: VizResolvedArtifact | undefined,
): VizAudioFeatureTimelineArtifact | undefined => {
  if (!artifact) {
    return undefined;
  }

  if (isAudioFeatureTimelineArtifact(artifact.payload)) {
    return artifact.payload;
  }

  if (isAudioFeatureTimelineArtifact(artifact)) {
    return artifact;
  }

  return undefined;
};

export const sampleAudioFeatureValue = (
  artifact: VizAudioFeatureTimelineArtifact,
  feature: string,
  frame: number,
): number | undefined => {
  const featureSeries = artifact.featureSeries.find((series) => series.name === feature);

  if (!featureSeries) {
    return undefined;
  }

  const clampedFrame = Math.max(0, Math.min(frame, featureSeries.values.length - 1));
  return featureSeries.values[clampedFrame];
};
