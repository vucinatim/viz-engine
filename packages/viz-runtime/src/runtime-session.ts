import type {
  VizArtifactId,
  VizExecutionMode,
  VizFrameContext,
  VizGraphEvaluationIssue,
  VizGraphEvaluationResult,
  VizGraphId,
  VizMaterializedAsset,
  VizProjectDocument,
  VizResolvedArtifact,
  VizResolvedAsset,
  VizRuntimeInputs,
} from '@viz-engine/contracts';
import { createFrameContext } from './frame-context.js';
import { materializeVizResolvedAssets } from './materialized-assets.js';
import { assertValidProjectDocument } from './validation.js';

export interface CreateVizRuntimeSessionOptions {
  project: VizProjectDocument;
  mode: VizExecutionMode;
  resolvedAssets?: VizResolvedAsset[];
  resolvedArtifacts?: VizResolvedArtifact[];
  seed?: string;
  graphCheckpointIntervalFrames?: number;
  maxGraphCheckpointsPerGraph?: number;
  initialGraphCheckpoints?: VizGraphRuntimeCheckpoint[];
  componentCheckpointIntervalFrames?: number;
  maxComponentCheckpointsPerLayer?: number;
  initialComponentCheckpoints?: VizComponentRuntimeCheckpoint[];
  maxRuntimeInputFrames?: number;
  evaluationStartFrame?: number;
}

export interface VizGraphRuntimeCheckpoint {
  readonly graphId: VizGraphId;
  readonly frame: number;
  readonly values: Record<string, unknown>;
  readonly nodes: VizGraphEvaluationResult['nodes'];
  readonly issues: VizGraphEvaluationIssue[];
  readonly nodeStates: Record<string, unknown>;
}

export interface VizComponentRuntimeCheckpoint {
  readonly layerId: string;
  readonly componentId: string;
  readonly implementationVersion?: string;
  readonly frame: number;
  readonly state: unknown;
}

export interface VizRuntimeSession {
  readonly project: VizProjectDocument;
  readonly mode: VizExecutionMode;
  readonly seed: string;
  getEvaluationStartFrame(): number;
  getFrameContext(frame: number): VizFrameContext;
  getOrderedLayers(): VizProjectDocument['layers'];
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
  getComponentCheckpointIntervalFrames(): number;
  getComponentCheckpointBeforeOrAt(
    layerId: string,
    componentId: string,
    implementationVersion: string | undefined,
    frame: number,
  ): VizComponentRuntimeCheckpoint | undefined;
  listComponentCheckpoints(layerId: string): VizComponentRuntimeCheckpoint[];
  setComponentCheckpoint(checkpoint: VizComponentRuntimeCheckpoint): void;
  getRuntimeInputs(frame: number): VizRuntimeInputs | undefined;
  setRuntimeInputs(frame: number, inputs: VizRuntimeInputs): void;
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

const cloneComponentRuntimeCheckpoint = (
  checkpoint: VizComponentRuntimeCheckpoint,
): VizComponentRuntimeCheckpoint => ({
  layerId: checkpoint.layerId,
  componentId: checkpoint.componentId,
  ...(checkpoint.implementationVersion === undefined
    ? {}
    : { implementationVersion: checkpoint.implementationVersion }),
  frame: checkpoint.frame,
  state: cloneUnknown(checkpoint.state),
});

export const orderProjectLayers = (
  project: VizProjectDocument,
): VizProjectDocument['layers'] => {
  const layersById = new Map(project.layers.map((layer) => [layer.id, layer]));
  const orderedLayers = project.layerOrder
    .map((layerId) => layersById.get(layerId))
    .filter((layer): layer is VizProjectDocument['layers'][number] =>
      Boolean(layer),
    );

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
  seed = 'viz-default-seed',
  graphCheckpointIntervalFrames = 30,
  maxGraphCheckpointsPerGraph = 512,
  initialGraphCheckpoints = [],
  componentCheckpointIntervalFrames = 30,
  maxComponentCheckpointsPerLayer = 512,
  initialComponentCheckpoints = [],
  maxRuntimeInputFrames = 512,
  evaluationStartFrame = 0,
}: CreateVizRuntimeSessionOptions): VizRuntimeSession => {
  assertValidProjectDocument(project);

  const assetMap = new Map(resolvedAssets.map((asset) => [asset.id, asset]));
  const materializedAssets = materializeVizResolvedAssets(resolvedAssets);
  const materializedAssetMap = new Map(
    materializedAssets.map((asset) => [asset.id, asset]),
  );
  const artifactMap = new Map(
    resolvedArtifacts.map((artifact) => [artifact.id, artifact]),
  );
  const graphCheckpointStore = new Map<
    VizGraphId,
    Map<number, VizGraphRuntimeCheckpoint>
  >();
  for (const checkpoint of initialGraphCheckpoints) {
    const checkpoints =
      graphCheckpointStore.get(checkpoint.graphId) ??
      new Map<number, VizGraphRuntimeCheckpoint>();
    checkpoints.set(checkpoint.frame, cloneGraphRuntimeCheckpoint(checkpoint));
    graphCheckpointStore.set(checkpoint.graphId, checkpoints);
  }
  const checkpointInterval = Math.max(
    1,
    Math.trunc(graphCheckpointIntervalFrames),
  );
  const graphCheckpointLimit = Math.max(
    1,
    Math.trunc(maxGraphCheckpointsPerGraph),
  );
  const componentCheckpointStore = new Map<
    string,
    Map<number, VizComponentRuntimeCheckpoint>
  >();
  for (const checkpoint of initialComponentCheckpoints) {
    const checkpoints =
      componentCheckpointStore.get(checkpoint.layerId) ??
      new Map<number, VizComponentRuntimeCheckpoint>();
    checkpoints.set(
      checkpoint.frame,
      cloneComponentRuntimeCheckpoint(checkpoint),
    );
    componentCheckpointStore.set(checkpoint.layerId, checkpoints);
  }
  const componentCheckpointInterval = Math.max(
    1,
    Math.trunc(componentCheckpointIntervalFrames),
  );
  const componentCheckpointLimit = Math.max(
    1,
    Math.trunc(maxComponentCheckpointsPerLayer),
  );
  const runtimeInputStore = new Map<number, VizRuntimeInputs>();
  const runtimeInputLimit = Math.max(1, Math.trunc(maxRuntimeInputFrames));
  const normalizedEvaluationStartFrame = createFrameContext({
    frame: evaluationStartFrame,
    timeline: project.timeline,
    mode,
    seed,
  }).frame;

  return {
    project,
    mode,
    seed,
    getEvaluationStartFrame: () => normalizedEvaluationStartFrame,
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

      return bestCheckpoint;
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
      const existing =
        graphCheckpointStore.get(checkpoint.graphId) ??
        new Map<number, VizGraphRuntimeCheckpoint>();
      for (const storedFrame of existing.keys()) {
        if (storedFrame % checkpointInterval !== 0) {
          existing.delete(storedFrame);
        }
      }
      existing.set(checkpoint.frame, checkpoint);
      while (existing.size > graphCheckpointLimit) {
        existing.delete(Math.min(...existing.keys()));
      }
      graphCheckpointStore.set(checkpoint.graphId, existing);
    },
    getComponentCheckpointIntervalFrames: () => componentCheckpointInterval,
    getComponentCheckpointBeforeOrAt: (
      layerId,
      componentId,
      implementationVersion,
      frame,
    ) => {
      const checkpoints = componentCheckpointStore.get(layerId);
      if (!checkpoints) {
        return undefined;
      }

      let bestFrame = -1;
      let bestCheckpoint: VizComponentRuntimeCheckpoint | undefined;
      for (const [checkpointFrame, checkpoint] of checkpoints) {
        if (
          checkpointFrame > frame ||
          checkpointFrame < bestFrame ||
          checkpoint.componentId !== componentId ||
          checkpoint.implementationVersion !== implementationVersion
        ) {
          continue;
        }
        bestFrame = checkpointFrame;
        bestCheckpoint = checkpoint;
      }
      return bestCheckpoint;
    },
    listComponentCheckpoints: (layerId) =>
      [...(componentCheckpointStore.get(layerId)?.values() ?? [])]
        .sort((left, right) => left.frame - right.frame)
        .map(cloneComponentRuntimeCheckpoint),
    setComponentCheckpoint: (checkpoint) => {
      const checkpoints =
        componentCheckpointStore.get(checkpoint.layerId) ??
        new Map<number, VizComponentRuntimeCheckpoint>();
      for (const storedFrame of checkpoints.keys()) {
        if (storedFrame % componentCheckpointInterval !== 0) {
          checkpoints.delete(storedFrame);
        }
      }
      checkpoints.set(checkpoint.frame, checkpoint);
      while (checkpoints.size > componentCheckpointLimit) {
        const oldestFrame = Math.min(...checkpoints.keys());
        checkpoints.delete(oldestFrame);
      }
      componentCheckpointStore.set(checkpoint.layerId, checkpoints);
    },
    getRuntimeInputs: (frame) => runtimeInputStore.get(frame),
    setRuntimeInputs: (frame, inputs) => {
      runtimeInputStore.set(frame, cloneUnknown(inputs));
      while (runtimeInputStore.size > runtimeInputLimit) {
        runtimeInputStore.delete(Math.min(...runtimeInputStore.keys()));
      }
    },
  };
};
