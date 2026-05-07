import type { VizBlendMode, VizLayerRenderPolicy, VizValueSource } from "./project";
import type { VizLayerId } from "./ids";
import type { VizFrameContext, VizRendererFamily } from "./runtime";

export type VizComponentInputSourceKind = VizValueSource["kind"];

export interface VizComponentInputDefinition {
  key: string;
  label: string;
  supportedSources: VizComponentInputSourceKind[];
  required?: boolean;
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

export type VizResolvedInputStatus = "resolved" | "missing" | "unsupported";

export interface VizResolvedInputValue {
  key: string;
  sourceKind: VizComponentInputSourceKind;
  status: VizResolvedInputStatus;
  value?: unknown;
  message?: string;
}

export interface VizFramePlanIssue {
  code: "missing-artifact" | "missing-feature" | "unsupported-source";
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
