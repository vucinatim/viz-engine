import type { VizGraphId } from "./ids.js";
import type { VizValueSource } from "./project.js";
import type { VizFrameContext } from "./runtime.js";

export type VizGraphInputSource = Exclude<VizValueSource, { kind: "graph-output" }>;

export type VizGraphNodeInputBinding =
  | {
      kind: "literal";
      value: unknown;
    }
  | {
      kind: "graph-input";
      inputKey: string;
    }
  | {
      kind: "node-output";
      nodeId: string;
      output: string;
      edgeId?: string;
    };

export interface VizNodeGraphNode {
  id: string;
  type: string;
  inputs?: Record<string, VizGraphNodeInputBinding>;
  metadata?: Record<string, unknown>;
}

export interface VizNodeGraphOutputBinding {
  key: string;
  nodeId: string;
  output: string;
}

export interface VizNodeGraphDocument {
  id: VizGraphId;
  name: string;
  enabled?: boolean;
  inputs?: Record<string, VizGraphInputSource>;
  nodes: VizNodeGraphNode[];
  outputs: VizNodeGraphOutputBinding[];
  metadata?: Record<string, unknown>;
}

export interface VizNodeDefinitionInput {
  key: string;
  label: string;
  required?: boolean;
  description?: string;
}

export interface VizNodeDefinitionOutput {
  key: string;
  label: string;
  description?: string;
}

export type VizNodeCategory = "pure" | "temporal";

export interface VizNodeDefinition {
  type: string;
  name: string;
  category: VizNodeCategory;
  description?: string;
  inputs?: VizNodeDefinitionInput[];
  outputs: VizNodeDefinitionOutput[];
  metadata?: Record<string, unknown>;
}

export interface VizResolvedGraphInputValue {
  key: string;
  value: unknown;
}

export interface VizNodeEvaluateContext {
  graphId: VizGraphId;
  nodeId: string;
  frameContext: VizFrameContext;
  inputs: Record<string, unknown>;
  graphInputs: Record<string, VizResolvedGraphInputValue>;
}

export interface VizNodeStepContext extends VizNodeEvaluateContext {
  deltaTimeSeconds: number;
  previousState: unknown | undefined;
}

export interface VizNodeStepResult {
  state: unknown;
  outputs: Record<string, unknown>;
}

export interface VizNodeImplementation extends VizNodeDefinition {
  createInitialState?: () => unknown;
  evaluate?(context: VizNodeEvaluateContext): Record<string, unknown>;
  step?(context: VizNodeStepContext): VizNodeStepResult;
}

export interface VizGraphEvaluationIssue {
  code:
    | "missing-graph"
    | "missing-graph-input"
    | "missing-node"
    | "missing-node-output"
    | "invalid-graph"
    | "graph-cycle"
    | "node-evaluation-failed";
  graphId: VizGraphId;
  nodeId?: string;
  inputKey?: string;
  outputKey?: string;
  message: string;
}

export interface VizGraphEvaluationResult {
  graphId: VizGraphId;
  values: Record<string, unknown>;
  nodes: Record<
    string,
    {
      inputs: Record<string, unknown>;
      outputs: Record<string, unknown>;
      state?: unknown;
    }
  >;
  issues: VizGraphEvaluationIssue[];
}
