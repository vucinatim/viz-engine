import type { VizArtifactId, VizAssetId, VizGraphId, VizLayerId, VizProjectId } from "./ids";
import type { VizArtifactRef } from "./artifacts";
import type { VizAssetRef } from "./assets";
import type { VizExecutionMode, VizRendererFamily, VizTimeline, VizViewport } from "./runtime";

export const VIZ_PROJECT_SCHEMA_VERSION = "2.0.0-alpha.1" as const;

export type VizBlendMode =
  | "normal"
  | "add"
  | "screen"
  | "multiply"
  | "overlay";

export interface VizLayerTransform {
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotationDegrees?: number;
  anchorX?: number;
  anchorY?: number;
}

export type VizValueSource =
  | {
      kind: "literal";
      value: unknown;
    }
  | {
      kind: "graph-output";
      graphId: VizGraphId;
      output: string;
    }
  | {
      kind: "artifact-feature";
      artifactId: VizArtifactId;
      feature: string;
    };

export interface VizLayerRenderPolicy {
  supportedModes?: VizExecutionMode[];
  requiresBake?: boolean;
  preferredRendererFamily?: VizRendererFamily;
}

export interface VizLayer {
  id: VizLayerId;
  name: string;
  componentId: string;
  enabled: boolean;
  opacity: number;
  blendMode: VizBlendMode;
  rendererFamily?: VizRendererFamily;
  transform?: VizLayerTransform;
  settings?: Record<string, unknown>;
  inputs?: Record<string, VizValueSource>;
  graphId?: VizGraphId;
  requiredAssetIds?: VizAssetId[];
  requiredArtifactIds?: VizArtifactId[];
  renderPolicy?: VizLayerRenderPolicy;
}

export interface VizNodeGraphRef {
  id: VizGraphId;
  name: string;
  entryNodeIds: string[];
  metadata?: Record<string, unknown>;
}

export interface VizProjectDocument {
  schemaVersion: typeof VIZ_PROJECT_SCHEMA_VERSION;
  projectId: VizProjectId;
  name: string;
  timeline: VizTimeline;
  viewport: VizViewport;
  layerOrder: VizLayerId[];
  layers: VizLayer[];
  assetRefs?: VizAssetRef[];
  artifactRefs?: VizArtifactRef[];
  graphs?: VizNodeGraphRef[];
  metadata?: Record<string, unknown>;
}
