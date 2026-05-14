import type { VizArtifactKind } from "./artifacts.js";
import type { VizAssetKind } from "./assets.js";
import type { VizArtifactId, VizAssetId } from "./ids.js";

export const VIZ_PROJECT_BUNDLE_MANIFEST_SCHEMA_VERSION = 1 as const;
export const VIZ_PROJECT_BUNDLE_MANIFEST_KIND = "viz.project-bundle-manifest.v1" as const;

export interface VizProjectBundleAssetEntry {
  assetId: VizAssetId;
  kind: VizAssetKind;
  path: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface VizProjectBundleArtifactEntry {
  artifactId: VizArtifactId;
  kind: VizArtifactKind;
  path: string;
  metadata?: Record<string, unknown>;
}

export interface VizProjectBundleManifest {
  schemaVersion: typeof VIZ_PROJECT_BUNDLE_MANIFEST_SCHEMA_VERSION;
  kind: typeof VIZ_PROJECT_BUNDLE_MANIFEST_KIND;
  projectFile: string;
  assetEntries: VizProjectBundleAssetEntry[];
  artifactEntries: VizProjectBundleArtifactEntry[];
  metadata?: Record<string, unknown>;
}
