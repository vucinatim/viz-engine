import type {
  VizArtifactId,
  VizExecutionMode,
  VizFrameContext,
  VizGraphEvaluationResult,
  VizGraphEvaluationIssue,
  VizGraphId,
  VizMaterializedAsset,
  VizProjectDocument,
  VizResolvedArtifact,
  VizResolvedAsset,
} from "@viz-engine/contracts";
import { createFrameContext } from "./frame-context.js";
import { materializeVizResolvedAssets } from "./materialized-assets.js";
import { assertValidProjectDocument } from "./validation.js";

export interface CreateVizRuntimeSessionOptions {
  project: VizProjectDocument;
  mode: VizExecutionMode;
  resolvedAssets?: VizResolvedAsset[];
  resolvedArtifacts?: VizResolvedArtifact[];
  seed?: string;
  graphCheckpointIntervalFrames?: number;
}

export interface VizGraphRuntimeCheckpoint {
  graphId: VizGraphId;
  frame: number;
  values: Record<string, unknown>;
  nodes: VizGraphEvaluationResult["nodes"];
  issues: VizGraphEvaluationIssue[];
  nodeStates: Record<string, unknown>;
}

export interface VizRuntimeSession {
  readonly project: VizProjectDocument;
  readonly mode: VizExecutionMode;
  readonly seed: string;
  getFrameContext(frame: number): VizFrameContext;
  getOrderedLayers(): VizProjectDocument["layers"];
  getResolvedAssetMap(): ReadonlyMap<string, VizResolvedAsset>;
  getMaterializedAssetMap(): ReadonlyMap<string, VizMaterializedAsset>;
  getResolvedArtifactMap(): ReadonlyMap<VizArtifactId, VizResolvedArtifact>;
  getGraphCheckpointIntervalFrames(): number;
  getGraphCheckpointBeforeOrAt(
    graphId: VizGraphId,
    frame: number,
  ): VizGraphRuntimeCheckpoint | undefined;
  listGraphCheckpoints(graphId: VizGraphId): VizGraphRuntimeCheckpoint[];
  setGraphCheckpoint(checkpoint: VizGraphRuntimeCheckpoint): void;
}

const cloneUnknown = <T>(value: T): T => {
  return structuredClone(value);
};

const cloneGraphRuntimeCheckpoint = (
  checkpoint: VizGraphRuntimeCheckpoint,
): VizGraphRuntimeCheckpoint => {
  return {
    graphId: checkpoint.graphId,
    frame: checkpoint.frame,
    values: cloneUnknown(checkpoint.values),
    nodes: cloneUnknown(checkpoint.nodes),
    issues: cloneUnknown(checkpoint.issues),
    nodeStates: cloneUnknown(checkpoint.nodeStates),
  };
};

export const orderProjectLayers = (project: VizProjectDocument): VizProjectDocument["layers"] => {
  const layersById = new Map(project.layers.map((layer) => [layer.id, layer]));
  const orderedLayers = project.layerOrder
    .map((layerId) => layersById.get(layerId))
    .filter((layer): layer is VizProjectDocument["layers"][number] => Boolean(layer));

  for (const layer of project.layers) {
    if (project.layerOrder.includes(layer.id)) {
      continue;
    }

    orderedLayers.push(layer);
  }

  return orderedLayers;
};

export const createVizRuntimeSession = ({
  project,
  mode,
  resolvedAssets = [],
  resolvedArtifacts = [],
  seed = "viz-default-seed",
  graphCheckpointIntervalFrames = 30,
}: CreateVizRuntimeSessionOptions): VizRuntimeSession => {
  assertValidProjectDocument(project);

  const assetMap = new Map(resolvedAssets.map((asset) => [asset.id, asset]));
  const materializedAssets = materializeVizResolvedAssets(resolvedAssets);
  const materializedAssetMap = new Map(materializedAssets.map((asset) => [asset.id, asset]));
  const artifactMap = new Map(resolvedArtifacts.map((artifact) => [artifact.id, artifact]));
  const graphCheckpointStore = new Map<VizGraphId, Map<number, VizGraphRuntimeCheckpoint>>();
  const checkpointInterval = Math.max(1, Math.trunc(graphCheckpointIntervalFrames));

  return {
    project,
    mode,
    seed,
    getFrameContext: (frame) =>
      createFrameContext({
        frame,
        timeline: project.timeline,
        mode,
        seed,
      }),
    getOrderedLayers: () => orderProjectLayers(project),
    getResolvedAssetMap: () => assetMap,
    getMaterializedAssetMap: () => materializedAssetMap,
    getResolvedArtifactMap: () => artifactMap,
    getGraphCheckpointIntervalFrames: () => checkpointInterval,
    getGraphCheckpointBeforeOrAt: (graphId, frame) => {
      const checkpoints = graphCheckpointStore.get(graphId);

      if (!checkpoints || checkpoints.size === 0) {
        return undefined;
      }

      let bestFrame = -1;
      let bestCheckpoint: VizGraphRuntimeCheckpoint | undefined;

      for (const [checkpointFrame, checkpoint] of checkpoints.entries()) {
        if (checkpointFrame > frame || checkpointFrame < bestFrame) {
          continue;
        }

        bestFrame = checkpointFrame;
        bestCheckpoint = checkpoint;
      }

      return bestCheckpoint ? cloneGraphRuntimeCheckpoint(bestCheckpoint) : undefined;
    },
    listGraphCheckpoints: (graphId) => {
      const checkpoints = graphCheckpointStore.get(graphId);

      if (!checkpoints) {
        return [];
      }

      return [...checkpoints.values()]
        .sort((left, right) => left.frame - right.frame)
        .map((checkpoint) => cloneGraphRuntimeCheckpoint(checkpoint));
    },
    setGraphCheckpoint: (checkpoint) => {
      const existing = graphCheckpointStore.get(checkpoint.graphId) ?? new Map<number, VizGraphRuntimeCheckpoint>();
      existing.set(checkpoint.frame, cloneGraphRuntimeCheckpoint(checkpoint));
      graphCheckpointStore.set(checkpoint.graphId, existing);
    },
  };
};
