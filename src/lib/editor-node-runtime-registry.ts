import {
  NodeDefinitionMap,
  type AnimNode,
} from '@/components/node-network/animation-nodes';
import type {
  VizNodeEvaluateContext,
  VizNodeImplementation,
  VizNodeStepContext,
} from '@viz-engine/contracts';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import { createVizNodeRegistry } from '@viz-engine/runtime';

const TEMPORAL_EDITOR_NODE_TYPES = new Set([
  'Spike',
  'Adaptive Normalize (Quantile)',
  'Pitch Detection',
  'Band Info',
  'Spectral Flux',
  'Ducker',
  'Harmonic Presence',
  'Tonal Presence',
  'Hysteresis Gate',
  'Refractory Gate',
  'Envelope Follower',
  'Threshold Counter',
  'Section Change Detector',
  'Spectral Centroid',
  'Adaptive Section Detector',
  'Rate Limiter',
]);

const readGraphInput = (
  context: VizNodeEvaluateContext,
  key: string,
): unknown => context.graphInputs[key]?.value;

const createAnimationInput = (context: VizNodeEvaluateContext) => ({
  audioSignal:
    readGraphInput(context, 'audioSignal') instanceof Uint8Array
      ? (readGraphInput(context, 'audioSignal') as Uint8Array)
      : new Uint8Array(),
  frequencyAnalysis: (() => {
    const value = readGraphInput(context, 'frequencyAnalysis');
    return value && typeof value === 'object'
      ? (value as {
          frequencyData: Uint8Array;
          sampleRate: number;
          fftSize: number;
        })
      : {
          frequencyData: new Uint8Array(),
          sampleRate: 0,
          fftSize: 0,
        };
  })(),
  time:
    typeof readGraphInput(context, 'time') === 'number'
      ? (readGraphInput(context, 'time') as number)
      : context.frameContext.timeInSeconds,
});

const createOutputs = (node: AnimNode) =>
  node.outputs.map((output) => ({
    key: output.id,
    label: output.label,
  }));

const createInputs = (node: AnimNode) =>
  node.inputs.map((input) => ({
    key: input.id,
    label: input.label,
    required: false,
  }));

const createPureImplementation = (
  node: AnimNode,
): VizNodeImplementation => ({
  type: node.label,
  name: node.label,
  category: 'pure',
  description: node.description,
  inputs: createInputs(node),
  outputs: createOutputs(node),
  evaluate: (context) =>
    node.computeSignal(
      context.inputs as never,
      createAnimationInput(context),
    ),
});

const createTemporalImplementation = (
  node: AnimNode,
): VizNodeImplementation => ({
  type: node.label,
  name: node.label,
  category: 'temporal',
  description: node.description,
  inputs: createInputs(node),
  outputs: createOutputs(node),
  createInitialState: () => ({}),
  step: (context: VizNodeStepContext) => {
    const state =
      context.previousState &&
      typeof context.previousState === 'object' &&
      !Array.isArray(context.previousState)
        ? (context.previousState as Record<string, unknown>)
        : {};
    const outputs = node.computeSignal(
      context.inputs as never,
      createAnimationInput(context),
      {
        data: {
          state,
        },
      },
    );

    return {
      state,
      outputs,
    };
  },
});

const outputImplementation: VizNodeImplementation = {
  type: 'Output',
  name: 'Output',
  category: 'pure',
  inputs: [
    {
      key: 'output',
      label: 'Output Value',
      required: true,
    },
  ],
  outputs: [
    {
      key: 'value',
      label: 'Value',
    },
  ],
  evaluate: ({ inputs }) => ({
    value: inputs.output,
  }),
};

export const createEditorNodeRuntimeRegistry = () => {
  const editorImplementations = Array.from(NodeDefinitionMap.values()).map(
    (node) =>
      TEMPORAL_EDITOR_NODE_TYPES.has(node.label)
        ? createTemporalImplementation(node)
        : createPureImplementation(node),
  );
  const coreImplementations = createCoreNodeRegistry().list();

  return createVizNodeRegistry([
    ...coreImplementations,
    ...editorImplementations,
    outputImplementation,
  ]);
};
