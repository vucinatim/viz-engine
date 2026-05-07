import type { VizArtifactId, VizAssetId } from "./ids";

export type VizAssetKind = "audio" | "image" | "video" | "binary";

export type VizAssetSource =
  | "local"
  | "bundle"
  | "cloud"
  | "external"
  | "generated";

export interface VizAssetRef {
  id: VizAssetId;
  kind: VizAssetKind;
  source: VizAssetSource;
  label: string;
  mimeType?: string;
  originalFileName?: string;
  metadata?: Record<string, unknown>;
}

export interface VizDerivedAssetRef extends VizAssetRef {
  source: "generated";
  sourceAssetId: VizAssetId;
  derivationArtifactId?: VizArtifactId;
}

export interface VizResolvedAsset {
  id: VizAssetId;
  kind: VizAssetKind;
  source: VizAssetSource;
  uri: string;
  mimeType?: string;
  bytes?: ArrayBuffer;
  metadata?: Record<string, unknown>;
}
