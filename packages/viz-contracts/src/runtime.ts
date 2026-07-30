import type { VizResolvedArtifact } from "./artifacts.js";
import type { VizMaterializedAsset, VizResolvedAsset } from "./assets.js";
import type { VizArtifactId, VizAssetId } from "./ids.js";

export type VizExecutionMode = "live" | "render" | "bake";

export type VizRendererFamily =
  | "three"
  | "canvas2d"
  | "webgpu"
  | "video"
  | "image"
  | "unknown";

export interface VizTimeline {
  fps: number;
  durationInFrames: number;
  sampleRate?: number;
}

export interface VizViewport {
  width: number;
  height: number;
  backgroundColor?: string;
}

export interface VizFrameContext {
  frame: number;
  fps: number;
  durationInFrames: number;
  timeInSeconds: number;
  deltaTimeSeconds: number;
  isFirstFrame: boolean;
  isLastFrame: boolean;
  mode: VizExecutionMode;
  seed: string;
}

export interface VizRuntimeResources {
  resolvedAssets?: VizResolvedAsset[];
  materializedAssets?: VizMaterializedAsset[];
  resolvedArtifacts?: VizResolvedArtifact[];
}

export interface VizRuntimeAudioFrameSnapshot {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  sampleRate: number;
  fftSize: number;
  minDecibels: number;
  maxDecibels: number;
  sourceAssetId?: VizAssetId;
  artifactId?: VizArtifactId;
  artifactFrame?: number;
  provenance: "live" | "baked";
}

export interface VizRuntimeInputs {
  audio?: VizRuntimeAudioFrameSnapshot;
}
