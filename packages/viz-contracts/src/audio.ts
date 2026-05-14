import type { VizArtifactRef } from "./artifacts.js";

export type VizAudioFeatureProfile = "standard" | "extended" | "specialized";

export type VizStandardAudioFeatureName =
  | "rms"
  | "loudness"
  | "bass-energy"
  | "mid-energy"
  | "treble-energy"
  | "spectral-centroid"
  | "spectral-flux"
  | "onset-strength"
  | "waveform-peak";

export interface VizAudioFeatureSeries {
  name: string;
  sampleRate: number;
  values: number[];
  min?: number;
  max?: number;
}

export interface VizAudioFeatureTimelineArtifact extends VizArtifactRef {
  kind: "audio-feature-timeline";
  profile: VizAudioFeatureProfile;
  fps: number;
  frameCount: number;
  featureSeries: VizAudioFeatureSeries[];
}
