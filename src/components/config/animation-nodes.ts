import AdaptiveNormalizeQuantileBody from '../node-network/bodies/adaptive-normalize-quantile-body';
import EnvelopeFollowerBody from '../node-network/bodies/envelope-follower-body';
import frequencyBandBody from '../node-network/bodies/frequency-band-body';
import HysteresisGateBody from '../node-network/bodies/hysteresis-gate-body';
import NormalizeBody from '../node-network/bodies/normalize-body';
import TonalPresenceBody from '../node-network/bodies/tonal-presence-body';
import ValueMapperBody from '../node-network/bodies/value-mapper-body';
import { GraphNode, GraphNodeData } from '../node-network/node-network-store';
import { MathOperation } from './math-operations';
import { NodeHandleType } from './node-types';

type NodeIO = {
  id: string;
  label: string;
  type: NodeHandleType;
  defaultValue?: any;
};

type ComputeFunction<T, K> = (
  inputs: T,
  context: AnimInputData,
  node?: GraphNode,
) => K;

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
  description?: string;
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
  description:
    'Graph inputs: audioSignal (Uint8Array waveform), frequencyAnalysis (spectrum + metadata), and time (seconds). Start connections here.',
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
  computeSignal: (inputData: AnimInputData, context) => {
    return inputData;
  },
};

// Special handling for OutputNode: Return the output value
export const createOutputNode = (type: NodeHandleType): AnimNode => ({
  label: 'Output',
  description:
    "Graph output: pass the final value to this node's input. Its type defines the network's output type.",
  inputs: [{ id: 'output', label: 'Output Value', type }],
  outputs: [],
  computeSignal: ({ output }) => {
    return output;
  },
});

const MathNode: AnimNode = {
  label: 'Math',
  description:
    'Performs a math operation on A and B. Change operation via its input.',
  inputs: [
    { id: 'a', label: 'A', type: 'number', defaultValue: 1 },
    { id: 'b', label: 'B', type: 'number', defaultValue: 1 },
    {
      id: 'operation',
      label: 'Operation',
      type: 'math-op',
      defaultValue: MathOperation.Multiply,
    },
  ],
  outputs: [{ id: 'result', label: 'Result', type: 'number' }],
  computeSignal: (
    { a = 1, b = 1, operation = MathOperation.Multiply },
    context,
    node,
  ) => {
    let result: number;

    switch (operation) {
      case MathOperation.Add:
        result = a + b;
        break;
      case MathOperation.Subtract:
        result = a - b;
        break;
      case MathOperation.Multiply:
        result = a * b;
        break;
      case MathOperation.Divide:
        result = a / (b !== 0 ? b : 1); // Avoid division by zero
        break;
      case MathOperation.Power:
        result = Math.pow(a, b);
        break;
      case MathOperation.Max:
        result = Math.max(a, b);
        break;
      case MathOperation.Min:
        result = Math.min(a, b);
        break;
      default:
        result = a * b; // Default to multiply
    }
    return { result };
  },
};

export const SpikeNode: AnimNode = {
  label: 'Spike',
  description:
    'Detect transient spikes over a threshold with attack/release shaping. Good for percussive triggers.',
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
  computeSignal: (
    { value = 0, threshold = 50, attack = 10, release = 250 },
    context,
    node,
  ) => {
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

// --- Adaptive Normalize (Quantile) ---
const AdaptiveNormalizeQuantileNode: AnimNode = {
  label: 'Adaptive Normalize (Quantile)',
  description:
    'Continuously normalizes a signal using rolling quantiles over a time window. Robust to outliers and mix changes.',
  customBody: AdaptiveNormalizeQuantileBody,
  inputs: [
    { id: 'value', label: 'Value', type: 'number', defaultValue: 0 },
    {
      id: 'windowMs',
      label: 'Window (ms)',
      type: 'number',
      defaultValue: 4000,
    },
    {
      id: 'qLow',
      label: 'Low Quantile (0..1)',
      type: 'number',
      defaultValue: 0.5,
    },
    {
      id: 'qHigh',
      label: 'High Quantile (0..1)',
      type: 'number',
      defaultValue: 0.95,
    },
  ],
  outputs: [
    { id: 'result', label: 'Result', type: 'number' },
    { id: 'low', label: 'Low', type: 'number' },
    { id: 'high', label: 'High', type: 'number' },
  ],
  computeSignal: (
    { value = 0, windowMs = 4000, qLow = 0.5, qHigh = 0.95 },
    context,
    node,
  ) => {
    if (!node) return { result: 0, low: 0, high: 1 };
    const v = isFinite(value) ? value : 0;
    const t = isFinite(context.time) ? context.time : 0;
    const wSec = Math.max(0.001, windowMs / 1000);
    const qL = Math.max(0, Math.min(1, qLow));
    const qH = Math.max(qL, Math.min(1, qHigh));

    const state = node.data.state;
    if (!state.samples) state.samples = [] as { t: number; v: number }[];

    state.samples.push({ t, v });
    // Drop old samples
    while (state.samples.length > 0 && t - state.samples[0].t > wSec) {
      state.samples.shift();
    }

    const n = state.samples.length;
    if (n === 0) return { result: 0, low: 0, high: 1 };

    // Build sorted copy for percentile extraction (n is typically small)
    const values: number[] = new Array(n);
    for (let i = 0; i < n; i++) values[i] = state.samples[i].v;
    values.sort((a, b) => a - b);

    const lowIdx = Math.max(0, Math.min(n - 1, Math.floor(qL * (n - 1))));
    const highIdx = Math.max(0, Math.min(n - 1, Math.floor(qH * (n - 1))));
    const lowVal = values[lowIdx];
    const highVal = values[highIdx];
    const range = highVal - lowVal;
    const result = range > 1e-9 ? (v - lowVal) / range : 0;
    const clamped = Math.max(0, Math.min(1, result));
    return { result: clamped, low: lowVal, high: highVal };
  },
};

// Define the SineNode
const SineNode: AnimNode = {
  label: 'Sine',
  description:
    'Sine oscillator controlled by time with frequency, phase, amplitude. Outputs raw -A..+A.',
  inputs: [
    { id: 'time', label: 'Time (s)', type: 'number', defaultValue: 0 },
    {
      id: 'frequency',
      label: 'Frequency (Hz)',
      type: 'number',
      defaultValue: 1,
    },
    { id: 'phase', label: 'Phase (rad)', type: 'number', defaultValue: 0 },
    { id: 'amplitude', label: 'Amplitude', type: 'number', defaultValue: 1 },
  ],
  outputs: [{ id: 'value', label: 'Value', type: 'number' }],
  computeSignal: (
    { time = 0, frequency = 1, phase = 0, amplitude = 1 },
    context,
  ) => {
    const value = Math.sin(2 * Math.PI * frequency * time + phase) * amplitude;
    return { value };
  },
};

const NormalizeNode: AnimNode = {
  label: 'Normalize',
  description:
    'Maps value from [inputMin..inputMax] to [outputMin..outputMax] with clamping.',
  customBody: NormalizeBody,
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
  description:
    "Select a frequency range from FrequencyAnalysis and output just that band's Uint8Array.",
  customBody: frequencyBandBody,
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
  computeSignal: (
    { frequencyAnalysis, startFrequency = 0, endFrequency = 200 },
    context,
  ) => {
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
  description:
    'Simple peak-bin pitch from FrequencyAnalysis. Returns note string, Hz, MIDI, octave.',
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
  computeSignal: ({ frequencyAnalysis }, context) => {
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
  description:
    'Map string inputs through a key/value object with a default fallback.',
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
  computeSignal: ({ input, mapping = {}, default: def = '' }, context) => {
    if (mapping && input in mapping) {
      return { output: mapping[input] };
    }
    return { output: def };
  },
};

const BandInfoNode: AnimNode = {
  label: 'Band Info',
  description:
    'Takes a Uint8Array (e.g. from FrequencyBand) and outputs useful statistics: average, peak, flatness, and flux.',
  inputs: [{ id: 'data', label: 'Data', type: 'Uint8Array' }],
  outputs: [
    { id: 'average', label: 'Average', type: 'number' },
    { id: 'peak', label: 'Peak', type: 'number' },
    { id: 'flatness', label: 'Flatness', type: 'number' },
    { id: 'flux', label: 'Flux', type: 'number' },
  ],
  computeSignal: ({ data }, context, node) => {
    if (!data || !(data instanceof Uint8Array) || data.length === 0) {
      return { average: 0, peak: 0, flatness: 1, flux: 0 };
    }

    // Average and Peak
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      sum += v;
      if (v > peak) peak = v;
    }
    const average = sum / data.length;

    // Flatness
    const eps = 1e-6;
    let logSum = 0;
    let arith = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 255; // normalize to 0..1
      const x = v + eps;
      logSum += Math.log(x);
      arith += x;
    }
    const gm = Math.exp(logSum / data.length);
    const am = arith / data.length;
    const flatness = Math.max(0, Math.min(1, gm / am));

    // Flux
    if (!node) return { average, peak, flatness, flux: 0 };
    const state = node.data.state;
    const prev: Uint8Array | undefined = state.prevData;
    let flux = 0;
    if (prev && prev.length === data.length) {
      for (let i = 0; i < data.length; i++) {
        const diff = data[i] - prev[i];
        if (diff > 0) flux += diff;
      }
    }
    state.prevData = new Uint8Array(data); // store copy for next frame

    return { average, peak, flatness, flux };
  },
};

// --- Tonal Presence ---
const TonalPresenceNode: AnimNode = {
  label: 'Tonal Presence',
  description:
    'Heuristic for voiced/synth presence in a band using peak level and spectral flatness.',
  customBody: TonalPresenceBody,
  inputs: [
    { id: 'data', label: 'Data', type: 'Uint8Array' },
    {
      id: 'flatnessCutoff',
      label: 'Flatness Cutoff',
      type: 'number',
      defaultValue: 0.6,
    },
    {
      id: 'peakScale',
      label: 'Peak Scale',
      type: 'number',
      defaultValue: 255,
    },
  ],
  outputs: [
    { id: 'presence', label: 'Presence', type: 'number' },
    { id: 'peak', label: 'Peak', type: 'number' },
    { id: 'flatness', label: 'Flatness', type: 'number' },
  ],
  computeSignal: ({ data, flatnessCutoff = 0.6, peakScale = 255 }) => {
    if (!data || !(data instanceof Uint8Array) || data.length === 0) {
      return { presence: 0, peak: 0, flatness: 1 };
    }

    // Peak (normalized by peakScale)
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (v > peak) peak = v;
    }
    const scale = peakScale !== 0 ? Math.abs(peakScale) : 255;
    const peakNorm = Math.max(0, Math.min(1, peak / scale));

    // Spectral flatness in 0..1 (Wiener)
    const eps = 1e-6;
    let logSum = 0;
    let arith = 0;
    for (let i = 0; i < data.length; i++) {
      const x = data[i] / scale + eps;
      logSum += Math.log(x);
      arith += x;
    }
    const gm = Math.exp(logSum / data.length);
    const am = arith / data.length;
    const flatness = Math.max(0, Math.min(1, gm / am));

    // Tonal boost: stronger when flatness is below cutoff
    const cutoff = Math.max(1e-6, Math.min(1, flatnessCutoff));
    const tonalBoost = Math.max(0, (cutoff - flatness) / cutoff);
    const presence = Math.max(0, Math.min(1, peakNorm * tonalBoost));

    return { presence, peak: peakNorm, flatness };
  },
};

// --- Hysteresis Gate ---
const HysteresisGateNode: AnimNode = {
  label: 'Hysteresis Gate',
  description:
    'Binary gate with separate open/close thresholds (high/low) to avoid chatter.',
  customBody: HysteresisGateBody,
  inputs: [
    { id: 'value', label: 'Value', type: 'number', defaultValue: 0 },
    { id: 'low', label: 'Low', type: 'number', defaultValue: 0.02 },
    { id: 'high', label: 'High', type: 'number', defaultValue: 0.08 },
  ],
  outputs: [{ id: 'gated', label: 'Gated', type: 'number' }],
  computeSignal: ({ value = 0, low = 0.02, high = 0.08 }, context, node) => {
    if (!node) return { gated: 0 };
    const state = node.data.state;
    const open = !!state.open;
    let nextOpen = open;
    if (open) {
      if (value < low) nextOpen = false;
    } else {
      if (value > high) nextOpen = true;
    }
    state.open = nextOpen;
    return { gated: nextOpen ? value : 0 };
  },
};

// --- Refractory Gate ---
const RefractoryGateNode: AnimNode = {
  label: 'Refractory Gate',
  description:
    'Allows a pulse only if a minimum interval since last pulse has passed. Feed time (s).',
  inputs: [
    { id: 'value', label: 'Value', type: 'number', defaultValue: 0 },
    {
      id: 'minIntervalMs',
      label: 'Min Interval (ms)',
      type: 'number',
      defaultValue: 120,
    },
  ],
  outputs: [{ id: 'gated', label: 'Gated', type: 'number' }],
  computeSignal: ({ value = 0, minIntervalMs = 120 }, context, node) => {
    if (!node) return { gated: 0 };
    const time = context.time;
    const interval = Math.max(1, minIntervalMs) / 1000;
    const state = node.data.state;
    const last =
      typeof state.lastFire === 'number' ? state.lastFire : -Infinity;
    let out = 0;
    if (value > 0 && time - last >= interval) {
      out = value;
      state.lastFire = time;
    }
    return { gated: out };
  },
};

// --- Envelope Follower ---
const EnvelopeFollowerNode: AnimNode = {
  label: 'Envelope Follower',
  description:
    'Rectifies and smooths a signal with separate attack/release using time-aware coefficients.',
  customBody: EnvelopeFollowerBody,
  inputs: [
    { id: 'value', label: 'Value', type: 'number', defaultValue: 0 },
    { id: 'attackMs', label: 'Attack (ms)', type: 'number', defaultValue: 10 },
    {
      id: 'releaseMs',
      label: 'Release (ms)',
      type: 'number',
      defaultValue: 150,
    },
  ],
  outputs: [{ id: 'env', label: 'Envelope', type: 'number' }],
  computeSignal: (
    { value = 0, attackMs = 10, releaseMs = 150 },
    context,
    node,
  ) => {
    if (!node) return { env: Math.abs(typeof value === 'number' ? value : 0) };
    const v = Math.abs(typeof value === 'number' ? value : 0);
    const t = context.time;

    const state = node.data.state;
    const prevEnv = state.prevEnv;
    const prevTime = state.prevTime;
    const dt = Math.max(0, t - prevTime);
    const aMs = Math.max(1, typeof attackMs === 'number' ? attackMs : 10);
    const rMs = Math.max(1, typeof releaseMs === 'number' ? releaseMs : 150);
    const a = 1 - Math.exp(-dt / (aMs / 1000));
    const r = 1 - Math.exp(-dt / (rMs / 1000));
    const alpha = v > prevEnv ? a : r;
    const env = prevEnv + alpha * (v - prevEnv);
    state.prevEnv = env;
    state.prevTime = t;
    return { env };
  },
};

export const nodes: AnimNode[] = [
  SineNode,
  MathNode,
  NormalizeNode,
  AdaptiveNormalizeQuantileNode,
  FrequencyBandNode,
  SpikeNode,
  PitchDetectionNode,
  ValueMapperNode,
  HysteresisGateNode,
  RefractoryGateNode,
  BandInfoNode,
  TonalPresenceNode,
  EnvelopeFollowerNode,
];

export const NodeDefinitionMap = new Map<string, AnimNode>();
nodes.forEach((node) => NodeDefinitionMap.set(node.label, node));
NodeDefinitionMap.set(InputNode.label, InputNode);
