import type {
  VizGraphEvaluationResult,
} from '@viz-engine/contracts';

import { getVizSessionState } from './store';
import type { VizSessionState } from './types';

const findGraphResult = (
  results: readonly VizGraphEvaluationResult[],
  graphId: string,
) => results.find((result) => result.graphId === graphId);

const findNodeSnapshot = (
  results: readonly VizGraphEvaluationResult[],
  nodeId: string,
) => {
  for (const result of results) {
    const snapshot = result.nodes[nodeId];

    if (snapshot) {
      return snapshot;
    }
  }

  return undefined;
};

export const selectRuntimeGraphValue = (
  state: VizSessionState,
  graphId: string,
  outputKey = 'value',
): unknown =>
  findGraphResult(
    state.preview.runtimeInspection.lastGraphResults,
    graphId,
  )?.values[outputKey];

export const getRuntimeGraphValue = (
  graphId: string,
  outputKey = 'value',
): unknown =>
  selectRuntimeGraphValue(
    getVizSessionState(),
    graphId,
    outputKey,
  );

export const getRuntimeNodeInput = (
  nodeId: string,
  inputKey: string,
): unknown =>
  findNodeSnapshot(
    getVizSessionState().preview.runtimeInspection.lastGraphResults,
    nodeId,
  )?.inputs[inputKey];

export const getRuntimeNodeOutput = (
  nodeId: string,
): Record<string, unknown> | undefined =>
  findNodeSnapshot(
    getVizSessionState().preview.runtimeInspection.lastGraphResults,
    nodeId,
  )?.outputs;

export const getRuntimeNodeState = (
  nodeId: string,
): unknown =>
  findNodeSnapshot(
    getVizSessionState().preview.runtimeInspection.lastGraphResults,
    nodeId,
  )?.state;
