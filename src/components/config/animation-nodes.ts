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
};

// Special handling for InputNode: Provide external input data
export type AnimInputData = {
  audioSignal: Uint8Array<ArrayBufferLike>;
  time: number;
};

export const InputNode: AnimNode = {
  label: 'Input',
  inputs: [],
  outputs: [
    { id: 'audioSignal', label: 'Audio Signal', type: 'Uint8Array' },
    { id: 'time', label: 'Time', type: 'number' },
  ],
  computeSignal: (inputData: AnimInputData) => {
    return inputData;
  },
};

// Special handling for OutputNode: Return the output value
export const OutputNode: AnimNode = {
  label: 'Output',
  inputs: [{ id: 'output', label: 'Output Value', type: 'any' }],
  outputs: [],
  computeSignal: ({ output }: { output: any }) => {
    return output;
  },
};

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
      id: 'audioSignal',
      label: 'Audio Signal',
      type: 'Uint8Array',
    },
  ],
  outputs: [{ id: 'average', label: 'Average', type: 'number' }],
  computeSignal: ({ audioSignal }: { audioSignal: Uint8Array }) => {
    if (!audioSignal || audioSignal.length === 0) {
      return { average: 0 };
    }
    const sum = audioSignal.reduce((a, b) => a + b, 0);
    const average = sum / audioSignal.length;
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

export const nodes: AnimNode[] = [
  SineNode,
  MultiplyNode,
  AverageVolumeNode,
  NormalizeNode,
];

export const NodeDefinitionMap = new Map<string, AnimNode>();
nodes.forEach((node) => NodeDefinitionMap.set(node.label, node));
NodeDefinitionMap.set(InputNode.label, InputNode);
NodeDefinitionMap.set(OutputNode.label, OutputNode);
