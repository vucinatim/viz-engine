import AdaptiveNormalizeQuantileBody from '../node-network/bodies/adaptive-normalize-quantile-body';
import EnvelopeFollowerBody from '../node-network/bodies/envelope-follower-body';
import frequencyBandBody from '../node-network/bodies/frequency-band-body';
import HarmonicPresenceBody from '../node-network/bodies/harmonic-presence-body';
import HysteresisGateBody from '../node-network/bodies/hysteresis-gate-body';
import NormalizeBody from '../node-network/bodies/normalize-body';
import TonalPresenceBody from '../node-network/bodies/tonal-presence-body';
import ValueMapperBody from '../node-network/bodies/value-mapper-body';
import { AnimNode, createNode } from './create-node';
import { MathOperation } from './math-operations';
import { FrequencyAnalysis, NodeHandleType } from './node-types';
export type { AnimNode } from './create-node';
export type { AnimInputData } from './node-types';

// (legacy) ComputeFunction kept out; replaced by createNode's generics

const EMPTY_FREQUENCY_ANALYSIS: FrequencyAnalysis = {
  frequencyData: new Uint8Array(),
  sampleRate: 0,
  fftSize: 0,
};

export const InputNode = createNode({
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
  computeSignal: (_, context) => ({
    audioSignal: context.audioSignal,
    frequencyAnalysis: context.frequencyAnalysis ?? EMPTY_FREQUENCY_ANALYSIS,
    time: context.time,
  }),
});

// Special handling for OutputNode: Return the output value
export const createOutputNode = (type: NodeHandleType) =>
  createNode({
    label: 'Output',
    description:
      "Graph output: pass the final value to this node's input. Its type defines the network's output type.",
    inputs: [{ id: 'output', label: 'Output Value', type }],
    outputs: [],
    computeSignal: ({ output }) => output as any,
  });

const MathNode = createNode({
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
  computeSignal: ({ a, b, operation }) => {
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
        result = a / (b !== 0 ? b : 1);
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
        result = a * b;
    }
    return { result };
  },
});

export const SpikeNode = createNode({
  label: 'Spike',
  description:
    'Detect transient spikes over a threshold with attack/release shaping. Good for percussive triggers.',
  inputs: [
    { id: 'value', type: 'number', label: 'Value', defaultValue: 0 },
    { id: 'threshold', type: 'number', label: 'Threshold', defaultValue: 50 },
    { id: 'attack', type: 'number', label: 'Attack (ms)', defaultValue: 10 },
    { id: 'release', type: 'number', label: 'Release (ms)', defaultValue: 250 },
  ],
  outputs: [{ id: 'result', type: 'number', label: 'Result' }],
  computeSignal: ({ value, threshold, attack, release }, _context, node) => {
    if (!node) return { result: 0 };
    const state = node.data.state;
    if (state.peak === undefined) state.peak = 0;
    if (state.timeSincePeak === undefined) state.timeSincePeak = Infinity;
    const msPerFrame = 1000 / 60;
    state.timeSincePeak += msPerFrame;
    const isIdle = state.timeSincePeak >= attack + release;
    if (isIdle && value > threshold) {
      state.timeSincePeak = 0;
      state.peak = value;
    }
    let result = 0;
    if (state.timeSincePeak < attack) {
      state.peak = Math.max(state.peak, value);
      result = (state.timeSincePeak / attack) * state.peak;
    } else if (state.timeSincePeak < attack + release) {
      const timeInRelease = state.timeSincePeak - attack;
      result = (1 - timeInRelease / release) * state.peak;
    } else {
      result = 0;
      state.peak = 0;
    }
    return { result: Math.max(0, result) };
  },
});

// --- Adaptive Normalize (Quantile) ---
const AdaptiveNormalizeQuantileNode = createNode({
  label: 'Adaptive Normalize (Quantile)',
  description:
    'Continuously normalizes a signal using rolling quantiles over a time window. Add freeze-below to stop adapting during breaks.',
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
    {
      id: 'freezeBelow',
      label: 'Freeze Below',
      type: 'number',
      defaultValue: 0,
    },
  ],
  outputs: [
    { id: 'result', label: 'Result', type: 'number' },
    { id: 'low', label: 'Low', type: 'number' },
    { id: 'high', label: 'High', type: 'number' },
  ],
  computeSignal: (
    { value, windowMs, qLow, qHigh, freezeBelow },
    context,
    node,
  ) => {
    if (!node) return { result: 0, low: 0, high: 1 };
    const v = isFinite(value) ? value : 0;
    const t = isFinite(context.time) ? context.time : 0;
    const wSec = Math.max(0.001, windowMs / 1000);
    const qL = Math.max(0, Math.min(1, qLow));
    const qH = Math.max(qL, Math.min(1, qHigh));
    const freezeThreshold =
      typeof freezeBelow === 'number' && isFinite(freezeBelow)
        ? Math.max(0, freezeBelow)
        : 0;
    const shouldFreeze = freezeThreshold > 0 && v <= freezeThreshold;

    const state = node.data.state;
    if (!state.samples) state.samples = [] as { t: number; v: number }[];
    if (typeof state.prevLow !== 'number') state.prevLow = 0;
    if (typeof state.prevHigh !== 'number') state.prevHigh = 1;
    if (typeof state.prevResult !== 'number') state.prevResult = 0;

    if (!shouldFreeze) {
      state.samples.push({ t, v });
      // Drop old samples while adapting
      while (state.samples.length > 0 && t - state.samples[0].t > wSec) {
        state.samples.shift();
      }
    }

    const n = state.samples.length;
    if (n === 0) {
      // Nothing to compute; return previous snapshot (or safe defaults)
      return {
        result: state.prevResult ?? 0,
        low: state.prevLow ?? 0,
        high: state.prevHigh ?? 1,
      };
    }

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
    // Store snapshot so freeze can hold a stable mapping
    state.prevLow = lowVal;
    state.prevHigh = highVal;
    state.prevResult = clamped;
    return { result: clamped, low: lowVal, high: highVal };
  },
});

// Define the SineNode
const SineNode = createNode({
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
  computeSignal: ({ time, frequency, phase, amplitude }) => {
    const value = Math.sin(2 * Math.PI * frequency * time + phase) * amplitude;
    return { value };
  },
});

const NormalizeNode = createNode({
  label: 'Normalize',
  description:
    'Maps value from [inputMin..inputMax] to [outputMin..outputMax] with clamping.',
  customBody: NormalizeBody,
  inputs: [
    { id: 'value', label: 'Value', type: 'number', defaultValue: 0 },
    { id: 'inputMin', label: 'Input Min', type: 'number', defaultValue: 0 },
    { id: 'inputMax', label: 'Input Max', type: 'number', defaultValue: 255 },
    { id: 'outputMin', label: 'Output Min', type: 'number', defaultValue: 0 },
    { id: 'outputMax', label: 'Output Max', type: 'number', defaultValue: 1 },
  ],
  outputs: [{ id: 'result', label: 'Result', type: 'number' }],
  computeSignal: ({ value, inputMin, inputMax, outputMin, outputMax }) => {
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
});

// 4. Update FrequencyBandNode to use frequencyAnalysis input
const FrequencyBandNode = createNode({
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
  outputs: [
    { id: 'bandData', label: 'Band Data', type: 'Uint8Array' },
    { id: 'bandStartBin', label: 'Band Start Bin', type: 'number' },
    { id: 'frequencyPerBin', label: 'Frequency/Bin (Hz)', type: 'number' },
  ],
  computeSignal: (
    { frequencyAnalysis, startFrequency, endFrequency },
    context,
  ) => {
    if (
      !frequencyAnalysis ||
      !frequencyAnalysis.frequencyData ||
      frequencyAnalysis.frequencyData.length === 0 ||
      !frequencyAnalysis.sampleRate ||
      !frequencyAnalysis.fftSize
    ) {
      return {
        bandData: new Uint8Array(),
        bandStartBin: 0,
        frequencyPerBin: 0,
      };
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
      return {
        bandData: new Uint8Array(),
        bandStartBin: startBin,
        frequencyPerBin,
      };
    }
    const bandData = frequencyData.slice(startBin, endBin + 1);
    return { bandData, bandStartBin: startBin, frequencyPerBin };
  },
});

// --- Pitch Detection Node ---
const PitchDetectionNode = createNode({
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
});

const ValueMapperNode = createNode({
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
    const mapObj = mapping as Record<string, any>;
    if (mapObj && input in mapObj) {
      return { output: mapObj[input] };
    }
    return { output: def };
  },
});

const BandInfoNode = createNode({
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
});

// --- Spectral Flux (wideband) ---
const SpectralFluxNode = createNode({
  label: 'Spectral Flux',
  description:
    'Frame-to-frame positive spectral change across the full spectrum. Good onset/transient detector.',
  inputs: [
    {
      id: 'frequencyAnalysis',
      label: 'Frequency Analysis',
      type: 'FrequencyAnalysis',
    },
    { id: 'smoothMs', label: 'Smooth (ms)', type: 'number', defaultValue: 50 },
  ],
  outputs: [{ id: 'flux', label: 'Flux', type: 'number' }],
  computeSignal: ({ frequencyAnalysis, smoothMs }, context, node) => {
    if (!node || !frequencyAnalysis || !frequencyAnalysis.frequencyData) {
      return { flux: 0 };
    }
    const data: Uint8Array = frequencyAnalysis.frequencyData;
    const n = data.length;
    if (n === 0) return { flux: 0 };

    const state = node.data.state as any;
    const prev: Uint8Array | undefined = state.prev;

    let rawFlux = 0;
    if (prev && prev.length === n) {
      for (let i = 0; i < n; i++) {
        const d = data[i] / 255 - prev[i] / 255;
        if (d > 0) rawFlux += d;
      }
      rawFlux = rawFlux / n; // average positive change per bin
      rawFlux = Math.max(0, Math.min(1, rawFlux * 4)); // gentle scale and clamp
    }

    // Store current spectrum for next frame
    state.prev = new Uint8Array(data);

    // Temporal smoothing (one-pole)
    const t = context.time;
    const prevTime = typeof state.prevTime === 'number' ? state.prevTime : t;
    const dt = Math.max(0, t - prevTime);
    const sMs = Math.max(1, typeof smoothMs === 'number' ? smoothMs : 50);
    const alpha = 1 - Math.exp(-dt / (sMs / 1000));
    const prevSmoothed =
      typeof state.prevFlux === 'number' ? state.prevFlux : rawFlux;
    const smoothed = prevSmoothed + alpha * (rawFlux - prevSmoothed);
    state.prevFlux = smoothed;
    state.prevTime = t;
    return { flux: smoothed };
  },
});

// --- Ducker ---
const DuckerNode = createNode({
  label: 'Ducker',
  description:
    'Attenuates a value briefly after a trigger (e.g., spectral flux) using exponential decay.',
  inputs: [
    { id: 'value', label: 'Value', type: 'number', defaultValue: 0 },
    {
      id: 'duckTrigger',
      label: 'Duck Trigger',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'threshold',
      label: 'Trigger Threshold',
      type: 'number',
      defaultValue: 0.6,
    },
    { id: 'depth', label: 'Depth (0..1)', type: 'number', defaultValue: 0.5 },
    {
      id: 'duckMs',
      label: 'Duck Time (ms)',
      type: 'number',
      defaultValue: 120,
    },
  ],
  outputs: [{ id: 'out', label: 'Out', type: 'number' }],
  computeSignal: (
    { value, duckTrigger, threshold, depth, duckMs },
    context,
    node,
  ) => {
    if (!node) return { out: value } as any;
    const state = node.data.state as any;
    const t = context.time;
    const prevTime = typeof state.prevTime === 'number' ? state.prevTime : t;
    const dt = Math.max(0, t - prevTime);
    const dMs = Math.max(1, typeof duckMs === 'number' ? duckMs : 120);
    const decay = Math.exp(-dt / (dMs / 1000));

    let duckLevel = typeof state.duckLevel === 'number' ? state.duckLevel : 0;
    const trig = typeof duckTrigger === 'number' ? duckTrigger : 0;
    const th = typeof threshold === 'number' ? threshold : 0.6;
    const dp = Math.max(
      0,
      Math.min(1, typeof depth === 'number' ? depth : 0.5),
    );
    if (trig > th) duckLevel = 1; // retrigger
    duckLevel *= decay; // exponential decay toward 0

    const v = typeof value === 'number' ? value : 0;
    const out = v * (1 - dp * Math.max(0, Math.min(1, duckLevel)));
    state.duckLevel = duckLevel;
    state.prevTime = t;
    return { out };
  },
});

// --- Harmonic Presence ---
const HarmonicPresenceNode = createNode({
  label: 'Harmonic Presence',
  description:
    'Detects melodic/voiced content by scoring harmonic series in a band-limited spectrum (Uint8Array).',
  customBody: HarmonicPresenceBody,
  inputs: [
    { id: 'data', label: 'Data', type: 'Uint8Array' },
    {
      id: 'bandStartBin',
      label: 'Band Start Bin',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'frequencyPerBin',
      label: 'Frequency/Bin (Hz)',
      type: 'number',
      defaultValue: 0,
    },
    {
      id: 'maxHarmonics',
      label: 'Max Harmonics',
      type: 'number',
      defaultValue: 8,
    },
    {
      id: 'toleranceCents',
      label: 'Tolerance (cents)',
      type: 'number',
      defaultValue: 35,
    },
    { id: 'smoothMs', label: 'Smooth (ms)', type: 'number', defaultValue: 120 },
    {
      id: 'minSNR',
      label: 'Min Peak Rel. (0..1)',
      type: 'number',
      defaultValue: 0.05,
    },
  ],
  outputs: [
    { id: 'presence', label: 'Presence', type: 'number' },
    { id: 'fundamentalHz', label: 'Fundamental (Hz)', type: 'number' },
    { id: 'midi', label: 'MIDI', type: 'number' },
    { id: 'confidence', label: 'Confidence', type: 'number' },
  ],
  computeSignal: (
    {
      data,
      bandStartBin,
      frequencyPerBin,
      maxHarmonics,
      toleranceCents,
      smoothMs,
      minSNR,
    },
    context,
    node,
  ) => {
    if (!node || !(data instanceof Uint8Array) || data.length === 0) {
      return { presence: 0, fundamentalHz: 0, midi: 0, confidence: 0 };
    }
    const n = data.length;
    if (n < 4) return { presence: 0, fundamentalHz: 0, midi: 0, confidence: 0 };

    // Compute band energy and a simple local maxima list
    let bandSum = 0;
    for (let i = 0; i < n; i++) bandSum += data[i];
    const bandAvg = bandSum / Math.max(1, n);
    // Elevated spectrum above simple baseline
    const elevated = new Array<number>(n);
    let bandElevSum = 0;
    for (let i = 0; i < n; i++) {
      const e = Math.max(0, data[i] - bandAvg);
      elevated[i] = e;
      bandElevSum += e;
    }
    const eps = 1e-6;

    type Peak = { idx: number; val: number };
    const peaks: Peak[] = [];
    for (let i = 1; i <= n - 2; i++) {
      const v = data[i];
      if (v > data[i - 1] && v >= data[i + 1]) {
        peaks.push({ idx: i, val: v });
      }
    }
    // Keep top 8 peaks by magnitude
    peaks.sort((a, b) => b.val - a.val);
    const topPeaks = peaks.slice(0, 8);
    if (topPeaks.length === 0) {
      return { presence: 0, fundamentalHz: 0, midi: 0, confidence: 0 };
    }

    const maxH = Math.max(
      1,
      Math.floor(typeof maxHarmonics === 'number' ? maxHarmonics : 8),
    );
    const tolCents = Math.max(
      5,
      Math.min(100, typeof toleranceCents === 'number' ? toleranceCents : 35),
    );
    const tolRatio = Math.pow(2, tolCents / 1200) - 1; // fractional width relative to frequency
    const minRel = Math.max(
      0,
      Math.min(1, typeof minSNR === 'number' ? minSNR : 0.05),
    );

    // Evaluate candidates
    let bestScore = 0;
    let bestHz = 0;
    for (const p of topPeaks) {
      const baseIdx = p.idx;
      let harmonicEnergy = 0;
      let coverage = 0;
      let totalConsidered = 0;
      for (let k = 1; k <= maxH; k++) {
        const center = Math.round(baseIdx * k);
        if (center <= 0 || center >= n) break;
        // Scale tolerance window with the actual harmonic center, not base index
        const halfBins = Math.max(1, Math.ceil(center * tolRatio));
        const lo = Math.max(0, center - halfBins);
        const hi = Math.min(n - 1, center + halfBins);
        let sum = 0;
        let sumElev = 0;
        for (let i = lo; i <= hi; i++) {
          sum += data[i];
          sumElev += elevated[i];
        }
        const width = hi - lo + 1;
        const avgElev = sumElev / Math.max(1, width);
        totalConsidered += sum;
        // Basic presence criterion for this harmonic
        const peakElev = Math.max(0, p.val - bandAvg);
        if (avgElev > minRel * (peakElev + eps)) {
          coverage += 1;
          // Weight lower harmonics higher
          harmonicEnergy += sumElev * (1 / k);
        }
      }
      const coverageRatio =
        coverage /
        Math.max(1, Math.min(maxH, Math.floor((n - 1) / Math.max(1, baseIdx))));
      const energyRatio = harmonicEnergy / Math.max(eps, bandElevSum);
      // Expand dynamic range: emphasize small but real harmonic structure
      const score = Math.max(
        0,
        Math.min(1, Math.sqrt(energyRatio) * (0.6 + 0.4 * coverageRatio)),
      );
      if (score > bestScore) {
        bestScore = score;
        // Compute absolute Hz if metadata is present
        const startBin = Math.max(
          0,
          typeof bandStartBin === 'number' ? bandStartBin : 0,
        );
        const hzPerBin = Math.max(
          0,
          typeof frequencyPerBin === 'number' ? frequencyPerBin : 0,
        );
        bestHz = hzPerBin > 0 ? (startBin + baseIdx) * hzPerBin : 0;
      }
    }

    // Temporal smoothing and simple f0 locking
    const state = node.data.state as any;
    const t = context.time;
    const prevTime = typeof state.prevTime === 'number' ? state.prevTime : t;
    const dt = Math.max(0, t - prevTime);
    const sMs = Math.max(1, typeof smoothMs === 'number' ? smoothMs : 120);
    const alpha = 1 - Math.exp(-dt / (sMs / 1000));

    const prevPresence =
      typeof state.prevPresence === 'number' ? state.prevPresence : 0;
    const presence = prevPresence + alpha * (bestScore - prevPresence);

    const prevF0 = typeof state.prevF0 === 'number' ? state.prevF0 : bestHz;
    // If new estimate close to previous (within tolerance), blend; otherwise, allow jump when score is high
    let f0Out = bestHz;
    if (prevF0 > 0 && bestHz > 0) {
      const centsDiff = 1200 * Math.log2(bestHz / prevF0);
      const freqBlend = Math.abs(centsDiff) < tolCents * 1.5 ? 1 : 0;
      f0Out = freqBlend ? prevF0 + alpha * (bestHz - prevF0) : bestHz;
    }

    state.prevPresence = presence;
    state.prevF0 = f0Out;
    state.prevTime = t;

    const midi = f0Out > 0 ? 69 + 12 * Math.log2(f0Out / 440) : 0;
    const confidence = presence;
    return { presence, fundamentalHz: f0Out, midi, confidence };
  },
});

// --- Tonal Presence ---
const TonalPresenceNode = createNode({
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
  computeSignal: ({ data, flatnessCutoff, peakScale }) => {
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
});

// --- Hysteresis Gate ---
const HysteresisGateNode = createNode({
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
  computeSignal: ({ value, low, high }, context, node) => {
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
});

// --- Refractory Gate ---
const RefractoryGateNode = createNode({
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
  computeSignal: ({ value, minIntervalMs }, context, node) => {
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
});

// --- Envelope Follower ---
const EnvelopeFollowerNode = createNode({
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
  computeSignal: ({ value, attackMs, releaseMs }, context, node) => {
    if (!node) return { env: Math.abs(typeof value === 'number' ? value : 0) };
    const v = Math.abs(typeof value === 'number' ? value : 0);
    const t = context.time;

    const state = node.data.state;
    if (typeof state.prevEnv !== 'number' || !isFinite(state.prevEnv)) {
      state.prevEnv = v;
    }
    if (typeof state.prevTime !== 'number' || !isFinite(state.prevTime)) {
      state.prevTime = t;
    }
    const prevEnv = state.prevEnv as number;
    const prevTime = state.prevTime as number;
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
});

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
  SpectralFluxNode,
  DuckerNode,
  HarmonicPresenceNode,
];

export const NodeDefinitionMap = new Map<string, AnimNode>();
nodes.forEach((node) => NodeDefinitionMap.set(node.label, node));
NodeDefinitionMap.set(InputNode.label, InputNode);
