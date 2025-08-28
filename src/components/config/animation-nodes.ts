import AdaptiveNormalizeQuantileBody from '../node-network/bodies/adaptive-normalize-quantile-body';
import EnvelopeFollowerBody from '../node-network/bodies/envelope-follower-body';
import frequencyBandBody from '../node-network/bodies/frequency-band-body';
import HysteresisGateBody from '../node-network/bodies/hysteresis-gate-body';
import NormalizeBody from '../node-network/bodies/normalize-body';
import SpectralFluxBody from '../node-network/bodies/spectral-flux-body';
import ValueMapperBody from '../node-network/bodies/value-mapper-body';
import { GraphNode, GraphNodeData } from '../node-network/node-network-store';
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
  computeSignal: (inputData: AnimInputData) => {
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

// Define a MultiplyNode
const MultiplyNode: AnimNode = {
  label: 'Multiply',
  description:
    'Multiplies A and B. Use to scale or modulate one signal by another.',
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
  description:
    'Subtracts B from A. Useful for offsets or differential signals.',
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
  description: 'Adds A and B. Useful for mixing signals or adding offsets.',
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

// --- Adaptive Normalize (Quantile) ---
const AdaptiveNormalizeQuantileNode: AnimNode = {
  label: 'Adaptive Normalize (Quantile)',
  description:
    'Continuously normalizes a signal using rolling quantiles over a time window. Robust to outliers and mix changes.',
  customBody: AdaptiveNormalizeQuantileBody,
  inputs: [
    { id: 'value', label: 'Value', type: 'number', defaultValue: 0 },
    { id: 'time', label: 'Time (s)', type: 'number', defaultValue: 0 },
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
    {
      value,
      time,
      windowMs,
      qLow,
      qHigh,
    }: {
      value: number;
      time?: number;
      windowMs?: number;
      qLow?: number;
      qHigh?: number;
    },
    node,
  ) => {
    if (!node) return { result: 0, low: 0, high: 1 };
    const v = typeof value === 'number' && isFinite(value) ? value : 0;
    const t = typeof time === 'number' && isFinite(time) ? time : 0;
    const wSec = Math.max(
      0.001,
      (typeof windowMs === 'number' && isFinite(windowMs) ? windowMs : 4000) /
        1000,
    );
    const qL = Math.max(0, Math.min(1, typeof qLow === 'number' ? qLow : 0.5));
    const qH = Math.max(
      qL,
      Math.min(1, typeof qHigh === 'number' ? qHigh : 0.95),
    );

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
  computeSignal: ({
    time,
    frequency,
    phase,
    amplitude,
  }: {
    time: number;
    frequency: number;
    phase: number;
    amplitude: number;
  }) => {
    const valTime = typeof time === 'number' ? time : 0;
    const freq = typeof frequency === 'number' ? frequency : 1;
    const ph = typeof phase === 'number' ? phase : 0;
    const amp = typeof amplitude === 'number' ? amplitude : 1;
    const value = Math.sin(2 * Math.PI * freq * valTime + ph) * amp;
    return { value };
  },
};

const AverageVolumeNode: AnimNode = {
  label: 'Average Volume',
  description:
    'Averages a Uint8Array (e.g., waveform or band data) to estimate energy level.',
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
  computeSignal: ({ input, mapping, default: def }) => {
    if (mapping && input in mapping) {
      return { output: mapping[input] };
    }
    return { output: def };
  },
};

// --- Smoothing (Exponential Moving Average) Node ---
const SmoothingNode: AnimNode = {
  label: 'Smoothing',
  description:
    'Exponential smoothing. If time + timeConstantMs provided, applies time-domain smoothing; else frame-based.',
  inputs: [
    { id: 'value', label: 'Value', type: 'number', defaultValue: 0 },
    {
      id: 'smoothing',
      label: 'Smoothing (0..1)',
      type: 'number',
      defaultValue: 0.5,
    },
    {
      id: 'time',
      label: 'Time (s)',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'timeConstantMs',
      label: 'Time Constant (ms)',
      type: 'number',
      defaultValue: 200,
    },
  ],
  outputs: [{ id: 'result', label: 'Result', type: 'number' }],
  computeSignal: (
    {
      value,
      smoothing,
      time,
      timeConstantMs,
    }: {
      value: number;
      smoothing: number;
      time?: number;
      timeConstantMs?: number;
    },
    node,
  ) => {
    if (!node) return { result: typeof value === 'number' ? value : 0 };
    const state = node.data.state;
    const current = typeof value === 'number' ? value : 0;
    const smoothingRaw = typeof smoothing === 'number' ? smoothing : 0.5;
    const smoothingClamped = Math.max(0, Math.min(1, smoothingRaw));

    let alpha: number | null = null;

    // Time-domain smoothing when time and timeConstantMs are provided
    const hasTime = typeof time === 'number' && !Number.isNaN(time);
    const tauMs =
      typeof timeConstantMs === 'number' && timeConstantMs > 0
        ? timeConstantMs
        : 0;
    if (hasTime && tauMs > 0) {
      const prevTime =
        typeof state.prevTime === 'number' ? state.prevTime : time;
      const dt = Math.max(0, (time as number) - prevTime);
      state.prevTime = time;
      const tau = tauMs / 1000; // seconds
      alpha = 1 - Math.exp(-dt / tau);
    }

    // Fallback to factor-based smoothing (frame-domain) if no time provided
    if (alpha === null || !isFinite(alpha)) {
      // Map smoothing: 0 -> no smoothing (alpha=1), 1 -> max smoothing (alpha=0)
      alpha = 1 - smoothingClamped;
    }

    if (state.prev === undefined || Number.isNaN(state.prev)) {
      state.prev = current;
    }
    const smoothed = state.prev + alpha * (current - state.prev);
    state.prev = smoothed;
    return { result: smoothed };
  },
};

// --- Envelope Follower (attack/release, time-aware) ---
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
    { id: 'time', label: 'Time (s)', type: 'number', defaultValue: 0 },
  ],
  outputs: [{ id: 'env', label: 'Envelope', type: 'number' }],
  computeSignal: ({ value, attackMs, releaseMs, time }, node) => {
    if (!node) return { env: typeof value === 'number' ? Math.abs(value) : 0 };
    const v = Math.abs(typeof value === 'number' ? value : 0);
    const t = typeof time === 'number' ? time : 0;
    const state = node.data.state;
    const prevEnv = typeof state.prevEnv === 'number' ? state.prevEnv : v;
    const prevTime = typeof state.prevTime === 'number' ? state.prevTime : t;
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

// --- Spectral Flux (onset strength) ---
const SpectralFluxNode: AnimNode = {
  label: 'Spectral Flux',
  description:
    'Measures onset strength as positive frame-to-frame spectral increases. Feed a spectrum (Uint8Array).',
  customBody: SpectralFluxBody,
  inputs: [{ id: 'data', label: 'Spectrum', type: 'Uint8Array' }],
  outputs: [{ id: 'flux', label: 'Flux', type: 'number' }],
  computeSignal: ({ data }, node) => {
    if (!node || !data || !(data instanceof Uint8Array)) {
      return { flux: 0 };
    }
    const state = node.data.state;
    const prev: Uint8Array | undefined = state.prevData;
    let flux = 0;
    if (prev && prev.length === data.length) {
      for (let i = 0; i < data.length; i++) {
        const diff = data[i] - prev[i];
        if (diff > 0) flux += diff;
      }
    }
    // store copy for next frame
    state.prevData = new Uint8Array(data);
    return { flux };
  },
};

// --- Spectral Flatness (tonal vs noise) ---
const SpectralFlatnessNode: AnimNode = {
  label: 'Spectral Flatness',
  description:
    'Geometric mean / arithmetic mean of spectrum. 0=tonal/peaky, 1=noise-like/flat. Feed a spectrum (Uint8Array).',
  inputs: [{ id: 'data', label: 'Spectrum', type: 'Uint8Array' }],
  outputs: [{ id: 'flatness', label: 'Flatness', type: 'number' }],
  computeSignal: ({ data }) => {
    if (!data || !(data instanceof Uint8Array) || data.length === 0) {
      return { flatness: 1 };
    }
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
    const flat = Math.max(0, Math.min(1, gm / am));
    return { flatness: flat };
  },
};

// --- Pitched Presence (banded peak tonality heuristic) ---
const PitchedPresenceNode: AnimNode = {
  label: 'Pitched Presence',
  description:
    'Heuristic for voiced/synth presence in a band: combines peak level with (1 - flatness).',
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
      defaultValue: 300,
    },
    {
      id: 'endFrequency',
      label: 'End Frequency (Hz)',
      type: 'number',
      defaultValue: 5000,
    },
    {
      id: 'flatnessCutoff',
      label: 'Flatness Cutoff',
      type: 'number',
      defaultValue: 0.6,
    },
  ],
  outputs: [
    { id: 'presence', label: 'Presence', type: 'number' },
    { id: 'peak', label: 'Peak', type: 'number' },
    { id: 'flatness', label: 'Flatness', type: 'number' },
  ],
  computeSignal: ({
    frequencyAnalysis,
    startFrequency = 300,
    endFrequency = 5000,
    flatnessCutoff = 0.6,
  }) => {
    if (
      !frequencyAnalysis ||
      !frequencyAnalysis.frequencyData ||
      !frequencyAnalysis.sampleRate ||
      !frequencyAnalysis.fftSize
    ) {
      return { presence: 0, peak: 0, flatness: 1 };
    }
    const { frequencyData, sampleRate, fftSize } = frequencyAnalysis;
    const nyquist = sampleRate / 2;
    const frequencyPerBin = nyquist / (fftSize / 2);
    const startBin = Math.max(0, Math.floor(startFrequency / frequencyPerBin));
    const endBin = Math.min(
      frequencyData.length - 1,
      Math.max(startBin, Math.ceil(endFrequency / frequencyPerBin)),
    );
    const length = endBin - startBin + 1;
    if (length <= 0) return { presence: 0, peak: 0, flatness: 1 };

    let peak = 0;
    const eps = 1e-6;
    let logSum = 0;
    let arith = 0;
    for (let i = startBin; i <= endBin; i++) {
      const v = frequencyData[i];
      if (v > peak) peak = v;
      const x = v / 255 + eps;
      logSum += Math.log(x);
      arith += x;
    }
    const gm = Math.exp(logSum / length);
    const am = arith / length;
    const flatness = Math.max(0, Math.min(1, gm / am));
    const peakNorm = peak / 255;
    const tonalBoost = Math.max(
      0,
      (flatnessCutoff - flatness) / Math.max(1e-6, flatnessCutoff),
    );
    const presence = Math.max(0, Math.min(1, peakNorm * tonalBoost));
    return { presence, peak: peakNorm, flatness };
  },
};

// --- Moving Mean (time-windowed) ---
const MovingMeanNode: AnimNode = {
  label: 'Moving Mean',
  description:
    'Time-windowed mean. Provide window (ms) and time (s) to track baseline in real time.',
  inputs: [
    { id: 'value', label: 'Value', type: 'number', defaultValue: 0 },
    { id: 'windowMs', label: 'Window (ms)', type: 'number', defaultValue: 200 },
    { id: 'time', label: 'Time (s)', type: 'number', defaultValue: 0 },
  ],
  outputs: [{ id: 'mean', label: 'Mean', type: 'number' }],
  computeSignal: ({ value, windowMs, time }, node) => {
    if (!node) return { mean: typeof value === 'number' ? value : 0 };
    const v = typeof value === 'number' ? value : 0;
    const t = typeof time === 'number' ? time : 0;
    const w = Math.max(1, typeof windowMs === 'number' ? windowMs : 200) / 1000;
    const state = node.data.state;
    if (!state.samples) {
      state.samples = [];
      state.sum = 0;
    }
    state.samples.push({ t, v });
    state.sum += v;
    while (state.samples.length > 0 && t - state.samples[0].t > w) {
      const old = state.samples.shift();
      state.sum -= old ? old.v : 0;
    }
    const mean =
      state.samples.length > 0 ? state.sum / state.samples.length : 0;
    return { mean };
  },
};

// --- Adaptive Threshold ---
const AdaptiveThresholdNode: AnimNode = {
  label: 'Adaptive Threshold',
  description:
    'Outputs how much value exceeds baseline + offset. Useful before gates.',
  inputs: [
    { id: 'value', label: 'Value', type: 'number', defaultValue: 0 },
    { id: 'baseline', label: 'Baseline', type: 'number', defaultValue: 0 },
    { id: 'offset', label: 'Offset', type: 'number', defaultValue: 0.05 },
  ],
  outputs: [{ id: 'amount', label: 'Amount', type: 'number' }],
  computeSignal: ({ value, baseline, offset }) => {
    const v = typeof value === 'number' ? value : 0;
    const b = typeof baseline === 'number' ? baseline : 0;
    const o = typeof offset === 'number' ? offset : 0;
    const amount = Math.max(0, v - (b + o));
    return { amount };
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
  computeSignal: ({ value, low, high }, node) => {
    if (!node) return { gated: 0 };
    const v = typeof value === 'number' ? value : 0;
    const lo = typeof low === 'number' ? low : 0.02;
    const hi = typeof high === 'number' ? high : 0.08;
    const state = node.data.state;
    const open = !!state.open;
    let nextOpen = open;
    if (open) {
      if (v < lo) nextOpen = false;
    } else {
      if (v > hi) nextOpen = true;
    }
    state.open = nextOpen;
    return { gated: nextOpen ? v : 0 };
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
    { id: 'time', label: 'Time (s)', type: 'number', defaultValue: 0 },
  ],
  outputs: [{ id: 'gated', label: 'Gated', type: 'number' }],
  computeSignal: ({ value, minIntervalMs, time }, node) => {
    if (!node) return { gated: 0 };
    const v = typeof value === 'number' ? value : 0;
    const t = typeof time === 'number' ? time : 0;
    const interval =
      Math.max(1, typeof minIntervalMs === 'number' ? minIntervalMs : 120) /
      1000;
    const state = node.data.state;
    const last =
      typeof state.lastFire === 'number' ? state.lastFire : -Infinity;
    let out = 0;
    if (v > 0 && t - last >= interval) {
      out = v;
      state.lastFire = t;
    }
    return { gated: out };
  },
};

export const nodes: AnimNode[] = [
  SineNode,
  MultiplyNode,
  SubtractNode,
  AddNode,
  AverageVolumeNode,
  NormalizeNode,
  AdaptiveNormalizeQuantileNode,
  FrequencyBandNode,
  SpikeNode,
  PitchDetectionNode,
  ValueMapperNode,
  EnvelopeFollowerNode,
  SpectralFluxNode,
  SpectralFlatnessNode,
  PitchedPresenceNode,
  MovingMeanNode,
  AdaptiveThresholdNode,
  HysteresisGateNode,
  RefractoryGateNode,
  SmoothingNode,
];

export const NodeDefinitionMap = new Map<string, AnimNode>();
nodes.forEach((node) => NodeDefinitionMap.set(node.label, node));
NodeDefinitionMap.set(InputNode.label, InputNode);
