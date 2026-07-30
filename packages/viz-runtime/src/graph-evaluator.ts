import type {
  VizGraphEvaluationIssue,
  VizGraphEvaluationResult,
  VizGraphInputSource,
  VizNodeGraphDocument,
  VizNodeGraphNode,
  VizNodeImplementation,
  VizResolvedGraphInputValue,
} from '@viz-engine/contracts';
import {
  getAudioFeatureTimelineArtifact,
  sampleAudioFeatureValue,
} from './audio-feature-timeline.js';
import type { VizNodeRegistry } from './node-registry.js';
import type {
  VizGraphRuntimeCheckpoint,
  VizRuntimeSession,
} from './runtime-session.js';

export interface EvaluateVizGraphsOptions {
  session: VizRuntimeSession;
  frame: number;
  registry?: VizNodeRegistry;
  inputValues?: VizRuntimeGraphInputValues;
}

export interface EvaluateSingleVizGraphOptions {
  graph: VizNodeGraphDocument;
  session: VizRuntimeSession;
  frame: number;
  registry: VizNodeRegistry;
  inputValues?: Readonly<Record<string, unknown>>;
}

export type VizRuntimeGraphInputValues = Readonly<
  Record<string, Readonly<Record<string, unknown>>>
>;

interface EvaluateGraphFrameResult {
  values: Record<string, unknown>;
  nodes: VizGraphEvaluationResult['nodes'];
  issues: VizGraphEvaluationIssue[];
  nodeStates: Map<string, unknown>;
}

const mergeUniqueIssues = (
  target: VizGraphEvaluationIssue[],
  source: VizGraphEvaluationIssue[],
): void => {
  const seen = new Set(
    target.map((issue) =>
      JSON.stringify([
        issue.code,
        issue.graphId,
        issue.nodeId ?? '',
        issue.inputKey ?? '',
        issue.outputKey ?? '',
        issue.message,
      ]),
    ),
  );

  for (const issue of source) {
    const issueKey = JSON.stringify([
      issue.code,
      issue.graphId,
      issue.nodeId ?? '',
      issue.inputKey ?? '',
      issue.outputKey ?? '',
      issue.message,
    ]);

    if (seen.has(issueKey)) {
      continue;
    }

    seen.add(issueKey);
    target.push(issue);
  }
};

const resolveGraphInputSource = (
  graphId: string,
  inputKey: string,
  source: VizGraphInputSource,
  session: VizRuntimeSession,
  frame: number,
  issues: VizGraphEvaluationIssue[],
): VizResolvedGraphInputValue | undefined => {
  if (source.kind === 'literal') {
    return {
      key: inputKey,
      value: source.value,
    };
  }

  if (source.kind === 'asset-ref') {
    const asset = session.getMaterializedAssetMap().get(source.assetId);

    if (!asset) {
      issues.push({
        code: 'missing-graph-input',
        graphId,
        inputKey,
        message: `Graph "${graphId}" could not resolve asset input "${source.assetId}" for "${inputKey}".`,
      });
      return undefined;
    }

    return {
      key: inputKey,
      value: asset,
    };
  }

  const artifact = session.getResolvedArtifactMap().get(source.artifactId);
  const timelineArtifact = getAudioFeatureTimelineArtifact(artifact);

  if (!timelineArtifact) {
    issues.push({
      code: 'missing-graph-input',
      graphId,
      inputKey,
      message: `Graph "${graphId}" could not resolve artifact "${source.artifactId}" for input "${inputKey}".`,
    });
    return undefined;
  }

  const sampledValue = sampleAudioFeatureValue(
    timelineArtifact,
    source.feature,
    frame,
  );

  if (sampledValue === undefined) {
    issues.push({
      code: 'missing-graph-input',
      graphId,
      inputKey,
      message: `Graph "${graphId}" could not resolve feature "${source.feature}" from artifact "${source.artifactId}".`,
    });
    return undefined;
  }

  return {
    key: inputKey,
    value: sampledValue,
  };
};

const resolveNodeInputBinding = (
  graph: VizNodeGraphDocument,
  node: VizNodeGraphNode,
  bindingKey: string,
  resolvedGraphInputs: Map<string, VizResolvedGraphInputValue>,
  nodeOutputs: Map<string, Record<string, unknown>>,
  evaluateNode: (
    nodeId: string,
    ancestry: string[],
  ) => Record<string, unknown> | undefined,
  issues: VizGraphEvaluationIssue[],
  ancestry: string[],
): unknown => {
  const binding = node.inputs?.[bindingKey];

  if (!binding) {
    return undefined;
  }

  if (binding.kind === 'literal') {
    return binding.value;
  }

  if (binding.kind === 'graph-input') {
    const graphInput = resolvedGraphInputs.get(binding.inputKey);

    if (!graphInput) {
      issues.push({
        code: 'missing-graph-input',
        graphId: graph.id,
        nodeId: node.id,
        inputKey: bindingKey,
        message: `Graph "${graph.id}" node "${node.id}" references missing graph input "${binding.inputKey}".`,
      });
      return undefined;
    }

    return graphInput.value;
  }

  const upstreamOutputs =
    nodeOutputs.get(binding.nodeId) ??
    evaluateNode(binding.nodeId, [...ancestry, node.id]);

  if (!upstreamOutputs) {
    issues.push({
      code: 'missing-node',
      graphId: graph.id,
      nodeId: node.id,
      inputKey: bindingKey,
      message: `Graph "${graph.id}" node "${node.id}" could not resolve upstream node "${binding.nodeId}".`,
    });
    return undefined;
  }

  if (!(binding.output in upstreamOutputs)) {
    issues.push({
      code: 'missing-node-output',
      graphId: graph.id,
      nodeId: node.id,
      inputKey: bindingKey,
      message: `Graph "${graph.id}" node "${node.id}" could not resolve output "${binding.output}" from node "${binding.nodeId}".`,
    });
    return undefined;
  }

  return upstreamOutputs[binding.output];
};

const usesTemporalNode = (
  graph: VizNodeGraphDocument,
  registry: VizNodeRegistry,
): boolean => {
  return graph.nodes.some((node) => {
    const implementation = registry.get(node.type);
    return (
      implementation?.category === 'temporal' ||
      implementation?.step !== undefined
    );
  });
};

const mapNodeStatesToRecord = (
  nodeStates: ReadonlyMap<string, unknown>,
): Record<string, unknown> => {
  return Object.fromEntries(nodeStates.entries());
};

const recordNodeStatesToMap = (
  nodeStates: Record<string, unknown>,
): Map<string, unknown> => {
  return new Map(Object.entries(nodeStates));
};

const createGraphRuntimeCheckpoint = ({
  graphId,
  frame,
  values,
  nodes,
  issues,
  nodeStates,
}: {
  graphId: string;
  frame: number;
  values: Record<string, unknown>;
  nodes: VizGraphEvaluationResult['nodes'];
  issues: VizGraphEvaluationIssue[];
  nodeStates: ReadonlyMap<string, unknown>;
}): VizGraphRuntimeCheckpoint => {
  return {
    graphId,
    frame,
    values: structuredClone(values),
    nodes: structuredClone(nodes),
    issues: structuredClone(issues),
    nodeStates: structuredClone(mapNodeStatesToRecord(nodeStates)),
  };
};

const evaluateGraphAtFrame = ({
  graph,
  session,
  frame,
  registry,
  inputValues = {},
  previousNodeStates,
}: EvaluateSingleVizGraphOptions & {
  previousNodeStates: ReadonlyMap<string, unknown>;
}): EvaluateGraphFrameResult => {
  const issues: VizGraphEvaluationIssue[] = [];
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const nodeOutputs = new Map<string, Record<string, unknown>>();
  const nodeInputs = new Map<string, Record<string, unknown>>();
  const nodeStates = new Map(previousNodeStates);
  const resolvedGraphInputs = new Map<string, VizResolvedGraphInputValue>();

  for (const [inputKey, source] of Object.entries(graph.inputs ?? {})) {
    const resolvedInput = resolveGraphInputSource(
      graph.id,
      inputKey,
      source,
      session,
      frame,
      issues,
    );

    if (resolvedInput) {
      resolvedGraphInputs.set(inputKey, resolvedInput);
    }
  }

  for (const [inputKey, value] of Object.entries(inputValues)) {
    resolvedGraphInputs.set(inputKey, {
      key: inputKey,
      value,
    });
  }

  const evaluateNode = (
    nodeId: string,
    ancestry: string[],
  ): Record<string, unknown> | undefined => {
    if (nodeOutputs.has(nodeId)) {
      return nodeOutputs.get(nodeId);
    }

    if (ancestry.includes(nodeId)) {
      issues.push({
        code: 'graph-cycle',
        graphId: graph.id,
        nodeId,
        message: `Graph "${graph.id}" contains a cycle involving node "${nodeId}".`,
      });
      return undefined;
    }

    const node = nodeById.get(nodeId);

    if (!node) {
      issues.push({
        code: 'missing-node',
        graphId: graph.id,
        nodeId,
        message: `Graph "${graph.id}" references missing node "${nodeId}".`,
      });
      return undefined;
    }

    const implementation = registry.get(node.type);

    if (!implementation) {
      issues.push({
        code: 'missing-node',
        graphId: graph.id,
        nodeId,
        message: `Graph "${graph.id}" references unknown node type "${node.type}".`,
      });
      return undefined;
    }

    const inputKeys = new Set([
      ...(implementation.inputs ?? []).map((input) => input.key),
      ...Object.keys(node.inputs ?? {}),
    ]);
    const resolvedInputs = Object.fromEntries(
      [...inputKeys].map((inputKey) => [
        inputKey,
        resolveNodeInputBinding(
          graph,
          node,
          inputKey,
          resolvedGraphInputs,
          nodeOutputs,
          evaluateNode,
          issues,
          ancestry,
        ),
      ]),
    );
    nodeInputs.set(node.id, resolvedInputs);

    try {
      const outputs = evaluateNodeImplementation({
        implementation,
        graph,
        node,
        frameContext: session.getFrameContext(frame),
        resolvedInputs,
        resolvedGraphInputs,
        nodeStates,
        issues,
      });

      if (!outputs) {
        return undefined;
      }

      nodeOutputs.set(node.id, outputs);
      return outputs;
    } catch (error) {
      issues.push({
        code: 'node-evaluation-failed',
        graphId: graph.id,
        nodeId: node.id,
        message:
          error instanceof Error
            ? error.message
            : `Unknown evaluation failure in graph "${graph.id}" node "${node.id}".`,
      });
      return undefined;
    }
  };

  const values = Object.fromEntries(
    (graph.outputs ?? []).map((outputBinding) => {
      if (!outputBinding.nodeId || !outputBinding.output) {
        return [outputBinding.key, undefined] as const;
      }

      const outputs = evaluateNode(outputBinding.nodeId, []);

      if (!outputs || !(outputBinding.output in outputs)) {
        issues.push({
          code: 'missing-node-output',
          graphId: graph.id,
          nodeId: outputBinding.nodeId,
          outputKey: outputBinding.key,
          message: `Graph "${graph.id}" output "${outputBinding.key}" could not resolve "${outputBinding.output}" from node "${outputBinding.nodeId}".`,
        });
        return [outputBinding.key, undefined] as const;
      }

      return [outputBinding.key, outputs[outputBinding.output]] as const;
    }),
  );

  return {
    values,
    nodes: Object.fromEntries(
      [...nodeOutputs.entries()].map(([nodeId, outputs]) => [
        nodeId,
        {
          inputs: structuredClone(nodeInputs.get(nodeId) ?? {}),
          outputs: structuredClone(outputs),
          ...(nodeStates.has(nodeId)
            ? { state: structuredClone(nodeStates.get(nodeId)) }
            : {}),
        },
      ]),
    ),
    issues,
    nodeStates,
  };
};

const evaluateNodeImplementation = ({
  implementation,
  graph,
  node,
  frameContext,
  resolvedInputs,
  resolvedGraphInputs,
  nodeStates,
  issues,
}: {
  implementation: VizNodeImplementation;
  graph: VizNodeGraphDocument;
  node: VizNodeGraphNode;
  frameContext: ReturnType<VizRuntimeSession['getFrameContext']>;
  resolvedInputs: Record<string, unknown>;
  resolvedGraphInputs: Map<string, VizResolvedGraphInputValue>;
  nodeStates: Map<string, unknown>;
  issues: VizGraphEvaluationIssue[];
}): Record<string, unknown> | undefined => {
  const graphInputs = Object.fromEntries(resolvedGraphInputs.entries());

  if (implementation.step) {
    const previousState = nodeStates.has(node.id)
      ? nodeStates.get(node.id)
      : implementation.createInitialState?.();
    const result = implementation.step({
      graphId: graph.id,
      nodeId: node.id,
      frameContext,
      deltaTimeSeconds: frameContext.deltaTimeSeconds,
      previousState,
      inputs: resolvedInputs,
      graphInputs,
    });

    nodeStates.set(node.id, result.state);
    return result.outputs;
  }

  if (implementation.evaluate) {
    return implementation.evaluate({
      graphId: graph.id,
      nodeId: node.id,
      frameContext,
      inputs: resolvedInputs,
      graphInputs,
    });
  }

  issues.push({
    code: 'node-evaluation-failed',
    graphId: graph.id,
    nodeId: node.id,
    message: `Graph "${graph.id}" node "${node.id}" has no executable evaluate or step implementation.`,
  });
  return undefined;
};

export const evaluateSingleVizGraph = ({
  graph,
  session,
  frame,
  registry,
  inputValues,
}: EvaluateSingleVizGraphOptions): VizGraphEvaluationResult => {
  if (!usesTemporalNode(graph, registry)) {
    const result = evaluateGraphAtFrame({
      graph,
      session,
      frame,
      registry,
      ...(inputValues === undefined ? {} : { inputValues }),
      previousNodeStates: new Map(),
    });

    return {
      graphId: graph.id,
      values: result.values,
      nodes: result.nodes,
      issues: result.issues,
    };
  }

  const targetFrame = session.getFrameContext(frame).frame;
  const checkpoint = session.getGraphCheckpointBeforeOrAt(
    graph.id,
    targetFrame,
  );

  if (checkpoint && checkpoint.frame === targetFrame) {
    return {
      graphId: graph.id,
      values: checkpoint.values,
      nodes: checkpoint.nodes,
      issues: checkpoint.issues,
    };
  }

  let currentNodeStates = checkpoint
    ? recordNodeStatesToMap(checkpoint.nodeStates)
    : new Map<string, unknown>();
  let currentValues: Record<string, unknown> = checkpoint?.values ?? {};
  let currentNodes: VizGraphEvaluationResult['nodes'] = checkpoint?.nodes ?? {};
  const issues: VizGraphEvaluationIssue[] = checkpoint?.issues
    ? structuredClone(checkpoint.issues)
    : [];
  const checkpointInterval = session.getGraphCheckpointIntervalFrames();
  const startFrame = checkpoint ? checkpoint.frame + 1 : 0;

  for (
    let steppedFrame = startFrame;
    steppedFrame <= targetFrame;
    steppedFrame += 1
  ) {
    const result = evaluateGraphAtFrame({
      graph,
      session,
      frame: steppedFrame,
      registry,
      ...(inputValues === undefined ? {} : { inputValues }),
      previousNodeStates: currentNodeStates,
    });

    currentNodeStates = result.nodeStates;
    currentValues = result.values;
    currentNodes = result.nodes;
    issues.length = 0;
    mergeUniqueIssues(issues, result.issues);

    if (
      steppedFrame === targetFrame ||
      steppedFrame % checkpointInterval === 0
    ) {
      session.setGraphCheckpoint(
        createGraphRuntimeCheckpoint({
          graphId: graph.id,
          frame: steppedFrame,
          values: currentValues,
          nodes: currentNodes,
          issues,
          nodeStates: currentNodeStates,
        }),
      );
    }
  }

  return {
    graphId: graph.id,
    values: currentValues,
    nodes: currentNodes,
    issues,
  };
};

export const evaluateVizGraphs = ({
  session,
  frame,
  registry,
  inputValues,
}: EvaluateVizGraphsOptions): Map<string, VizGraphEvaluationResult> => {
  const graphs = session.project.graphs ?? [];

  if (graphs.length === 0 || !registry) {
    return new Map();
  }

  return new Map(
    graphs.map((graph) => [
      graph.id,
      evaluateSingleVizGraph({
        graph,
        session,
        frame,
        registry,
        ...(inputValues?.[graph.id] === undefined
          ? {}
          : { inputValues: inputValues[graph.id] }),
      }),
    ]),
  );
};
