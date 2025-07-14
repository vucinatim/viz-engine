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

export const nodes: AnimNode[] = [SineNode, MultiplyNode];
