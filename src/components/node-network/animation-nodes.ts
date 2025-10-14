import { AnimNode, createNode } from '../config/create-node';
import { MathOperation } from '../config/math-operations';
import { FrequencyAnalysis, NodeHandleType } from '../config/node-types';
import AdaptiveNormalizeQuantileBody from './bodies/adaptive-normalize-quantile-body';
import EnvelopeFollowerBody from './bodies/envelope-follower-body';
import frequencyBandBody from './bodies/frequency-band-body';
import HarmonicPresenceBody from './bodies/harmonic-presence-body';
import HysteresisGateBody from './bodies/hysteresis-gate-body';
import MultiBandAnalysisBody from './bodies/multi-band-analysis-body';
import NormalizeBody from './bodies/normalize-body';
import PitchDetectionBody from './bodies/pitch-detection-body';
import RateLimiterBody from './bodies/rate-limiter-body';
import SectionChangeDetectorBody from './bodies/section-change-detector-body';
import SpectralCentroidBody from './bodies/spectral-centroid-body';
import ThresholdCounterBody from './bodies/threshold-counter-body';
import TimeDomainSectionDetectorBody from './bodies/time-domain-section-detector-body';
import TonalPresenceBody from './bodies/tonal-presence-body';
import ValueMapperBody from './bodies/value-mapper-body';
// No external libraries; implement YIN inline
export type { AnimNode } from '../config/create-node';
export type { AnimInputData } from '../config/node-types';

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
      case MathOperation.Modulo:
        result = a % b;
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

// --- Pitch Detection (YIN) ---
const PitchDetectionNode = createNode({
  label: 'Pitch Detection',
  description:
    'Time-domain pitch detection using YIN/CMNDF. Very stable for monophonic sources (piano, voice). Low latency!',
  customBody: PitchDetectionBody,
  inputs: [
    { id: 'audioSignal', label: 'Audio Signal', type: 'Uint8Array' },
    {
      id: 'sampleRate',
      label: 'Sample Rate (Hz)',
      type: 'number',
      defaultValue: 44100,
    },
    { id: 'minHz', label: 'Min Hz', type: 'number', defaultValue: 60 },
    { id: 'maxHz', label: 'Max Hz', type: 'number', defaultValue: 1500 },
    {
      id: 'threshold',
      label: 'CMNDF Threshold',
      type: 'number',
      defaultValue: 0.1,
    },
    { id: 'smoothMs', label: 'Smooth (ms)', type: 'number', defaultValue: 30 },
    {
      id: 'stabilityCents',
      label: 'Stability (cents)',
      type: 'number',
      defaultValue: 50,
    },
  ],
  outputs: [
    { id: 'note', label: 'Note', type: 'string' },
    { id: 'frequency', label: 'Frequency (Hz)', type: 'number' },
    { id: 'midi', label: 'MIDI', type: 'number' },
    { id: 'octave', label: 'Octave', type: 'number' },
    { id: 'confidence', label: 'Confidence', type: 'number' },
  ],
  computeSignal: (
    {
      audioSignal,
      sampleRate,
      minHz,
      maxHz,
      threshold,
      smoothMs,
      stabilityCents,
    },
    context,
    node,
  ) => {
    if (
      !node ||
      !audioSignal ||
      !(audioSignal instanceof Uint8Array) ||
      audioSignal.length < 64
    ) {
      return { note: '', frequency: 0, midi: 0, octave: 0, confidence: 0 };
    }

    const sr =
      typeof sampleRate === 'number' && sampleRate > 0 ? sampleRate : 44100;
    const minF = Math.max(20, typeof minHz === 'number' ? minHz : 60);
    const maxF = Math.max(minF + 1, typeof maxHz === 'number' ? maxHz : 1500);
    const tauMin = Math.max(2, Math.floor(sr / maxF));
    const tauMax = Math.min(audioSignal.length - 2, Math.ceil(sr / minF));
    if (tauMax <= tauMin + 2) {
      return { note: '', frequency: 0, midi: 0, octave: 0, confidence: 0 };
    }

    // Convert to centered float and optionally remove DC
    const N = audioSignal.length;
    const x = new Float32Array(N);
    let mean = 0;
    for (let i = 0; i < N; i++) {
      const v = (audioSignal[i] - 128) / 128; // -1..1
      x[i] = v;
      mean += v;
    }
    mean /= N;
    for (let i = 0; i < N; i++) x[i] -= mean;

    // YIN difference function d(tau)
    const d = new Float32Array(tauMax + 1);
    for (let tau = 1; tau <= tauMax; tau++) {
      let sum = 0;
      const limit = N - tau;
      for (let i = 0; i < limit; i++) {
        const diff = x[i] - x[i + tau];
        sum += diff * diff;
      }
      d[tau] = sum;
    }

    // Cumulative mean normalized difference function d'(tau)
    const cmndf = new Float32Array(tauMax + 1);
    cmndf[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau <= tauMax; tau++) {
      runningSum += d[tau];
      cmndf[tau] = d[tau] * (tau / Math.max(1e-12, runningSum));
    }

    // Search for absolute minimum in [tauMin..tauMax]
    // (Don't use threshold crossing - find the deepest valley for best accuracy)
    let minVal = Infinity;
    let candTau = tauMin;
    for (let tau = tauMin; tau <= tauMax; tau++) {
      const v = cmndf[tau];
      if (v < minVal) {
        minVal = v;
        candTau = tau;
      }
    }

    // Only accept if confidence is reasonable
    const th = Math.max(
      0.02,
      Math.min(0.5, typeof threshold === 'number' ? threshold : 0.1),
    );
    if (minVal > th) {
      // No confident pitch found
      return { note: '', frequency: 0, midi: 0, octave: 0, confidence: 0 };
    }

    // Parabolic interpolation around candTau for sub-sample precision
    const tau0 = Math.max(tauMin, Math.min(tauMax, candTau));
    const prev = cmndf[tau0 - 1] ?? cmndf[tau0];
    const curr = cmndf[tau0];
    const next = cmndf[tau0 + 1] ?? cmndf[tau0];
    // For a minimum: offset = 0.5 * (a - c) / (a - 2b + c)
    const denom = prev - 2 * curr + next;
    const offset = Math.abs(denom) > 1e-12 ? (0.5 * (prev - next)) / denom : 0;
    let refinedTau =
      tau0 + (isFinite(offset) && Math.abs(offset) < 1 ? offset : 0);

    // Octave guard: prefer 2*tau if similar cost (helps avoid octave-up mistakes)
    // Only apply if we have room in our search range
    const tau2 = Math.min(tauMax, Math.round(refinedTau * 2));
    if (tau2 <= tauMax && tau2 >= tauMin) {
      const costTau = cmndf[Math.round(refinedTau)] || cmndf[tau0];
      const costTau2 = cmndf[tau2];
      // Be more conservative - only switch if tau2 is significantly better
      if (isFinite(costTau2) && costTau2 + 0.05 < costTau) {
        refinedTau = tau2;
      }
    }

    const rawFreq = refinedTau > 0 ? sr / refinedTau : 0;
    let confidence = Math.max(
      0,
      Math.min(1, 1 - (cmndf[Math.round(refinedTau)] || 1)),
    );

    // Temporal smoothing and note stability
    const state = node.data.state;
    const t = context.time;
    const prevTime = typeof state.prevTime === 'number' ? state.prevTime : t;
    const dt = Math.max(0, t - prevTime);
    const sMs = Math.max(1, typeof smoothMs === 'number' ? smoothMs : 30);
    const alpha = 1 - Math.exp(-dt / (sMs / 1000));
    const prevFreq =
      typeof state.prevFreq === 'number' && state.prevFreq > 0
        ? state.prevFreq
        : rawFreq;
    const stab = Math.max(
      5,
      typeof stabilityCents === 'number' ? stabilityCents : 50,
    );
    let freq = rawFreq;
    if (prevFreq > 0 && rawFreq > 0) {
      const centsDiff = Math.abs(1200 * Math.log2(rawFreq / prevFreq));
      if (centsDiff < stab) {
        // Small change - light smoothing for responsiveness
        freq = prevFreq + alpha * 0.6 * (rawFreq - prevFreq);
      } else {
        // Large change - accept quickly to minimize lag
        freq = prevFreq + alpha * 0.9 * (rawFreq - prevFreq);
      }
    }
    const prevConf =
      typeof state.prevConf === 'number' ? state.prevConf : confidence;
    confidence = prevConf + alpha * 0.7 * (confidence - prevConf);

    const midi = freq > 0 ? Math.round(69 + 12 * Math.log2(freq / 440)) : 0;
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

    state.prevFreq = freq;
    state.prevConf = confidence;
    state.prevTime = t;
    return { note, frequency: freq, midi, octave, confidence };
  },
});

const ValueMapperNode = createNode({
  label: 'Value Mapper',
  description:
    'Map number inputs to different output types (colors, strings, numbers). Useful for mapping beat counts to mode names or indices.',
  customBody: ValueMapperBody,
  inputs: [
    { id: 'input', label: 'Input', type: 'number', defaultValue: 0 },
    {
      id: 'mode',
      label: 'Mode',
      type: 'string',
      defaultValue: 'number',
    },
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
      defaultValue: '0',
    },
  ],
  outputs: [{ id: 'output', label: 'Output', type: 'string' }],
  computeSignal: ({ input, mode, mapping, default: def }) => {
    const mapObj = mapping as Record<string, any>;
    // Convert number input to string key for lookup
    const inputKey = String(Math.floor(typeof input === 'number' ? input : 0));

    if (mapObj && inputKey in mapObj) {
      return { output: mapObj[inputKey] };
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
        const d = data[i] - prev[i];
        if (d > 0) rawFlux += d;
      }
      // Sum of positive changes across all bins (range ~0-255*numBins for full spectrum change)
      // For typical 1024 FFT bins, heavy drops can reach 20-40+
      rawFlux = rawFlux / 255; // Normalize to 0-numBins range
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
  outputs: [
    { id: 'gated', label: 'Gated', type: 'number' },
    { id: 'state', label: 'State (0/1)', type: 'number' },
  ],
  computeSignal: ({ value, low, high }, context, node) => {
    if (!node) return { gated: 0, state: 0 };
    const state = node.data.state;
    const open = !!state.open;
    let nextOpen = open;
    if (open) {
      if (value < low) nextOpen = false;
    } else {
      if (value > high) nextOpen = true;
    }
    state.open = nextOpen;
    return {
      gated: nextOpen ? value : 0,
      state: nextOpen ? 1 : 0, // Boolean output: exactly 0 or 1
    };
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
    // Only clamp negative values to 0, preserve the original range (0-255 or 0-1)
    const clampedEnv = Math.max(0, env);
    state.prevEnv = clampedEnv;
    state.prevTime = t;
    return { env: clampedEnv };
  },
});

const ThresholdCounterNode = createNode({
  label: 'Threshold Counter',
  description:
    'Increments a counter each time the input value crosses above the threshold. The counter wraps around using modulo (counter % maxValue). Perfect for cycling through modes based on audio triggers.',
  customBody: ThresholdCounterBody,
  inputs: [
    { id: 'value', label: 'Value', type: 'number', defaultValue: 0 },
    {
      id: 'threshold',
      label: 'Threshold',
      type: 'number',
      defaultValue: 0.5,
    },
    {
      id: 'maxValue',
      label: 'Max Value',
      type: 'number',
      defaultValue: 5,
    },
  ],
  outputs: [{ id: 'count', label: 'Count', type: 'number' }],
  computeSignal: ({ value, threshold, maxValue }, context, node) => {
    if (!node) return { count: 0 };

    const state = node.data.state;
    const currentValue = typeof value === 'number' ? value : 0;
    const thresholdVal = typeof threshold === 'number' ? threshold : 0.5;
    const max = Math.max(
      1,
      Math.floor(typeof maxValue === 'number' ? maxValue : 5),
    );

    // Initialize state
    if (typeof state.counter !== 'number') {
      state.counter = 0;
    }
    if (typeof state.wasAboveThreshold !== 'boolean') {
      state.wasAboveThreshold = false;
    }

    const isAboveThreshold = currentValue >= thresholdVal;
    const prevWasAbove = state.wasAboveThreshold as boolean;

    // Detect rising edge (transition from below to above threshold)
    if (isAboveThreshold && !prevWasAbove) {
      state.counter = ((state.counter as number) + 1) % max;
    }

    state.wasAboveThreshold = isAboveThreshold;

    return { count: state.counter as number };
  },
});

const SectionChangeDetectorNode = createNode({
  label: 'Section Change Detector',
  description:
    'Detects significant changes in any input signal. Monitors value changes and triggers ONCE per transition with cooldown. Perfect for section changes, laser modes, or triggering effects on big shifts!',
  customBody: SectionChangeDetectorBody,
  inputs: [
    { id: 'flux', label: 'Value', type: 'number', defaultValue: 0 },
    {
      id: 'threshold',
      label: 'Threshold',
      type: 'number',
      defaultValue: 0.5,
    },
    {
      id: 'cooldownMs',
      label: 'Cooldown (ms)',
      type: 'number',
      defaultValue: 2000,
    },
    {
      id: 'holdMs',
      label: 'Hold Time (ms)',
      type: 'number',
      defaultValue: 100,
    },
  ],
  outputs: [
    { id: 'trigger', label: 'Trigger', type: 'number' },
    { id: 'cooldownActive', label: 'Cooldown Active', type: 'number' },
    { id: 'change', label: 'Change', type: 'number' },
  ],
  computeSignal: ({ flux, threshold, cooldownMs, holdMs }, context, node) => {
    if (!node) return { trigger: 0, cooldownActive: 0, change: 0 };

    const state = node.data.state;
    const currentFlux = typeof flux === 'number' ? flux : 0;
    const thresholdVal = typeof threshold === 'number' ? threshold : 12;
    const cooldown = Math.max(
      100,
      typeof cooldownMs === 'number' ? cooldownMs : 3000,
    );
    const hold = Math.max(10, typeof holdMs === 'number' ? holdMs : 100);
    const currentTime = context.time * 1000; // Convert to milliseconds

    // Initialize state
    if (typeof state.lastTriggerTime !== 'number') {
      state.lastTriggerTime = -999999; // Far in the past
    }
    if (typeof state.triggerTime !== 'number') {
      state.triggerTime = -999999;
    }
    if (typeof state.prevValue !== 'number') {
      state.prevValue = currentFlux;
    }

    // Calculate frame-to-frame change (absolute difference)
    const prevValue = state.prevValue as number;
    const change = Math.abs(currentFlux - prevValue);
    state.prevValue = currentFlux;

    const lastTriggerTime = state.lastTriggerTime as number;
    const triggerTime = state.triggerTime as number;
    let timeSinceLastTrigger = currentTime - lastTriggerTime;
    let timeSinceTrigger = currentTime - triggerTime;

    // Handle time reset (e.g., when audio loops) - reset state if time goes backwards
    if (timeSinceLastTrigger < 0 || timeSinceTrigger < 0) {
      state.lastTriggerTime = -999999;
      state.triggerTime = -999999;
      timeSinceLastTrigger = Infinity;
      timeSinceTrigger = Infinity;
    }

    let trigger = 0;
    let cooldownActive = 0;

    // Check if we're in cooldown period
    if (timeSinceLastTrigger < cooldown) {
      cooldownActive = 1;
      // Check if we should still be holding the trigger high
      if (timeSinceTrigger < hold) {
        trigger = 1;
      }
    } else {
      // Not in cooldown - check if change exceeds threshold
      if (change >= thresholdVal) {
        // Big change detected! Trigger and start cooldown
        state.lastTriggerTime = currentTime;
        state.triggerTime = currentTime;
        trigger = 1;
        cooldownActive = 1;
      }
    }

    return { trigger, cooldownActive, change };
  },
});

const MultiBandAnalysisNode = createNode({
  label: 'Multi-Band Analysis',
  description:
    'Splits spectrum into Bass/Mids/Highs with PERCEPTUAL WEIGHTING (mimics human hearing). Outputs both raw energy AND percentage. Balanced D&B drop = ~33% each band!',
  customBody: MultiBandAnalysisBody,
  inputs: [
    {
      id: 'frequencyAnalysis',
      label: 'Frequency Analysis',
      type: 'FrequencyAnalysis',
    },
    {
      id: 'bassMax',
      label: 'Bass Max (Hz)',
      type: 'number',
      defaultValue: 250,
    },
    {
      id: 'midMax',
      label: 'Mid Max (Hz)',
      type: 'number',
      defaultValue: 4000,
    },
  ],
  outputs: [
    { id: 'bassEnergy', label: 'Bass Energy', type: 'number' },
    { id: 'midEnergy', label: 'Mid Energy', type: 'number' },
    { id: 'highEnergy', label: 'High Energy', type: 'number' },
    { id: 'bassPercent', label: 'Bass %', type: 'number' },
    { id: 'midPercent', label: 'Mid %', type: 'number' },
    { id: 'highPercent', label: 'High %', type: 'number' },
  ],
  computeSignal: ({ frequencyAnalysis, bassMax, midMax }, context, node) => {
    if (!node || !frequencyAnalysis || !frequencyAnalysis.frequencyData) {
      return {
        bassEnergy: 0,
        midEnergy: 0,
        highEnergy: 0,
        bassPercent: 0,
        midPercent: 0,
        highPercent: 0,
      };
    }

    const data = frequencyAnalysis.frequencyData;
    const sampleRate = frequencyAnalysis.sampleRate || 44100;
    const fftSize = frequencyAnalysis.fftSize || 2048;
    const n = data.length;

    if (n === 0) {
      return {
        bassEnergy: 0,
        midEnergy: 0,
        highEnergy: 0,
        bassPercent: 0,
        midPercent: 0,
        highPercent: 0,
      };
    }

    const freqPerBin = sampleRate / fftSize;
    const bassMaxFreq = typeof bassMax === 'number' ? bassMax : 250;
    const midMaxFreq = typeof midMax === 'number' ? midMax : 4000;

    let bassEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;

    // AGGRESSIVE perceptual weighting to compensate for FFT bin density
    // Goal: balanced D&B drop should show ~33% each band
    const getPerceptualWeight = (freq: number): number => {
      if (freq < 20) return 0;
      if (freq < 60) return 5.0; // Sub-bass (kick fundamentals)
      if (freq < 150) return 4.0; // Bass fundamentals
      if (freq < 300) return 3.0; // Bass harmonics
      if (freq < 600) return 2.0; // Low-mids
      if (freq < 1500) return 1.2; // Mids
      if (freq < 4000) return 0.8; // Upper mids
      if (freq < 8000) return 0.4; // Highs (compensate for bin density)
      if (freq < 12000) return 0.2; // Very high (many bins, little importance)
      return 0.1; // Extreme highs (mostly noise/artifacts)
    };

    // Sum energy in each band with perceptual weighting
    for (let i = 0; i < n; i++) {
      const freq = i * freqPerBin;
      const magnitude = data[i];
      const weight = getPerceptualWeight(freq);
      const weightedMagnitude = magnitude * weight;

      if (freq <= bassMaxFreq) {
        bassEnergy += weightedMagnitude;
      } else if (freq <= midMaxFreq) {
        midEnergy += weightedMagnitude;
      } else {
        highEnergy += weightedMagnitude;
      }
    }

    // Calculate percentages (0-1 range)
    const totalEnergy = bassEnergy + midEnergy + highEnergy;
    const bassPercent = totalEnergy > 0 ? bassEnergy / totalEnergy : 0;
    const midPercent = totalEnergy > 0 ? midEnergy / totalEnergy : 0;
    const highPercent = totalEnergy > 0 ? highEnergy / totalEnergy : 0;

    return {
      bassEnergy,
      midEnergy,
      highEnergy,
      bassPercent,
      midPercent,
      highPercent,
    };
  },
});

const SpectralCentroidNode = createNode({
  label: 'Spectral Centroid',
  description:
    'Calculates the "center of mass" of the frequency spectrum (in Hz). Low centroid = bass-heavy (drops), high centroid = treble-heavy (vocals/buildups). Perfect for detecting timbral/textural changes.',
  customBody: SpectralCentroidBody,
  inputs: [
    {
      id: 'frequencyAnalysis',
      label: 'Frequency Analysis',
      type: 'FrequencyAnalysis',
    },
    {
      id: 'smoothMs',
      label: 'Smooth (ms)',
      type: 'number',
      defaultValue: 50,
    },
  ],
  outputs: [
    { id: 'centroid', label: 'Centroid (Hz)', type: 'number' },
    { id: 'normalized', label: 'Normalized', type: 'number' },
  ],
  computeSignal: ({ frequencyAnalysis, smoothMs }, context, node) => {
    if (!node || !frequencyAnalysis || !frequencyAnalysis.frequencyData) {
      return { centroid: 0, normalized: 0 };
    }

    const data = frequencyAnalysis.frequencyData;
    const sampleRate = frequencyAnalysis.sampleRate || 44100;
    const fftSize = frequencyAnalysis.fftSize || 2048;
    const n = data.length;

    if (n === 0) return { centroid: 0, normalized: 0 };

    // Calculate frequency per bin
    const freqPerBin = sampleRate / fftSize;

    // Calculate spectral centroid: Σ(frequency * magnitude) / Σ(magnitude)
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < n; i++) {
      const magnitude = data[i];
      const frequency = i * freqPerBin;
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }

    const rawCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;

    // Temporal smoothing
    const state = node.data.state;
    const t = context.time;
    const prevTime = typeof state.prevTime === 'number' ? state.prevTime : t;
    const dt = Math.max(0, t - prevTime);
    const sMs = Math.max(1, typeof smoothMs === 'number' ? smoothMs : 50);
    const alpha = 1 - Math.exp(-dt / (sMs / 1000));
    const prevCentroid =
      typeof state.prevCentroid === 'number' ? state.prevCentroid : rawCentroid;
    const smoothedCentroid =
      prevCentroid + alpha * (rawCentroid - prevCentroid);

    state.prevCentroid = smoothedCentroid;
    state.prevTime = t;

    // Normalize to 0-1 range (typical range: 200Hz - 4000Hz)
    const normalized = Math.max(
      0,
      Math.min(1, (smoothedCentroid - 200) / 3800),
    );

    return { centroid: smoothedCentroid, normalized };
  },
});

const TimeDomainSectionDetectorNode = createNode({
  label: 'Adaptive Section Detector',
  description:
    'Ultra-low latency adaptive section detector using statistical analysis. Tracks energy difference percentiles to detect significant changes. Auto-calibrates to each song!',
  customBody: TimeDomainSectionDetectorBody,
  inputs: [
    {
      id: 'audioSignal',
      label: 'Audio Signal',
      type: 'Uint8Array',
    },
    {
      id: 'percentile',
      label: 'Percentile',
      type: 'number',
      defaultValue: 0.95,
    },
    {
      id: 'windowMs',
      label: 'Window (ms)',
      type: 'number',
      defaultValue: 4000,
    },
    {
      id: 'cooldownMs',
      label: 'Cooldown (ms)',
      type: 'number',
      defaultValue: 2000,
    },
    {
      id: 'holdMs',
      label: 'Hold Time (ms)',
      type: 'number',
      defaultValue: 100,
    },
  ],
  outputs: [
    { id: 'trigger', label: 'Trigger', type: 'number' },
    { id: 'difference', label: 'Difference', type: 'number' },
    { id: 'threshold', label: 'Threshold', type: 'number' },
  ],
  computeSignal: (
    { audioSignal, percentile, windowMs, cooldownMs, holdMs },
    context,
    node,
  ) => {
    if (!node || !audioSignal || !(audioSignal instanceof Uint8Array)) {
      return { trigger: 0, difference: 0, threshold: 0 };
    }

    const state = node.data.state;
    const p = Math.max(
      0.5,
      Math.min(0.999, typeof percentile === 'number' ? percentile : 0.95),
    );
    const windowDuration = Math.max(
      1000,
      typeof windowMs === 'number' ? windowMs : 4000,
    );
    const cooldown = Math.max(
      100,
      typeof cooldownMs === 'number' ? cooldownMs : 2000,
    );
    const hold = Math.max(10, typeof holdMs === 'number' ? holdMs : 100);
    const currentTime = context.time * 1000;

    // Calculate RMS energy of current frame
    let sumSquares = 0;
    const n = audioSignal.length;
    for (let i = 0; i < n; i++) {
      const normalized = (audioSignal[i] - 128) / 128; // Convert 0-255 to -1 to 1
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / n);
    const currentEnergy = rms * 100; // Scale to 0-100 range

    // Initialize state
    if (!Array.isArray(state.energyBuffer)) {
      state.energyBuffer = [];
    }
    if (!Array.isArray(state.differenceHistory)) {
      state.differenceHistory = [];
    }
    if (typeof state.lastTriggerTime !== 'number') {
      state.lastTriggerTime = -999999;
    }
    if (typeof state.triggerTime !== 'number') {
      state.triggerTime = -999999;
    }

    // Maintain energy buffer for short-term averaging (~150ms = 9 frames at 60fps)
    const energyBuffer = state.energyBuffer as number[];
    const bufferFrames = 9; // ~150ms at 60fps

    energyBuffer.push(currentEnergy);
    if (energyBuffer.length > bufferFrames * 2) {
      energyBuffer.shift();
    }

    // Calculate current and previous window averages
    let currentWindowAvg = 0;
    let previousWindowAvg = 0;

    if (energyBuffer.length >= bufferFrames * 2) {
      // Current window: last N frames
      const currentWindow = energyBuffer.slice(-bufferFrames);
      currentWindowAvg =
        currentWindow.reduce((sum, e) => sum + e, 0) / currentWindow.length;

      // Previous window: N frames before that
      const previousWindow = energyBuffer.slice(
        -bufferFrames * 2,
        -bufferFrames,
      );
      previousWindowAvg =
        previousWindow.reduce((sum, e) => sum + e, 0) / previousWindow.length;
    }

    // Calculate absolute difference between windows (detects section-level changes)
    const energyDiff = Math.abs(currentWindowAvg - previousWindowAvg);

    // Maintain rolling window of differences for adaptive threshold
    const differenceHistory = state.differenceHistory as number[];
    // Estimate frames in window: assume ~60fps
    const estimatedFrames = Math.ceil((windowDuration / 1000) * 60);

    differenceHistory.push(energyDiff);
    if (differenceHistory.length > estimatedFrames) {
      differenceHistory.shift();
    }

    // Calculate adaptive threshold using percentile (like Adaptive Normalize Quantile)
    let adaptiveThreshold = 0;
    if (differenceHistory.length >= 30) {
      const sorted = [...differenceHistory].sort((a, b) => a - b);
      const idx = Math.floor(sorted.length * p);
      adaptiveThreshold = sorted[idx] || 0;
    }

    // Trigger when current difference exceeds the adaptive percentile threshold
    const isSignificantChange =
      energyDiff > adaptiveThreshold && adaptiveThreshold > 0.1;

    const lastTriggerTime = state.lastTriggerTime as number;
    const triggerTime = state.triggerTime as number;
    let timeSinceLastTrigger = currentTime - lastTriggerTime;
    let timeSinceTrigger = currentTime - triggerTime;

    // Handle time reset (e.g., when audio loops) - reset state if time goes backwards
    if (timeSinceLastTrigger < 0 || timeSinceTrigger < 0) {
      state.lastTriggerTime = -999999;
      state.triggerTime = -999999;
      timeSinceLastTrigger = Infinity;
      timeSinceTrigger = Infinity;
    }

    let trigger = 0;

    // Check if we're in cooldown period
    if (timeSinceLastTrigger < cooldown) {
      // In cooldown - check if we should hold trigger high
      if (timeSinceTrigger < hold) {
        trigger = 1;
      }
    } else {
      // Not in cooldown - check for statistically significant change
      if (isSignificantChange) {
        // Statistically significant change detected! Trigger and start cooldown
        state.lastTriggerTime = currentTime;
        state.triggerTime = currentTime;
        trigger = 1;
      }
    }

    return { trigger, difference: energyDiff, threshold: adaptiveThreshold };
  },
});

const RateLimiterNode = createNode({
  label: 'Rate Limiter',
  description:
    'Limits how often the output value can change. Prevents rapid value switching by enforcing a minimum time interval between changes. Perfect for preventing twitchy mode switches!',
  customBody: RateLimiterBody,
  inputs: [
    { id: 'value', label: 'Value', type: 'number', defaultValue: 0 },
    {
      id: 'minIntervalMs',
      label: 'Min Interval (ms)',
      type: 'number',
      defaultValue: 250,
    },
  ],
  outputs: [{ id: 'limited', label: 'Limited', type: 'number' }],
  computeSignal: ({ value, minIntervalMs }, context, node) => {
    if (!node) return { limited: 0 };

    const state = node.data.state;
    const currentValue = typeof value === 'number' ? value : 0;
    const minInterval = Math.max(
      0,
      typeof minIntervalMs === 'number' ? minIntervalMs : 250,
    );
    const currentTime = context.time * 1000; // Convert to milliseconds

    // Store current time in state for display body
    state.currentTime = currentTime;

    // Initialize state
    if (typeof state.lastValue !== 'number') {
      state.lastValue = currentValue;
      state.lastChangeTime = currentTime;
      return { limited: currentValue };
    }

    const lastValue = state.lastValue as number;
    const lastChangeTime = state.lastChangeTime as number;
    const timeSinceLastChange = currentTime - lastChangeTime;

    // Handle time reset (e.g., when audio loops)
    if (timeSinceLastChange < 0) {
      state.lastValue = currentValue;
      state.lastChangeTime = currentTime;
      return { limited: currentValue };
    }

    // Check if value has changed and enough time has passed
    if (currentValue !== lastValue && timeSinceLastChange >= minInterval) {
      // Allow the change
      state.lastValue = currentValue;
      state.lastChangeTime = currentTime;
      return { limited: currentValue };
    }

    // Hold the previous value (rate limiting active)
    return { limited: lastValue };
  },
});

export const nodes: AnimNode[] = [
  SineNode,
  MathNode,
  NormalizeNode,
  AdaptiveNormalizeQuantileNode,
  FrequencyBandNode,
  MultiBandAnalysisNode,
  SpikeNode,
  PitchDetectionNode,
  ValueMapperNode,
  ThresholdCounterNode,
  RateLimiterNode,
  SectionChangeDetectorNode,
  SpectralCentroidNode,
  TimeDomainSectionDetectorNode,
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
