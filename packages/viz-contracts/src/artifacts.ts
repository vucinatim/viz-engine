import type { VizArtifactId, VizAssetId } from "./ids.js";

export type VizArtifactKind =
  | "audio-feature-timeline"
  | "simulation-checkpoint"
  | "analysis-payload"
  | "derived-media"
  | "render-output";

export interface VizArtifactRef {
  id: VizArtifactId;
  kind: VizArtifactKind;
  label: string;
  sourceAssetId?: VizAssetId;
  metadata?: Record<string, unknown>;
}

export interface VizResolvedArtifact {
  id: VizArtifactId;
  kind: VizArtifactKind;
  uri: string;
  payload?: unknown;
  metadata?: Record<string, unknown>;
}
