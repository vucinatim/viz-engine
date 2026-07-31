import type {
  VizGraphEvaluationResult,
  VizRenderPlan,
} from '@viz-engine/contracts';

import type {
  VizSessionRuntimeInspectionState,
  VizSessionRuntimePreviewError,
  VizSessionRuntimePreviewFrame,
} from './types';

export const createInitialRuntimeInspectionState =
  (): VizSessionRuntimeInspectionState => ({
    status: 'idle',
    lastRequestedFrame: null,
    lastCompletedFrame: null,
    renderCycle: 0,
    lastRenderedLayerIds: [],
    runtimeBackedLayerIds: [],
    lastGraphResults: [],
    lastLayerSnapshots: [],
    lastMaterializedAssets: [],
    lastPlanIssues: [],
    lastTimings: null,
    lastError: null,
  });

let current = createInitialRuntimeInspectionState();
const listeners = new Set<
  (inspection: Readonly<VizSessionRuntimeInspectionState>) => void
>();

const publish = (next: VizSessionRuntimeInspectionState): void => {
  current = next;
  for (const listener of listeners) {
    listener(current);
  }
};

export const runtimeInspection = {
  publishFrame(
    frame: VizSessionRuntimePreviewFrame,
    renderPlan: VizRenderPlan,
    renderedLayerIds: string[],
    timings: NonNullable<VizSessionRuntimeInspectionState['lastTimings']>,
  ) {
    publish({
      status: 'idle',
      lastRequestedFrame: frame,
      lastCompletedFrame: frame,
      renderCycle: current.renderCycle + 1,
      lastRenderedLayerIds: renderedLayerIds,
      runtimeBackedLayerIds: renderedLayerIds,
      lastGraphResults: renderPlan.graphResults,
      lastLayerSnapshots: renderPlan.layers,
      lastMaterializedAssets: renderPlan.materializedAssets,
      lastPlanIssues: renderPlan.issues,
      lastTimings: timings,
      lastError: null,
    });
  },
  publishError(
    frame: VizSessionRuntimePreviewFrame,
    error: VizSessionRuntimePreviewError,
  ) {
    publish({
      ...current,
      status: 'failed',
      lastRequestedFrame: frame,
      lastError: error,
    });
  },
  reset() {
    publish(createInitialRuntimeInspectionState());
  },
  getCurrent(): Readonly<VizSessionRuntimeInspectionState> {
    return current;
  },
  getGraphResults(): readonly VizGraphEvaluationResult[] {
    return current.lastGraphResults;
  },
  inspect(): VizSessionRuntimeInspectionState {
    return structuredClone(current);
  },
  subscribe(
    listener: (inspection: Readonly<VizSessionRuntimeInspectionState>) => void,
  ): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
