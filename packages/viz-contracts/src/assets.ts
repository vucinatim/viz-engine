import type { VizArtifactId, VizAssetId } from "./ids.js";

export type VizAssetKind =
  | "audio"
  | "image"
  | "video"
  | "model"
  | "binary";

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

interface VizMaterializedAssetBase {
  id: VizAssetId;
  kind: VizAssetKind;
  source: VizAssetSource;
  label?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface VizMaterializedAudioAsset extends VizMaterializedAssetBase {
  kind: "audio";
  audioSourceUri: string;
}

export interface VizMaterializedImageAsset extends VizMaterializedAssetBase {
  kind: "image";
  imageSourceUri: string;
  width?: number;
  height?: number;
}

export interface VizMaterializedVideoAsset extends VizMaterializedAssetBase {
  kind: "video";
  videoSourceUri: string;
  width?: number;
  height?: number;
}

export interface VizMaterializedModelAsset extends VizMaterializedAssetBase {
  kind: "model";
  bytes?: ArrayBuffer;
  modelSourceUri?: string;
}

export interface VizMaterializedBinaryAsset extends VizMaterializedAssetBase {
  kind: "binary";
  bytes?: ArrayBuffer;
  binarySourceUri?: string;
}

export type VizMaterializedAsset =
  | VizMaterializedAudioAsset
  | VizMaterializedImageAsset
  | VizMaterializedVideoAsset
  | VizMaterializedModelAsset
  | VizMaterializedBinaryAsset;
