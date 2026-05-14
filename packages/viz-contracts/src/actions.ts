import type { VizArtifactRef } from "./artifacts.js";
import type { VizAssetRef } from "./assets.js";
import type { VizGraphId, VizLayerId } from "./ids.js";
import type {
  VizGraphInputSource,
  VizGraphNodeInputBinding,
  VizNodeGraphNode,
  VizNodeGraphOutputBinding,
} from "./graphs.js";
import type { VizLayer, VizValueSource } from "./project.js";

export type VizActionActor =
  | { kind: "user"; id?: string }
  | { kind: "agent"; id?: string }
  | { kind: "system"; id?: string };

export interface VizActionEnvelope<TAction extends VizProjectAction = VizProjectAction> {
  id: string;
  type: TAction["type"];
  timestamp: string;
  actor: VizActionActor;
  payload: TAction["payload"];
}

export type VizProjectAction =
  | VizAssetAttachAction
  | VizAssetReplaceAction
  | VizArtifactAttachAction
  | VizLayerCreateAction
  | VizLayerRemoveAction
  | VizLayerMoveAction
  | VizLayerSettingsSetAction
  | VizLayerInputSetAction
  | VizGraphCreateAction
  | VizGraphNodeAddAction
  | VizGraphNodeInputSetAction
  | VizGraphOutputSetAction
  | VizGraphInputSetAction;

export interface VizAssetAttachAction {
  type: "asset.attach";
  payload: {
    asset: VizAssetRef;
  };
}

export interface VizAssetReplaceAction {
  type: "asset.replace";
  payload: {
    assetId: string;
    asset: VizAssetRef;
  };
}

export interface VizArtifactAttachAction {
  type: "artifact.attach";
  payload: {
    artifact: VizArtifactRef;
  };
}

export interface VizLayerCreateAction {
  type: "layer.create";
  payload: {
    layerId?: VizLayerId;
    index?: number;
    layer: Omit<VizLayer, "id"> & Partial<Pick<VizLayer, "id">>;
  };
}

export interface VizLayerRemoveAction {
  type: "layer.remove";
  payload: {
    layerId: VizLayerId;
  };
}

export interface VizLayerMoveAction {
  type: "layer.move";
  payload: {
    layerId: VizLayerId;
    index: number;
  };
}

export interface VizLayerSettingsSetAction {
  type: "layer.settings.set";
  payload: {
    layerId: VizLayerId;
    path: string;
    value: unknown;
  };
}

export interface VizLayerInputSetAction {
  type: "layer.input.set";
  payload: {
    layerId: VizLayerId;
    inputKey: string;
    valueSource: VizValueSource | null;
  };
}

export interface VizGraphCreateAction {
  type: "graph.create";
  payload: {
    graphId?: VizGraphId;
    name: string;
  };
}

export interface VizGraphInputSetAction {
  type: "graph.input.set";
  payload: {
    graphId: VizGraphId;
    inputKey: string;
    source: VizGraphInputSource | null;
  };
}

export interface VizGraphNodeAddAction {
  type: "graph.node.add";
  payload: {
    graphId: VizGraphId;
    nodeId?: string;
    nodeType: string;
    initialInputs?: Record<string, VizGraphNodeInputBinding>;
    metadata?: VizNodeGraphNode["metadata"];
  };
}

export interface VizGraphNodeInputSetAction {
  type: "graph.node.input.set";
  payload: {
    graphId: VizGraphId;
    nodeId: string;
    inputKey: string;
    binding: VizGraphNodeInputBinding | null;
  };
}

export interface VizGraphOutputSetAction {
  type: "graph.output.set";
  payload: {
    graphId: VizGraphId;
    output: VizNodeGraphOutputBinding;
  };
}

export interface VizActionWarning {
  code:
    | "generated-id"
    | "replaced-existing-ref"
    | "replaced-existing-output"
    | "set-on-missing-container";
  message: string;
}

export interface VizActionError {
  code:
    | "missing-layer"
    | "missing-graph"
    | "missing-node"
    | "duplicate-id"
    | "invalid-index"
    | "invalid-path";
  message: string;
}

export interface VizProjectActionResult {
  ok: boolean;
  project: import("./project.js").VizProjectDocument;
  warnings: VizActionWarning[];
  errors: VizActionError[];
}
