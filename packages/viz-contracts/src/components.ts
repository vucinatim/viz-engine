import type { VizAssetRef, VizMaterializedAsset } from './assets.js';
import type { VizGraphEvaluationResult } from './graphs.js';
import type { VizLayerId } from './ids.js';
import type {
  VizBlendMode,
  VizLayer,
  VizLayerRenderPolicy,
  VizValueSource,
} from './project.js';
import type { VizRenderNode } from './render-nodes.js';
import type {
  VizFrameContext,
  VizRendererFamily,
  VizViewport,
} from './runtime.js';

export type VizComponentInputSourceKind = VizValueSource['kind'];

export type VizComponentCompatibility =
  'render-safe' | 'bake-required' | 'live-only';

export type VizComponentCatalogVisibility = 'public' | 'hidden';

export type VizComponentSettingConditionOperator =
  'equals' | 'not-equals' | 'in' | 'not-in';

export interface VizComponentSettingValueCondition {
  path: string;
  operator: VizComponentSettingConditionOperator;
  value: unknown;
}

export interface VizComponentSettingConditionGroup {
  operator: 'all' | 'any';
  conditions: VizComponentSettingCondition[];
}

export type VizComponentSettingCondition =
  VizComponentSettingValueCondition | VizComponentSettingConditionGroup;

interface VizComponentSettingBase {
  label: string;
  description?: string;
  visibleWhen?: VizComponentSettingCondition;
}

export interface VizComponentNumberSetting extends VizComponentSettingBase {
  kind: 'number';
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
  animatable?: boolean;
}

export interface VizComponentTextSetting extends VizComponentSettingBase {
  kind: 'text';
  defaultValue: string;
  animatable?: boolean;
}

export interface VizComponentBooleanSetting extends VizComponentSettingBase {
  kind: 'boolean';
  defaultValue: boolean;
  animatable?: boolean;
}

export interface VizComponentColorSetting extends VizComponentSettingBase {
  kind: 'color';
  defaultValue: string;
  animatable?: boolean;
}

export interface VizComponentSelectSetting extends VizComponentSettingBase {
  kind: 'select';
  defaultValue: string;
  options: string[];
  animatable?: boolean;
}

export interface VizComponentFileSetting extends VizComponentSettingBase {
  kind: 'file';
  defaultValue: string;
  allowedExtensions?: string[];
  animatable?: false;
}

export interface VizComponentVector3Setting extends VizComponentSettingBase {
  kind: 'vector3';
  defaultValue: {
    x: number;
    y: number;
    z: number;
  };
  min?: number;
  max?: number;
  step?: number;
  animatable?: boolean;
}

export interface VizComponentListSetting extends VizComponentSettingBase {
  kind: 'list';
  defaultValue: unknown[];
  item: Exclude<
    VizComponentSettingDefinition,
    VizComponentGroupSetting | VizComponentActionSetting
  >;
  itemLabel?: string;
  animatable?: false;
}

export interface VizComponentActionSetting extends VizComponentSettingBase {
  kind: 'action';
  actionId: string;
  buttonLabel?: string;
}

export interface VizComponentGroupSetting extends VizComponentSettingBase {
  kind: 'group';
  fields: Record<string, VizComponentSettingDefinition>;
}

export type VizComponentSettingDefinition =
  | VizComponentNumberSetting
  | VizComponentTextSetting
  | VizComponentBooleanSetting
  | VizComponentColorSetting
  | VizComponentSelectSetting
  | VizComponentFileSetting
  | VizComponentVector3Setting
  | VizComponentListSetting
  | VizComponentActionSetting
  | VizComponentGroupSetting;

export interface VizComponentPreset {
  id: string;
  name: string;
  description?: string;
  values: Record<string, unknown>;
  networks?: Record<string, string>;
}

export interface VizComponentInlineNetworkPreset {
  id: string;
  name: string;
  description?: string;
  outputType: string;
  autoPlace?: boolean;
  nodes: Array<{
    id: string;
    label: string;
    position?: { x: number; y: number };
    inputValues?: Record<string, unknown>;
    state?: Record<string, unknown>;
  }>;
  edges: Array<{
    source: string;
    sourceHandle?: string;
    target: string;
    targetHandle: string;
  }>;
}

export type VizComponentDefaultNetwork =
  string | VizComponentInlineNetworkPreset;

export interface VizComponentAuthoring {
  schemaVersion: 1;
  componentId: string;
  category?: string;
  tags?: string[];
  catalogVisibility?: VizComponentCatalogVisibility;
  compatibility: VizComponentCompatibility;
  settings: VizComponentGroupSetting;
  presets?: VizComponentPreset[];
  defaultNetworks?: Record<string, VizComponentDefaultNetwork>;
}

export interface VizComponentInputDefinition {
  key: string;
  label: string;
  supportedSources: VizComponentInputSourceKind[];
  runtimeBinding?: VizComponentRuntimeInputBinding;
  required?: boolean;
  defaultAsset?: VizAssetRef;
  description?: string;
}

export type VizComponentRuntimeInputBinding =
  | 'audio.frequency-data'
  | 'audio.time-domain-data'
  | 'audio.sample-rate'
  | 'audio.fft-size'
  | 'audio.frequency-analysis';

export interface VizComponentDefinition {
  id: string;
  name: string;
  rendererFamily: VizRendererFamily;
  description?: string;
  implementationVersion?: string;
  authoring?: VizComponentAuthoring;
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

export type VizResolvedInputStatus = 'resolved' | 'missing' | 'unsupported';

export interface VizResolvedInputValue {
  key: string;
  sourceKind: VizComponentInputSourceKind;
  source: VizValueSource;
  status: VizResolvedInputStatus;
  value?: unknown;
  message?: string;
}

export interface VizFramePlanIssue {
  code:
    | 'missing-asset'
    | 'missing-artifact'
    | 'missing-graph'
    | 'missing-graph-output'
    | 'missing-feature'
    | 'unsupported-source'
    | 'graph-evaluation-failed'
    | 'missing-component'
    | 'component-render-failed';
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
  graphResults: VizGraphEvaluationResult[];
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
  graphResults: VizGraphEvaluationResult[];
  layers: VizLayerRenderPlanEntry[];
  issues: VizFramePlanIssue[];
}
