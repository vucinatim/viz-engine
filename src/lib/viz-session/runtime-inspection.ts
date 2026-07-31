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
    lastError: null,
  });

let current = createInitialRuntimeInspectionState();

export const runtimeInspection = {
  publishFrame(
    frame: VizSessionRuntimePreviewFrame,
    renderPlan: VizRenderPlan,
    renderedLayerIds: string[],
  ) {
    current = {
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
      lastError: null,
    };
  },
  publishError(
    frame: VizSessionRuntimePreviewFrame,
    error: VizSessionRuntimePreviewError,
  ) {
    current = {
      ...current,
      status: 'failed',
      lastRequestedFrame: frame,
      lastError: error,
    };
  },
  reset() {
    current = createInitialRuntimeInspectionState();
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
};
