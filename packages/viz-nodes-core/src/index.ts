import type {
  VizNodeEvaluateContext,
  VizNodeImplementation,
  VizNodeStepContext,
} from '@viz-engine/contracts';
import type {
  VizNodeAnimationInput,
  VizNodeAuthoringDefinition,
  VizNodeAuthoringRuntimeRef,
  VizNodeFrequencyAnalysis,
} from './authoring.js';
import {
  editorNodeAuthoringDefinitions,
  inputNodeAuthoringDefinition,
} from './editor-nodes.js';

export * from './authoring.js';
export * from './editor-nodes.js';

export const coreNodePackageIdentity = {
  packageId: '@viz-engine/nodes-core',
  version: '0.0.1',
} as const;

const asNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const asString = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' ? value : fallback;
};

export const graphInputNode: VizNodeImplementation = {
  type: 'graph-input',
  name: 'Graph Input',
  category: 'pure',
  description: 'Reads one named graph input value into the node graph.',
  inputs: [
    {
      key: 'inputKey',
      label: 'Input Key',
      required: true,
    },
  ],
  outputs: [
    {
      key: 'value',
      label: 'Value',
    },
  ],
  authoring: {
    inputs: [
      {
        key: 'inputKey',
        type: 'string',
        defaultValue: '',
      },
    ],
    outputs: [{ key: 'value', type: 'number' }],
  },
  evaluate: ({ inputs, graphInputs }) => {
    const inputKey = asString(inputs.inputKey);
    return {
      value: graphInputs[inputKey]?.value,
    };
  },
};

export const multiplyNode: VizNodeImplementation = {
  type: 'multiply',
  name: 'Multiply',
  category: 'pure',
  description: 'Multiplies two numeric inputs.',
  inputs: [
    {
      key: 'value',
      label: 'Value',
      required: true,
    },
    {
      key: 'factor',
      label: 'Factor',
      required: true,
    },
  ],
  outputs: [
    {
      key: 'value',
      label: 'Value',
    },
  ],
  authoring: {
    inputs: [
      { key: 'value', type: 'number', defaultValue: 0 },
      { key: 'factor', type: 'number', defaultValue: 1 },
    ],
    outputs: [{ key: 'value', type: 'number' }],
  },
  evaluate: ({ inputs }) => ({
    value: asNumber(inputs.value, 0) * asNumber(inputs.factor, 1),
  }),
};

export const clampNode: VizNodeImplementation = {
  type: 'clamp',
  name: 'Clamp',
  category: 'pure',
  description: 'Clamps a numeric input between min and max.',
  inputs: [
    {
      key: 'value',
      label: 'Value',
      required: true,
    },
    {
      key: 'min',
      label: 'Min',
      required: true,
    },
    {
      key: 'max',
      label: 'Max',
      required: true,
    },
  ],
  outputs: [
    {
      key: 'value',
      label: 'Value',
    },
  ],
  authoring: {
    inputs: [
      { key: 'value', type: 'number', defaultValue: 0 },
      { key: 'min', type: 'number', defaultValue: 0 },
      { key: 'max', type: 'number', defaultValue: 1 },
    ],
    outputs: [{ key: 'value', type: 'number' }],
  },
  evaluate: ({ inputs }) => {
    const value = asNumber(inputs.value, 0);
    const min = asNumber(inputs.min, 0);
    const max = asNumber(inputs.max, 1);
    return {
      value: Math.min(Math.max(value, min), max),
    };
  },
};

export const addNode: VizNodeImplementation = {
  type: 'add',
  name: 'Add',
  category: 'pure',
  description: 'Adds two numeric inputs.',
  inputs: [
    {
      key: 'a',
      label: 'A',
      required: true,
    },
    {
      key: 'b',
      label: 'B',
      required: true,
    },
  ],
  outputs: [
    {
      key: 'value',
      label: 'Value',
    },
  ],
  authoring: {
    inputs: [
      { key: 'a', type: 'number', defaultValue: 0 },
      { key: 'b', type: 'number', defaultValue: 0 },
    ],
    outputs: [{ key: 'value', type: 'number' }],
  },
  evaluate: ({ inputs }) => ({
    value: asNumber(inputs.a, 0) + asNumber(inputs.b, 0),
  }),
};

export const decayNode: VizNodeImplementation = {
  type: 'decay',
  name: 'Decay',
  category: 'temporal',
  description:
    'Tracks incoming peaks immediately, then decays toward zero at a fixed per-second falloff.',
  inputs: [
    {
      key: 'value',
      label: 'Value',
      required: true,
    },
    {
      key: 'falloffPerSecond',
      label: 'Falloff / s',
      required: true,
    },
  ],
  outputs: [
    {
      key: 'value',
      label: 'Value',
    },
  ],
  createInitialState: () => 0,
  step: ({ inputs, previousState, deltaTimeSeconds }) => {
    const incomingValue = asNumber(inputs.value, 0);
    const previousValue = asNumber(previousState, 0);
    const falloffPerSecond = Math.max(0, asNumber(inputs.falloffPerSecond, 0));
    const decayedValue = Math.max(
      0,
      previousValue - falloffPerSecond * deltaTimeSeconds,
    );
    const nextValue = Math.max(incomingValue, decayedValue);

    return {
      state: nextValue,
      outputs: {
        value: nextValue,
      },
    };
  },
};

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

const createAnimationInput = (
  context: VizNodeEvaluateContext,
): VizNodeAnimationInput => {
  const audioSignal = readGraphInput(context, 'audioSignal');
  const frequencyAnalysis = readGraphInput(context, 'frequencyAnalysis');
  const time = readGraphInput(context, 'time');

  return {
    audioSignal:
      audioSignal instanceof Uint8Array ? audioSignal : new Uint8Array(),
    frequencyAnalysis:
      frequencyAnalysis && typeof frequencyAnalysis === 'object'
        ? (frequencyAnalysis as VizNodeFrequencyAnalysis)
        : {
            frequencyData: new Uint8Array(),
            sampleRate: 0,
            fftSize: 0,
          },
    time: typeof time === 'number' ? time : context.frameContext.timeInSeconds,
  };
};

const createAuthoring = (definition: VizNodeAuthoringDefinition) => ({
  inputs: definition.inputs.map((input) => ({
    key: input.id,
    type: input.type,
    ...(input.defaultValue === undefined
      ? {}
      : { defaultValue: input.defaultValue }),
  })),
  outputs: definition.outputs.map((output) => ({
    key: output.id,
    type: output.type,
  })),
});

const createInputs = (definition: VizNodeAuthoringDefinition) =>
  definition.inputs.map((input) => ({
    key: input.id,
    label: input.label,
    required: false,
  }));

const createOutputs = (definition: VizNodeAuthoringDefinition) =>
  definition.outputs.map((output) => ({
    key: output.id,
    label: output.label,
  }));

const createPureEditorNodeImplementation = (
  definition: VizNodeAuthoringDefinition,
): VizNodeImplementation => ({
  type: definition.label,
  name: definition.label,
  category: 'pure',
  ...(definition.description === undefined
    ? {}
    : { description: definition.description }),
  inputs: createInputs(definition),
  outputs: createOutputs(definition),
  authoring: createAuthoring(definition),
  evaluate: (context) =>
    definition.computeSignal(context.inputs, createAnimationInput(context)),
});

const createTemporalEditorNodeImplementation = (
  definition: VizNodeAuthoringDefinition,
): VizNodeImplementation => ({
  type: definition.label,
  name: definition.label,
  category: 'temporal',
  ...(definition.description === undefined
    ? {}
    : { description: definition.description }),
  inputs: createInputs(definition),
  outputs: createOutputs(definition),
  authoring: createAuthoring(definition),
  createInitialState: () => ({}),
  step: (context: VizNodeStepContext) => {
    const state =
      context.previousState &&
      typeof context.previousState === 'object' &&
      !Array.isArray(context.previousState)
        ? structuredClone(context.previousState as Record<string, unknown>)
        : {};
    const runtimeRef: VizNodeAuthoringRuntimeRef = {
      data: { state },
    };
    const outputs = definition.computeSignal(
      context.inputs,
      createAnimationInput(context),
      runtimeRef,
    );

    return { state, outputs };
  },
});

const inputEditorNodeImplementation = createPureEditorNodeImplementation(
  inputNodeAuthoringDefinition,
);

const outputEditorNodeImplementation: VizNodeImplementation = {
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

export const editorNodeImplementations: VizNodeImplementation[] = [
  inputEditorNodeImplementation,
  ...editorNodeAuthoringDefinitions.map((definition) =>
    TEMPORAL_EDITOR_NODE_TYPES.has(definition.label)
      ? createTemporalEditorNodeImplementation(definition)
      : createPureEditorNodeImplementation(definition),
  ),
  outputEditorNodeImplementation,
];

export const createCoreNodeRegistry = () => {
  const nodes = [
    graphInputNode,
    multiplyNode,
    clampNode,
    addNode,
    decayNode,
    ...editorNodeImplementations,
  ];
  const nodeMap = new Map(nodes.map((node) => [node.type, node]));

  return {
    get: (type: string) => nodeMap.get(type),
    list: () => nodes,
  };
};
