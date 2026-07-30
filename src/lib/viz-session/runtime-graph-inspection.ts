import type {
  VizGraphEvaluationResult,
  VizProjectDocument,
  VizValueSource,
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

export interface VizParameterGraphBinding {
  graphId: string;
  output: string;
}

export interface VizEditorGraphPresentation {
  displayName: string;
  contextLabel: string;
  detailLabel?: string;
  boundParameterIds: string[];
  outputKeys: string[];
  supportsParameterPresets: boolean;
}

const parameterBindingCache = new WeakMap<
  VizProjectDocument,
  Readonly<Record<string, VizParameterGraphBinding>>
>();

export const splitParameterId = (
  parameterId: string,
): { layerId: string; inputKey: string } | undefined => {
  const separatorIndex = parameterId.indexOf(':');

  if (separatorIndex <= 0 || separatorIndex === parameterId.length - 1) {
    return undefined;
  }

  return {
    layerId: parameterId.slice(0, separatorIndex),
    inputKey: parameterId.slice(separatorIndex + 1),
  };
};

export const resolveParameterGraphBinding = (
  project: VizProjectDocument,
  parameterId: string,
): VizParameterGraphBinding | undefined => {
  const parameter = splitParameterId(parameterId);
  const source: VizValueSource | undefined = parameter
    ? project.layers.find((layer) => layer.id === parameter.layerId)?.inputs?.[
        parameter.inputKey
      ]
    : undefined;

  return source?.kind === 'graph-output'
    ? {
        graphId: source.graphId,
        output: source.output,
      }
    : undefined;
};

/**
 * Projects canonical layer input bindings into the parameter-oriented shape
 * the editor UI needs. The project object is immutable between revisions, so
 * this cache also gives React selectors stable identities.
 */
export const selectParameterGraphBindings = (
  state: VizSessionState,
): Readonly<Record<string, VizParameterGraphBinding>> => {
  const project = state.project.workingProject;
  const cached = parameterBindingCache.get(project);

  if (cached) {
    return cached;
  }

  const enabledGraphIds = new Set(
    (project.graphs ?? [])
      .filter((graph) => graph.enabled ?? true)
      .map((graph) => graph.id),
  );
  const bindings: Record<string, VizParameterGraphBinding> = {};

  for (const layer of project.layers) {
    for (const [inputKey, source] of Object.entries(layer.inputs ?? {})) {
      if (
        source.kind === 'graph-output' &&
        enabledGraphIds.has(source.graphId)
      ) {
        bindings[`${layer.id}:${inputKey}`] = {
          graphId: source.graphId,
          output: source.output,
        };
      }
    }
  }

  parameterBindingCache.set(project, bindings);
  return bindings;
};

export const resolveNetworkIdForParameter = (
  project: VizProjectDocument,
  parameterOrGraphId: string,
): string =>
  resolveParameterGraphBinding(project, parameterOrGraphId)?.graphId ??
  parameterOrGraphId;

const humanizeIdentifier = (value: string): string =>
  value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_.]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase())
    .trim();

export const describeProjectGraph = (
  project: VizProjectDocument,
  graphId: string,
): VizEditorGraphPresentation => {
  const graph = (project.graphs ?? []).find(
    (candidate) => candidate.id === graphId,
  );
  const boundParameterIds = project.layers.flatMap((layer) =>
    Object.entries(layer.inputs ?? {}).flatMap(([inputKey, source]) =>
      source.kind === 'graph-output' && source.graphId === graphId
        ? [`${layer.id}:${inputKey}`]
        : [],
    ),
  );
  const outputKeys = graph?.outputs.map((output) => output.key) ?? [];

  if (boundParameterIds.length === 1 && outputKeys.length <= 1) {
    const parameter = splitParameterId(boundParameterIds[0]!);
    const path = parameter?.inputKey.split(':') ?? [];
    const layer = parameter
      ? project.layers.find((candidate) => candidate.id === parameter.layerId)
      : undefined;

    return {
      displayName: humanizeIdentifier(path.at(-1) ?? graph?.name ?? graphId),
      contextLabel: layer?.name ?? 'Layer parameter',
      ...(path.length > 1
        ? {
            detailLabel: path.slice(0, -1).map(humanizeIdentifier).join(' › '),
          }
        : {}),
      boundParameterIds,
      outputKeys,
      supportsParameterPresets: true,
    };
  }

  return {
    displayName: graph?.name ?? humanizeIdentifier(graphId),
    contextLabel:
      boundParameterIds.length > 1 ? 'Shared graph' : 'Project graph',
    detailLabel: `${boundParameterIds.length} bound ${
      boundParameterIds.length === 1 ? 'parameter' : 'parameters'
    } • ${outputKeys.length} ${outputKeys.length === 1 ? 'output' : 'outputs'}`,
    boundParameterIds,
    outputKeys,
    supportsParameterPresets: false,
  };
};

const selectRuntimeGraphValue = (
  state: VizSessionState,
  graphId: string,
  outputKey = 'value',
): unknown =>
  findGraphResult(state.preview.runtimeInspection.lastGraphResults, graphId)
    ?.values[outputKey];

export const selectRuntimeGraphValueForParameter = (
  state: VizSessionState,
  parameterId: string,
): unknown => {
  const binding =
    selectParameterGraphBindings(state)[parameterId] ??
    resolveParameterGraphBinding(state.project.workingProject, parameterId);

  return selectRuntimeGraphValue(
    state,
    binding?.graphId ?? parameterId,
    binding?.output ?? 'value',
  );
};

export const getRuntimeGraphValue = (
  graphId: string,
  outputKey = 'value',
): unknown => selectRuntimeGraphValue(getVizSessionState(), graphId, outputKey);

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

export const getRuntimeNodeState = (nodeId: string): unknown =>
  findNodeSnapshot(
    getVizSessionState().preview.runtimeInspection.lastGraphResults,
    nodeId,
  )?.state;
