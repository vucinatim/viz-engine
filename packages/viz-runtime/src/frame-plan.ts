import type {
  VizComponentDefinition,
  VizExecutionMode,
  VizFramePlan,
  VizFramePlanIssue,
  VizGraphEvaluationResult,
  VizLayer,
  VizLayerFrameSnapshot,
  VizMaterializedAsset,
  VizResolvedInputValue,
  VizRuntimeInputs,
  VizValueSource,
} from '@viz-engine/contracts';
import {
  getAudioFeatureTimelineArtifact,
  sampleAudioFeatureValue,
} from './audio-feature-timeline.js';
import type { VizComponentRegistry } from './component-registry.js';
import type {
  VizRuntimeGraphInputValues,
  VizRuntimeGraphValues,
} from './graph-evaluator.js';
import { evaluateVizGraphs } from './graph-evaluator.js';
import type { VizNodeRegistry } from './node-registry.js';
import {
  createVizStandardGraphRuntimeInputValues,
  resolveVizComponentRuntimeInputValues,
} from './runtime-inputs.js';
import type { VizRuntimeSession } from './runtime-session.js';

export interface CreateVizFramePlanOptions {
  session: VizRuntimeSession;
  frame: number;
  registry?: VizComponentRegistry;
  nodeRegistry?: VizNodeRegistry;
  inputValues?: VizRuntimeFrameInputValues;
  layerValues?: VizRuntimeLayerValues;
  graphInputValues?: VizRuntimeGraphInputValues;
  graphValues?: VizRuntimeGraphValues;
  runtimeInputs?: VizRuntimeInputs;
}

export type VizRuntimeFrameInputValues = Readonly<
  Record<string, Readonly<Record<string, unknown>>>
>;

export type VizRuntimeLayerValues = Readonly<
  Record<string, Readonly<VizLayer>>
>;

const getDefaultRendererFamily = (
  layer: VizLayer,
  component: VizComponentDefinition | undefined,
): VizLayerFrameSnapshot['rendererFamily'] => {
  return layer.rendererFamily ?? component?.rendererFamily ?? 'unknown';
};

const resolveLiteralInput = (
  key: string,
  source: Extract<VizValueSource, { kind: 'literal' }>,
): VizResolvedInputValue => {
  return {
    key,
    sourceKind: 'literal',
    source,
    status: 'resolved',
    value: source.value,
  };
};

const createIssue = (
  code: VizFramePlanIssue['code'],
  layerId: string,
  inputKey: string,
  message: string,
): VizFramePlanIssue => ({
  code,
  layerId,
  inputKey,
  message,
});

const resolveArtifactFeatureInput = (
  key: string,
  source: Extract<VizValueSource, { kind: 'artifact-feature' }>,
  session: VizRuntimeSession,
  frame: number,
  issues: VizFramePlanIssue[],
  layerId: string,
): VizResolvedInputValue => {
  const artifact = session.getResolvedArtifactMap().get(source.artifactId);
  const timelineArtifact = getAudioFeatureTimelineArtifact(artifact);

  if (!timelineArtifact) {
    issues.push(
      createIssue(
        'missing-artifact',
        layerId,
        key,
        `Layer "${layerId}" could not resolve audio feature artifact "${source.artifactId}".`,
      ),
    );

    return {
      key,
      sourceKind: 'artifact-feature',
      source,
      status: 'missing',
      message: `Missing resolved artifact "${source.artifactId}".`,
    };
  }

  const sampledValue = sampleAudioFeatureValue(
    timelineArtifact,
    source.feature,
    frame,
  );

  if (sampledValue === undefined) {
    issues.push(
      createIssue(
        'missing-feature',
        layerId,
        key,
        `Artifact "${source.artifactId}" does not contain feature "${source.feature}".`,
      ),
    );

    return {
      key,
      sourceKind: 'artifact-feature',
      source,
      status: 'missing',
      message: `Missing feature "${source.feature}" in artifact "${source.artifactId}".`,
    };
  }

  return {
    key,
    sourceKind: 'artifact-feature',
    source,
    status: 'resolved',
    value: sampledValue,
  };
};

const resolveAssetRefInput = (
  key: string,
  source: Extract<VizValueSource, { kind: 'asset-ref' }>,
  session: VizRuntimeSession,
  issues: VizFramePlanIssue[],
  layerId: string,
): VizResolvedInputValue => {
  const asset = session.getMaterializedAssetMap().get(source.assetId);

  if (!asset) {
    issues.push(
      createIssue(
        'missing-asset',
        layerId,
        key,
        `Layer "${layerId}" could not resolve asset "${source.assetId}".`,
      ),
    );

    return {
      key,
      sourceKind: 'asset-ref',
      source,
      status: 'missing',
      message: `Missing resolved asset "${source.assetId}".`,
    };
  }

  return {
    key,
    sourceKind: 'asset-ref',
    source,
    status: 'resolved',
    value: asset satisfies VizMaterializedAsset,
  };
};

const resolveInputValue = (
  key: string,
  source: VizValueSource,
  session: VizRuntimeSession,
  frame: number,
  issues: VizFramePlanIssue[],
  layerId: string,
  graphResults: Map<string, VizGraphEvaluationResult>,
): VizResolvedInputValue => {
  if (source.kind === 'literal') {
    return resolveLiteralInput(key, source);
  }

  if (source.kind === 'artifact-feature') {
    return resolveArtifactFeatureInput(
      key,
      source,
      session,
      frame,
      issues,
      layerId,
    );
  }

  if (source.kind === 'asset-ref') {
    return resolveAssetRefInput(key, source, session, issues, layerId);
  }

  if (source.kind === 'graph-output') {
    const graphResult = graphResults.get(source.graphId);

    if (!graphResult) {
      issues.push(
        createIssue(
          'missing-graph',
          layerId,
          key,
          `Layer "${layerId}" references missing graph "${source.graphId}".`,
        ),
      );

      return {
        key,
        sourceKind: 'graph-output',
        source,
        status: 'missing',
        message: `Missing graph "${source.graphId}".`,
      };
    }

    const graphOutput = graphResult.values[source.output];

    if (graphOutput === undefined) {
      issues.push(
        createIssue(
          'missing-graph-output',
          layerId,
          key,
          `Graph "${source.graphId}" did not produce output "${source.output}" for layer "${layerId}".`,
        ),
      );

      return {
        key,
        sourceKind: 'graph-output',
        source,
        status: 'missing',
        message: `Missing graph output "${source.output}" from graph "${source.graphId}".`,
      };
    }

    return {
      key,
      sourceKind: 'graph-output',
      source,
      status: 'resolved',
      value: graphOutput,
    };
  }

  const exhaustiveSource: never = source;
  throw new Error(
    `Unhandled Viz input source in frame planner: ${JSON.stringify(exhaustiveSource)}.`,
  );
};

const shouldIncludeLayer = (
  layer: VizLayer,
  mode: VizExecutionMode,
): boolean => {
  const supportedModes = layer.renderPolicy?.supportedModes;

  if (!supportedModes || supportedModes.length === 0) {
    return layer.enabled;
  }

  return layer.enabled && supportedModes.includes(mode);
};

export const createVizFramePlan = ({
  session,
  frame,
  registry,
  nodeRegistry,
  inputValues = {},
  layerValues = {},
  graphInputValues,
  graphValues = {},
  runtimeInputs = {},
}: CreateVizFramePlanOptions): VizFramePlan => {
  const frameContext = session.getFrameContext(frame);
  const issues: VizFramePlanIssue[] = [];
  const standardGraphInputValues = createVizStandardGraphRuntimeInputValues(
    frameContext.timeInSeconds,
    runtimeInputs,
  );
  const mergedGraphInputValues = Object.fromEntries(
    (session.project.graphs ?? []).map((graph) => [
      graph.id,
      {
        ...standardGraphInputValues,
        ...(graphInputValues?.[graph.id] ?? {}),
      },
    ]),
  );
  const graphResults = evaluateVizGraphs({
    session,
    frame: frameContext.frame,
    ...(nodeRegistry === undefined ? {} : { registry: nodeRegistry }),
    inputValues: mergedGraphInputValues,
    graphValues,
  });

  for (const result of graphResults.values()) {
    for (const graphIssue of result.issues) {
      issues.push(
        createIssue(
          graphIssue.code === 'missing-graph-input'
            ? 'missing-feature'
            : 'graph-evaluation-failed',
          `graph:${result.graphId}`,
          graphIssue.inputKey ?? graphIssue.nodeId ?? '__graph__',
          graphIssue.message,
        ),
      );
    }
  }

  const layers = session
    .getOrderedLayers()
    .map((layer) => layerValues[layer.id] ?? layer)
    .filter((layer) => shouldIncludeLayer(layer, session.mode))
    .map((layer) => {
      const component = registry?.get(layer.componentId);
      const resolvedCanonicalRuntimeInputs = Object.fromEntries(
        Object.entries(
          component === undefined
            ? {}
            : resolveVizComponentRuntimeInputValues(component, runtimeInputs),
        ).map(([key, value]) => [
          key,
          {
            key,
            sourceKind: 'literal' as const,
            source: {
              kind: 'literal' as const,
              value,
            },
            status: 'resolved' as const,
            value,
          },
        ]),
      );
      const resolvedProjectInputs = Object.fromEntries(
        Object.entries(layer.inputs ?? {}).map(([key, source]) => [
          key,
          resolveInputValue(
            key,
            source,
            session,
            frameContext.frame,
            issues,
            layer.id,
            graphResults,
          ),
        ]),
      );
      const resolvedRuntimeInputs = Object.fromEntries(
        Object.entries(inputValues[layer.id] ?? {}).map(([key, value]) => [
          key,
          {
            key,
            sourceKind: 'literal' as const,
            source: {
              kind: 'literal' as const,
              value,
            },
            status: 'resolved' as const,
            value,
          },
        ]),
      );
      const resolvedInputs = {
        ...resolvedCanonicalRuntimeInputs,
        ...resolvedProjectInputs,
        ...resolvedRuntimeInputs,
      };

      const snapshot: VizLayerFrameSnapshot = {
        layerId: layer.id,
        componentId: layer.componentId,
        rendererFamily: getDefaultRendererFamily(layer, component),
        enabled: layer.enabled,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        resolvedInputs,
      };

      if (layer.surface?.backgroundColor !== undefined) {
        snapshot.backgroundColor = layer.surface.backgroundColor;
      }

      if (component?.name !== undefined) {
        snapshot.componentName = component.name;
      }

      if (layer.settings !== undefined) {
        snapshot.settings = layer.settings;
      }

      return snapshot;
    });

  return {
    frameContext,
    graphResults: [...graphResults.values()],
    layers,
    issues,
  };
};
