import type { VizArtifactRef } from './artifacts.js';
import type { VizAssetRef } from './assets.js';
import type { VizNodeGraphDocument } from './graphs.js';
import type {
  VizArtifactId,
  VizAssetId,
  VizGraphId,
  VizLayerId,
  VizProjectId,
} from './ids.js';
import type {
  VizExecutionMode,
  VizRendererFamily,
  VizTimeline,
  VizViewport,
} from './runtime.js';

export const VIZ_PROJECT_SCHEMA_VERSION = '2.0.0-alpha.1' as const;

export type VizBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'
  | 'add';

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
      kind: 'literal';
      value: unknown;
    }
  | {
      kind: 'asset-ref';
      assetId: VizAssetId;
    }
  | {
      kind: 'graph-output';
      graphId: VizGraphId;
      output: string;
    }
  | {
      kind: 'artifact-feature';
      artifactId: VizArtifactId;
      feature: string;
    };

export interface VizLayerRenderPolicy {
  supportedModes?: VizExecutionMode[];
  requiresBake?: boolean;
  preferredRendererFamily?: VizRendererFamily;
}

export interface VizLayerSurface {
  backgroundColor?: string;
  freezeWhenPaused?: boolean;
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
  surface?: VizLayerSurface;
  settings?: Record<string, unknown>;
  inputs?: Record<string, VizValueSource>;
  graphId?: VizGraphId;
  requiredAssetIds?: VizAssetId[];
  requiredArtifactIds?: VizArtifactId[];
  renderPolicy?: VizLayerRenderPolicy;
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
  graphs?: VizNodeGraphDocument[];
  metadata?: Record<string, unknown>;
}
