type NodeIO = {
  id: string;
  label: string;
  type: string;
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
    { id: 'a', label: 'A', type: 'number' },
    { id: 'b', label: 'B', type: 'number' },
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
const SineNode: AnimNodeG<(inputs: { time: number }) => { sineValue: number }> =
  {
    label: 'Sine',
    inputs: [{ id: 'time', label: 'Time' }],
    outputs: [{ id: 'sineValue', label: 'Sine Value' }],
    computeSignal: ({ time }) => {
      return { sineValue: Math.sin(time) };
    },
    // Inputs and Outputs will be automatically inferred
  };

console.log('SineNode:', SineNode);

export const nodes = [SineNode, MultiplyNode];
