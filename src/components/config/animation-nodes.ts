import FrequencyBandSelector from '../node-network/frequency-band-selector';
import { GraphNodeData } from '../node-network/node-network-store';

type NodeIO = {
  id: string;
  label: string;
  type: string;
  defaultValue?: any;
};

type ComputeFunction<IT, OT> = (inputs: IT) => OT;

type InferInputs<T extends ComputeFunction<any, any>> = {
  [K in keyof Parameters<T>[0]]: { id: K; label: string };
}[keyof Parameters<T>[0]];

type InferOutputs<T extends ComputeFunction<any, any>> = {
  [K in keyof ReturnType<T>]: { id: K; label: string };
}[keyof ReturnType<T>];

type AnimNodeG<T extends ComputeFunction<any, any>> = {
  label: string;
  inputs: InferInputs<T>[];
  outputs: InferOutputs<T>[];
  computeSignal: T;
};

// Define AnimNode interface for input/output representation
export type AnimNode = {
  label: string;
  inputs: NodeIO[];
  outputs: NodeIO[];
  computeSignal: ComputeFunction<any, any>;
  customBody?: React.ComponentType<{
    id: string;
    data: GraphNodeData;
    selected: boolean;
    nodeNetworkId: string;
  }>;
};

// Special handling for InputNode: Provide external input data
export type AnimInputData = {
  audioSignal: Uint8Array;
  frequencyData: Uint8Array;
  time: number;
  sampleRate: number;
  fftSize: number;
};

export const InputNode: AnimNode = {
  label: 'Input',
  inputs: [],
  outputs: [
    { id: 'audioSignal', label: 'Audio Signal', type: 'Uint8Array' },
    { id: 'frequencyData', label: 'Frequency Data', type: 'Uint8Array' },
    { id: 'time', label: 'Time', type: 'number' },
    { id: 'sampleRate', label: 'Sample Rate', type: 'number' },
    { id: 'fftSize', label: 'FFT Size', type: 'number' },
  ],
  computeSignal: (inputData: AnimInputData) => {
    return inputData;
  },
};

// Special handling for OutputNode: Return the output value
export const createOutputNode = (type: string): AnimNode => ({
  label: 'Output',
  inputs: [{ id: 'output', label: 'Output Value', type }],
  outputs: [],
  computeSignal: ({ output }: { output: any }) => {
    return output;
  },
});

// Define a MultiplyNode
const MultiplyNode: AnimNode = {
  label: 'Multiply',
  inputs: [
    { id: 'a', label: 'A', type: 'number', defaultValue: 1 },
    { id: 'b', label: 'B', type: 'number', defaultValue: 1 },
  ],
  outputs: [{ id: 'result', label: 'Result', type: 'number' }],
  computeSignal: ({ a, b }: { a: number; b: number }) => {
    // Ensure inputs are numbers, provide defaults if not
    const valA = typeof a === 'number' ? a : 0;
    const valB = typeof b === 'number' ? b : 0;
    return { result: valA * valB };
  },
};

// Define the SineNode
const SineNode: AnimNode = {
  label: 'Sine',
  inputs: [{ id: 'time', label: 'Time (s)', type: 'number', defaultValue: 0 }],
  outputs: [{ id: 'value', label: 'Value', type: 'number' }],
  computeSignal: ({ time }: { time: number }) => {
    const valTime = typeof time === 'number' ? time : 0;
    return { value: (Math.sin(valTime * Math.PI) + 1) / 2 };
  },
};

const AverageVolumeNode: AnimNode = {
  label: 'Average Volume',
  inputs: [
    {
      id: 'data',
      label: 'Data',
      type: 'Uint8Array',
    },
  ],
  outputs: [{ id: 'average', label: 'Average', type: 'number' }],
  computeSignal: ({ data }: { data: Uint8Array }) => {
    if (!data || data.length === 0) {
      return { average: 0 };
    }
    const sum = data.reduce((a, b) => a + b, 0);
    const average = sum / data.length;
    return { average };
  },
};

const NormalizeNode: AnimNode = {
  label: 'Normalize',
  inputs: [
    { id: 'value', label: 'Value', type: 'number', defaultValue: 0 },
    { id: 'inputMin', label: 'Input Min', type: 'number', defaultValue: 0 },
    { id: 'inputMax', label: 'Input Max', type: 'number', defaultValue: 255 },
    { id: 'outputMin', label: 'Output Min', type: 'number', defaultValue: 0 },
    { id: 'outputMax', label: 'Output Max', type: 'number', defaultValue: 1 },
  ],
  outputs: [{ id: 'result', label: 'Result', type: 'number' }],
  computeSignal: ({
    value = 0,
    inputMin = 0,
    inputMax = 255,
    outputMin = 0,
    outputMax = 1,
  }) => {
    if (inputMax - inputMin === 0) {
      return { result: outputMin }; // Avoid division by zero
    }
    const normalizedValue = (value - inputMin) / (inputMax - inputMin);
    const result = outputMin + (outputMax - outputMin) * normalizedValue;
    const min = Math.min(outputMin, outputMax);
    const max = Math.max(outputMin, outputMax);
    const clampedResult = Math.max(min, Math.min(max, result));
    return { result: clampedResult };
  },
};

const FrequencyBandNode: AnimNode = {
  label: 'Frequency Band',
  customBody: FrequencyBandSelector,
  inputs: [
    { id: 'frequencyData', label: 'Frequency Data', type: 'Uint8Array' },
    { id: 'sampleRate', label: 'Sample Rate', type: 'number' },
    { id: 'fftSize', label: 'FFT Size', type: 'number' },
    {
      id: 'startFrequency',
      label: 'Start Frequency (Hz)',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'endFrequency',
      label: 'End Frequency (Hz)',
      type: 'number',
      defaultValue: 200,
    },
  ],
  outputs: [{ id: 'bandData', label: 'Band Data', type: 'Uint8Array' }],
  computeSignal: ({
    frequencyData,
    sampleRate,
    fftSize,
    startFrequency = 0,
    endFrequency = 200,
  }) => {
    if (
      !frequencyData ||
      frequencyData.length === 0 ||
      !sampleRate ||
      !fftSize
    ) {
      return { bandData: new Uint8Array() };
    }

    const nyquist = sampleRate / 2;
    const frequencyPerBin = nyquist / (fftSize / 2);

    const startBin = Math.floor(startFrequency / frequencyPerBin);
    const endBin = Math.min(
      frequencyData.length - 1,
      Math.ceil(endFrequency / frequencyPerBin),
    );

    if (startBin > endBin) {
      return { bandData: new Uint8Array() };
    }

    const bandData = frequencyData.slice(startBin, endBin + 1);
    return { bandData };
  },
};

export const nodes: AnimNode[] = [
  SineNode,
  MultiplyNode,
  AverageVolumeNode,
  NormalizeNode,
  FrequencyBandNode,
];

export const NodeDefinitionMap = new Map<string, AnimNode>();
nodes.forEach((node) => NodeDefinitionMap.set(node.label, node));
NodeDefinitionMap.set(InputNode.label, InputNode);
