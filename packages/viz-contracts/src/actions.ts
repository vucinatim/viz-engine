import type { VizArtifactRef } from './artifacts.js';
import type { VizAssetRef } from './assets.js';
import type {
  VizGraphInputSource,
  VizGraphNodeInputBinding,
  VizNodeGraphNode,
  VizNodeGraphOutputBinding,
} from './graphs.js';
import type { VizGraphId, VizLayerId } from './ids.js';
import type { VizLayer, VizValueSource } from './project.js';

export type VizActionActor =
  | { kind: 'user'; id?: string }
  | { kind: 'agent'; id?: string }
  | { kind: 'system'; id?: string };

export interface VizActionEnvelope<
  TAction extends VizProjectAction = VizProjectAction,
> {
  id: string;
  transactionId: string;
  type: TAction['type'];
  timestamp: string;
  actor: VizActionActor;
  payload: TAction['payload'];
}

export interface VizProjectTransaction {
  id?: string;
  expectedRevision?: number;
  dryRun?: boolean;
  actions: VizProjectAction[];
}

export type VizProjectTransactionStatus =
  'applied' | 'dry-run' | 'conflict' | 'rejected';

export interface VizProjectRevisionConflict {
  expectedRevision: number;
  actualRevision: number;
}

export type VizProjectAction =
  | VizAssetAttachAction
  | VizAssetReplaceAction
  | VizArtifactAttachAction
  | VizLayerCreateAction
  | VizLayerRemoveAction
  | VizLayerMoveAction
  | VizLayerReplaceAction
  | VizLayerSettingsSetAction
  | VizLayerInputSetAction
  | VizTimelineSetAction
  | VizGraphCreateAction
  | VizGraphReplaceAction
  | VizGraphRemoveAction
  | VizGraphNodeAddAction
  | VizGraphNodeRemoveAction
  | VizGraphNodePositionSetAction
  | VizGraphNodeInputSetAction
  | VizGraphOutputSetAction
  | VizGraphOutputRemoveAction
  | VizGraphOutputPositionSetAction
  | VizGraphEnabledSetAction
  | VizGraphInputSetAction;

export interface VizAssetAttachAction {
  type: 'asset.attach';
  payload: {
    asset: VizAssetRef;
  };
}

export interface VizAssetReplaceAction {
  type: 'asset.replace';
  payload: {
    assetId: string;
    asset: VizAssetRef;
  };
}

export interface VizArtifactAttachAction {
  type: 'artifact.attach';
  payload: {
    artifact: VizArtifactRef;
  };
}

export interface VizLayerCreateAction {
  type: 'layer.create';
  payload: {
    layerId?: VizLayerId;
    index?: number;
    layer: Omit<VizLayer, 'id'> & Partial<Pick<VizLayer, 'id'>>;
  };
}

export interface VizLayerRemoveAction {
  type: 'layer.remove';
  payload: {
    layerId: VizLayerId;
  };
}

export interface VizLayerMoveAction {
  type: 'layer.move';
  payload: {
    layerId: VizLayerId;
    index: number;
  };
}

export interface VizLayerReplaceAction {
  type: 'layer.replace';
  payload: {
    layerId: VizLayerId;
    layer: VizLayer;
  };
}

export interface VizLayerSettingsSetAction {
  type: 'layer.settings.set';
  payload: {
    layerId: VizLayerId;
    path: string;
    value: unknown;
  };
}

export interface VizLayerInputSetAction {
  type: 'layer.input.set';
  payload: {
    layerId: VizLayerId;
    inputKey: string;
    valueSource: VizValueSource | null;
  };
}

export interface VizTimelineSetAction {
  type: 'timeline.set';
  payload: {
    timeline: import('./runtime.js').VizTimeline;
  };
}

export interface VizGraphCreateAction {
  type: 'graph.create';
  payload: {
    graphId?: VizGraphId;
    name: string;
  };
}

export interface VizGraphReplaceAction {
  type: 'graph.replace';
  payload: {
    graphId: VizGraphId;
    graph: import('./graphs.js').VizNodeGraphDocument;
  };
}

export interface VizGraphRemoveAction {
  type: 'graph.remove';
  payload: {
    graphId: VizGraphId;
  };
}

export interface VizGraphInputSetAction {
  type: 'graph.input.set';
  payload: {
    graphId: VizGraphId;
    inputKey: string;
    source: VizGraphInputSource | null;
  };
}

export interface VizGraphNodeAddAction {
  type: 'graph.node.add';
  payload: {
    graphId: VizGraphId;
    nodeId?: string;
    nodeType: string;
    position?: VizNodeGraphNode['position'];
    initialInputs?: Record<string, VizGraphNodeInputBinding>;
    metadata?: VizNodeGraphNode['metadata'];
  };
}

export interface VizGraphNodeRemoveAction {
  type: 'graph.node.remove';
  payload: {
    graphId: VizGraphId;
    nodeId: string;
  };
}

export interface VizGraphNodePositionSetAction {
  type: 'graph.node.position.set';
  payload: {
    graphId: VizGraphId;
    nodeId: string;
    position: {
      x: number;
      y: number;
    };
  };
}

export interface VizGraphNodeInputSetAction {
  type: 'graph.node.input.set';
  payload: {
    graphId: VizGraphId;
    nodeId: string;
    inputKey: string;
    binding: VizGraphNodeInputBinding | null;
  };
}

export interface VizGraphOutputSetAction {
  type: 'graph.output.set';
  payload: {
    graphId: VizGraphId;
    output: VizNodeGraphOutputBinding;
  };
}

export interface VizGraphOutputRemoveAction {
  type: 'graph.output.remove';
  payload: {
    graphId: VizGraphId;
    outputKey: string;
  };
}

export interface VizGraphOutputPositionSetAction {
  type: 'graph.output.position.set';
  payload: {
    graphId: VizGraphId;
    outputKey: string;
    position: {
      x: number;
      y: number;
    };
  };
}

export interface VizGraphEnabledSetAction {
  type: 'graph.enabled.set';
  payload: {
    graphId: VizGraphId;
    enabled: boolean;
  };
}

export interface VizActionWarning {
  code:
    | 'generated-id'
    | 'replaced-existing-ref'
    | 'replaced-existing-output'
    | 'set-on-missing-container';
  message: string;
}

export interface VizActionError {
  code:
    | 'missing-layer'
    | 'missing-graph'
    | 'missing-node'
    | 'duplicate-id'
    | 'invalid-index'
    | 'invalid-path';
  message: string;
}

export interface VizProjectActionResult {
  ok: boolean;
  project: import('./project.js').VizProjectDocument;
  warnings: VizActionWarning[];
  errors: VizActionError[];
}
