import FrequencyBandSelector from '../node-network/frequency-band-selector';
import { GraphNode, GraphNodeData } from '../node-network/node-network-store';
import ValueMapperBody from '../node-network/value-mapper-body';
import { NodeHandleType } from './node-types';

type NodeIO = {
  id: string;
  label: string;
  type: NodeHandleType;
  defaultValue?: any;
};

type ComputeFunction<T, K> = (inputs: T, node?: GraphNode) => K;

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

// 1. Add FrequencyAnalysis type
type FrequencyAnalysis = {
  frequencyData: Uint8Array;
  sampleRate: number;
  fftSize: number;
};

// 2. Update AnimInputData to include frequencyAnalysis for InputNode
export type AnimInputData = {
  audioSignal: Uint8Array;
  frequencyAnalysis?: FrequencyAnalysis;
  time: number;
};

export const InputNode: AnimNode = {
  label: 'Input',
  inputs: [],
  outputs: [
    { id: 'audioSignal', label: 'Audio Signal', type: 'Uint8Array' },
    {
      id: 'frequencyAnalysis',
      label: 'Frequency Analysis',
      type: 'FrequencyAnalysis',
    },
    { id: 'time', label: 'Time', type: 'number' },
  ],
  computeSignal: (inputData: AnimInputData) => {
    return inputData;
  },
};

// Special handling for OutputNode: Return the output value
export const createOutputNode = (type: NodeHandleType): AnimNode => ({
  label: 'Output',
  inputs: [{ id: 'output', label: 'Output Value', type }],
  outputs: [],
  computeSignal: ({ output }) => {
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

const SubtractNode: AnimNode = {
  label: 'Subtract',
  inputs: [
    { id: 'a', label: 'A', type: 'number' },
    { id: 'b', label: 'B', type: 'number' },
  ],
  outputs: [{ id: 'result', label: 'Result', type: 'number' }],
  computeSignal: ({ a, b }: { a: number; b: number }) => {
    return { result: a - b };
  },
};

const AddNode: AnimNode = {
  label: 'Add',
  inputs: [
    { id: 'a', label: 'A', type: 'number', defaultValue: 0 },
    { id: 'b', label: 'B', type: 'number', defaultValue: 0 },
  ],
  outputs: [{ id: 'result', label: 'Result', type: 'number' }],
  computeSignal: ({ a, b }: { a: number; b: number }) => {
    return { result: a + b };
  },
};

export const SpikeNode: AnimNode = {
  label: 'Spike',
  inputs: [
    { id: 'value', type: 'number', label: 'Value', defaultValue: 0 },
    {
      id: 'threshold',
      type: 'number',
      label: 'Threshold',
      defaultValue: 50,
    },
    {
      id: 'attack',
      type: 'number',
      label: 'Attack (ms)',
      defaultValue: 10,
    },
    {
      id: 'release',
      type: 'number',
      label: 'Release (ms)',
      defaultValue: 250,
    },
  ],
  outputs: [{ id: 'result', type: 'number', label: 'Result' }],
  computeSignal: ({ value, threshold, attack, release }, node) => {
    if (!node) return { result: 0 };

    const state = node.data.state;

    // Initialize state if it's not already there
    if (state.peak === undefined) state.peak = 0;
    if (state.timeSincePeak === undefined) state.timeSincePeak = Infinity;

    const msPerFrame = 1000 / 60; // Assuming 60 FPS
    state.timeSincePeak += msPerFrame;

    const isIdle = state.timeSincePeak >= attack + release;

    // 1. Trigger a new spike if idle and threshold is met
    if (isIdle && value > threshold) {
      state.timeSincePeak = 0;
      state.peak = value;
    }

    let result = 0;
    // 2. Calculate output based on the phase (attack, release, or idle)
    if (state.timeSincePeak < attack) {
      // Attack phase: continue seeking a new peak
      state.peak = Math.max(state.peak, value);
      result = (state.timeSincePeak / attack) * state.peak;
    } else if (state.timeSincePeak < attack + release) {
      // Release phase: peak is locked, just decay
      const timeInRelease = state.timeSincePeak - attack;
      result = (1 - timeInRelease / release) * state.peak;
    } else {
      // Idle phase
      result = 0;
      state.peak = 0; // Reset peak for the next event
    }

    return { result: Math.max(0, result) };
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
    {
      id: 'inputMin',
      label: 'Input Min',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'inputMax',
      label: 'Input Max',
      type: 'number',
      defaultValue: 255,
    },
    {
      id: 'outputMin',
      label: 'Output Min',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'outputMax',
      label: 'Output Max',
      type: 'number',
      defaultValue: 1,
    },
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

// 4. Update FrequencyBandNode to use frequencyAnalysis input
const FrequencyBandNode: AnimNode = {
  label: 'Frequency Band',
  customBody: FrequencyBandSelector,
  inputs: [
    {
      id: 'frequencyAnalysis',
      label: 'Frequency Analysis',
      type: 'FrequencyAnalysis',
    },
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
    frequencyAnalysis,
    startFrequency = 0,
    endFrequency = 200,
  }) => {
    if (
      !frequencyAnalysis ||
      !frequencyAnalysis.frequencyData ||
      frequencyAnalysis.frequencyData.length === 0 ||
      !frequencyAnalysis.sampleRate ||
      !frequencyAnalysis.fftSize
    ) {
      return { bandData: new Uint8Array() };
    }
    const { frequencyData, sampleRate, fftSize } = frequencyAnalysis;
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

// --- Pitch Detection Node ---
const PitchDetectionNode: AnimNode = {
  label: 'Pitch Detection',
  inputs: [
    {
      id: 'frequencyAnalysis',
      label: 'Frequency Analysis',
      type: 'FrequencyAnalysis',
    },
  ],
  outputs: [
    { id: 'note', label: 'Note', type: 'string' },
    { id: 'frequency', label: 'Frequency (Hz)', type: 'number' },
    { id: 'midi', label: 'MIDI', type: 'number' },
    { id: 'octave', label: 'Octave', type: 'number' },
  ],
  computeSignal: ({ frequencyAnalysis }) => {
    if (
      !frequencyAnalysis ||
      !frequencyAnalysis.frequencyData ||
      !frequencyAnalysis.sampleRate ||
      !frequencyAnalysis.fftSize
    ) {
      return { note: '', frequency: 0, midi: 0, octave: 0 };
    }
    const { frequencyData, sampleRate, fftSize } = frequencyAnalysis;
    // Find the index of the max bin
    let maxIdx = 0;
    let maxVal = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > maxVal) {
        maxVal = frequencyData[i];
        maxIdx = i;
      }
    }
    // Convert bin index to frequency
    const nyquist = sampleRate / 2;
    const frequencyPerBin = nyquist / (fftSize / 2);
    const freq = maxIdx * frequencyPerBin;
    // Map frequency to MIDI note
    const midi = freq > 0 ? Math.round(69 + 12 * Math.log2(freq / 440)) : 0;
    // Map MIDI to note name
    const noteNames = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ];
    const noteIdx = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    const note = freq > 0 ? `${noteNames[noteIdx]}${octave}` : '';
    return { note, frequency: freq, midi, octave };
  },
};

const ValueMapperNode: AnimNode = {
  label: 'Value Mapper',
  customBody: ValueMapperBody,
  inputs: [
    { id: 'input', label: 'Input', type: 'string' },
    {
      id: 'mapping',
      label: 'Mapping',
      type: 'object',
      defaultValue: {},
    },
    {
      id: 'default',
      label: 'Default',
      type: 'string',
      defaultValue: '',
    },
  ],
  outputs: [{ id: 'output', label: 'Output', type: 'string' }],
  computeSignal: ({ input, mapping, default: def }) => {
    if (mapping && input in mapping) {
      return { output: mapping[input] };
    }
    return { output: def };
  },
};

export const nodes: AnimNode[] = [
  SineNode,
  MultiplyNode,
  SubtractNode,
  AddNode,
  AverageVolumeNode,
  NormalizeNode,
  FrequencyBandNode,
  SpikeNode,
  PitchDetectionNode,
  ValueMapperNode,
];

export const NodeDefinitionMap = new Map<string, AnimNode>();
nodes.forEach((node) => NodeDefinitionMap.set(node.label, node));
NodeDefinitionMap.set(InputNode.label, InputNode);
