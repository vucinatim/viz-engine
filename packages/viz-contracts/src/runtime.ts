import type { VizResolvedArtifact } from "./artifacts";
import type { VizResolvedAsset } from "./assets";

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
  resolvedArtifacts?: VizResolvedArtifact[];
}
