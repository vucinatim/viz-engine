import type { VizBlendMode, VizLayerRenderPolicy, VizValueSource } from "./project.js";
import type { VizLayer } from "./project.js";
import type { VizLayerId } from "./ids.js";
import type { VizFrameContext, VizRendererFamily, VizViewport } from "./runtime.js";
import type { VizRenderNode } from "./render-nodes.js";
import type {
  VizAssetRef,
  VizMaterializedAsset,
} from "./assets.js";

export type VizComponentInputSourceKind = VizValueSource["kind"];

export interface VizComponentInputDefinition {
  key: string;
  label: string;
  supportedSources: VizComponentInputSourceKind[];
  required?: boolean;
  defaultAsset?: VizAssetRef;
  description?: string;
}

export interface VizComponentDefinition {
  id: string;
  name: string;
  rendererFamily: VizRendererFamily;
  description?: string;
  inputs?: VizComponentInputDefinition[];
  renderPolicy?: VizLayerRenderPolicy;
  metadata?: Record<string, unknown>;
}

export interface VizComponentRenderContext {
  frameContext: VizFrameContext;
  viewport: VizViewport;
  layer: VizLayer;
  /**
   * Canonical layer settings with resolved layer inputs applied by colon-delimited
   * setting path (for example `appearance:scaleY`).
   */
  settings: Readonly<Record<string, unknown>>;
  resolvedInputs: Record<string, VizResolvedInputValue>;
  materializedAssets: ReadonlyMap<string, VizMaterializedAsset>;
  /**
   * Resolves the same component settings at an arbitrary canonical frame.
   * Components with deterministic trails or other temporal views use this
   * instead of retaining browser-owned render state.
   */
  sampleSettings(frame: number): Readonly<Record<string, unknown>>;
}

export interface VizComponentImplementation extends VizComponentDefinition {
  render(context: VizComponentRenderContext): VizRenderNode | null;
}

export type VizResolvedInputStatus = "resolved" | "missing" | "unsupported";

export interface VizResolvedInputValue {
  key: string;
  sourceKind: VizComponentInputSourceKind;
  status: VizResolvedInputStatus;
  value?: unknown;
  message?: string;
}

export interface VizFramePlanIssue {
  code:
    | "missing-asset"
    | "missing-artifact"
    | "missing-graph"
    | "missing-graph-output"
    | "missing-feature"
    | "unsupported-source"
    | "graph-evaluation-failed"
    | "missing-component"
    | "component-render-failed";
  layerId: VizLayerId;
  inputKey: string;
  message: string;
}

export interface VizLayerFrameSnapshot {
  layerId: VizLayerId;
  componentId: string;
  componentName?: string;
  rendererFamily: VizRendererFamily;
  enabled: boolean;
  opacity: number;
  blendMode: VizBlendMode;
  resolvedInputs: Record<string, VizResolvedInputValue>;
  settings?: Record<string, unknown>;
}

export interface VizFramePlan {
  frameContext: VizFrameContext;
  layers: VizLayerFrameSnapshot[];
  issues: VizFramePlanIssue[];
}

export interface VizLayerRenderPlanEntry extends VizLayerFrameSnapshot {
  node?: VizRenderNode | null;
}

export interface VizRenderPlan {
  frameContext: VizFrameContext;
  viewport: VizViewport;
  materializedAssets: VizMaterializedAsset[];
  layers: VizLayerRenderPlanEntry[];
  issues: VizFramePlanIssue[];
}
