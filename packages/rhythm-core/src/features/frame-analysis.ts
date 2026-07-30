import { isPowerOfTwo, jsFftBackend } from '../core/fft.js';
import { toMono } from '../core/signal.js';
import { getWindow } from '../core/window.js';
import type { AudioSignal } from '../utils/types.js';

export const STANDARD_AUDIO_FRAME_ANALYSIS_VERSION =
  'rhythm-core.standard-audio-frame-analysis.v1' as const;

export type StandardAudioFeatureName =
  | 'rms'
  | 'loudness'
  | 'bass-energy'
  | 'mid-energy'
  | 'treble-energy'
  | 'spectral-centroid'
  | 'spectral-flux'
  | 'onset-strength'
  | 'waveform-peak';

export interface StandardAudioFrameAnalysisOptions {
  sampleRate: number;
  fps: number;
  fftSize?: number;
  spectrumBinCount?: number;
  waveformSampleCount?: number;
  startSample?: number;
  sampleCount?: number;
  minDecibels?: number;
  maxDecibels?: number;
  shouldCancel?: () => boolean;
  onProgress?: (completedFrames: number, totalFrames: number) => void;
}

export interface StandardAudioFrameAnalysisAsyncOptions extends StandardAudioFrameAnalysisOptions {
  yieldEveryFrames?: number;
  yieldToHost?: () => Promise<void>;
}

export interface StandardAudioFeatureSeries {
  name: StandardAudioFeatureName;
  unit: 'linear-amplitude' | 'unit' | 'hertz';
  normalization: 'none' | 'decibel-unit' | 'artifact-peak';
  values: Float32Array;
}

export interface StandardAudioFrameAnalysisResult {
  analysisVersion: typeof STANDARD_AUDIO_FRAME_ANALYSIS_VERSION;
  sampleRate: number;
  channelCount: number;
  fps: number;
  frameCount: number;
  fftSize: number;
  spectrumBinCount: number;
  waveformSampleCount: number;
  startSample: number;
  sampleCount: number;
  minDecibels: number;
  maxDecibels: number;
  featureSeries: StandardAudioFeatureSeries[];
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
}

export class StandardAudioFrameAnalysisCancelledError extends Error {
  constructor() {
    super('Standard audio frame analysis was cancelled.');
    this.name = 'StandardAudioFrameAnalysisCancelledError';
  }
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const assertPositiveFinite = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
};

const amplitudeToDecibelUnit = (
  amplitude: number,
  minDecibels: number,
  maxDecibels: number,
): number => {
  const decibels = amplitude > 0 ? 20 * Math.log10(amplitude) : minDecibels;
  return clamp((decibels - minDecibels) / (maxDecibels - minDecibels), 0, 1);
};

const normalizeByPeak = (values: Float32Array): void => {
  let peak = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
  }
  if (peak <= 0) {
    return;
  }
  for (let index = 0; index < values.length; index += 1) {
    values[index] /= peak;
  }
};

const getChannelCount = (signal: AudioSignal): number =>
  signal instanceof Float32Array ? 1 : 2;

interface StandardAudioFrameAnalysisExecution {
  frameCount: number;
  processFrame(frameIndex: number): void;
  finalize(): StandardAudioFrameAnalysisResult;
}

const createStandardAudioFrameAnalysisExecution = (
  signal: AudioSignal,
  options: StandardAudioFrameAnalysisOptions,
): StandardAudioFrameAnalysisExecution => {
  assertPositiveFinite(options.sampleRate, 'sampleRate');
  assertPositiveFinite(options.fps, 'fps');

  const mono = toMono(signal);
  const channelCount = getChannelCount(signal);
  const fftSize = options.fftSize ?? 2048;
  const spectrumBinCount = options.spectrumBinCount ?? fftSize / 2;
  const waveformSampleCount = options.waveformSampleCount ?? fftSize;
  const minDecibels = options.minDecibels ?? -90;
  const maxDecibels = options.maxDecibels ?? -10;
  const startSample = Math.max(0, Math.floor(options.startSample ?? 0));
  const availableSamples = Math.max(0, mono.length - startSample);
  const sampleCount = Math.min(
    availableSamples,
    Math.max(0, Math.floor(options.sampleCount ?? availableSamples)),
  );

  if (!Number.isInteger(fftSize) || fftSize < 32 || !isPowerOfTwo(fftSize)) {
    throw new Error('fftSize must be a power-of-two integer of at least 32.');
  }
  if (
    !Number.isInteger(spectrumBinCount) ||
    spectrumBinCount <= 0 ||
    spectrumBinCount > fftSize / 2
  ) {
    throw new Error(
      'spectrumBinCount must be a positive integer no larger than fftSize / 2.',
    );
  }
  if (
    !Number.isInteger(waveformSampleCount) ||
    waveformSampleCount <= 0 ||
    waveformSampleCount > fftSize
  ) {
    throw new Error(
      'waveformSampleCount must be a positive integer no larger than fftSize.',
    );
  }
  if (
    !Number.isFinite(minDecibels) ||
    !Number.isFinite(maxDecibels) ||
    minDecibels >= maxDecibels
  ) {
    throw new Error('minDecibels must be finite and lower than maxDecibels.');
  }

  const frameCount = Math.ceil(
    (sampleCount / options.sampleRate) * options.fps,
  );
  const frequencyData = new Uint8Array(frameCount * spectrumBinCount);
  const timeDomainData = new Uint8Array(frameCount * waveformSampleCount);
  const seriesValues = new Map<StandardAudioFeatureName, Float32Array>([
    ['rms', new Float32Array(frameCount)],
    ['loudness', new Float32Array(frameCount)],
    ['bass-energy', new Float32Array(frameCount)],
    ['mid-energy', new Float32Array(frameCount)],
    ['treble-energy', new Float32Array(frameCount)],
    ['spectral-centroid', new Float32Array(frameCount)],
    ['spectral-flux', new Float32Array(frameCount)],
    ['onset-strength', new Float32Array(frameCount)],
    ['waveform-peak', new Float32Array(frameCount)],
  ]);
  const analysisWindow = getWindow('hann', fftSize);
  const windowSum = analysisWindow.reduce((sum, value) => sum + value, 0);
  const rawFrame = new Float32Array(fftSize);
  const fftReal = new Float32Array(fftSize);
  const fftImag = new Float32Array(fftSize);
  const positiveBinCount = fftSize / 2;
  const magnitudes = new Float32Array(positiveBinCount);
  const previousMagnitudes = new Float32Array(positiveBinCount);
  const samplesPerOutputFrame = options.sampleRate / options.fps;
  const sourceEndSample = startSample + sampleCount;

  const getBandEnergy = (minHz: number, maxHz: number): number => {
    const binHz = options.sampleRate / fftSize;
    const startBin = clamp(Math.ceil(minHz / binHz), 0, positiveBinCount - 1);
    const endBin = clamp(
      Math.ceil(maxHz / binHz),
      startBin + 1,
      positiveBinCount,
    );
    let sumSquares = 0;
    for (let bin = startBin; bin < endBin; bin += 1) {
      sumSquares += magnitudes[bin]! * magnitudes[bin]!;
    }
    return Math.sqrt(sumSquares / Math.max(1, endBin - startBin));
  };

  const processFrame = (frameIndex: number): void => {
    if (
      !Number.isInteger(frameIndex) ||
      frameIndex < 0 ||
      frameIndex >= frameCount
    ) {
      throw new Error(
        `Audio analysis frame index ${frameIndex} is outside 0..${Math.max(0, frameCount - 1)}.`,
      );
    }
    if (options.shouldCancel?.()) {
      throw new StandardAudioFrameAnalysisCancelledError();
    }

    const centerSample =
      startSample + (frameIndex + 0.5) * samplesPerOutputFrame;
    const frameStart = Math.floor(centerSample - fftSize / 2);
    let sumSquares = 0;
    let waveformPeak = 0;

    for (let sampleIndex = 0; sampleIndex < fftSize; sampleIndex += 1) {
      const sourceIndex = frameStart + sampleIndex;
      const sample =
        sourceIndex >= startSample &&
        sourceIndex < sourceEndSample &&
        sourceIndex < mono.length
          ? mono[sourceIndex]!
          : 0;
      rawFrame[sampleIndex] = sample;
      sumSquares += sample * sample;
      waveformPeak = Math.max(waveformPeak, Math.abs(sample));
      fftReal[sampleIndex] = sample * analysisWindow[sampleIndex]!;
      fftImag[sampleIndex] = 0;
    }

    const waveformOffset = frameIndex * waveformSampleCount;
    for (
      let waveformIndex = 0;
      waveformIndex < waveformSampleCount;
      waveformIndex += 1
    ) {
      const sampleIndex = Math.min(
        fftSize - 1,
        Math.floor(((waveformIndex + 0.5) * fftSize) / waveformSampleCount),
      );
      timeDomainData[waveformOffset + waveformIndex] = Math.round(
        clamp((rawFrame[sampleIndex]! + 1) * 127.5, 0, 255),
      );
    }

    const transformed = jsFftBackend.forward(fftReal, fftImag);
    let magnitudeSum = 0;
    let weightedMagnitudeSum = 0;
    let positiveFluxSum = 0;
    const binHz = options.sampleRate / fftSize;

    for (let bin = 0; bin < positiveBinCount; bin += 1) {
      const magnitude =
        (2 * Math.hypot(transformed.real[bin]!, transformed.imag[bin]!)) /
        Math.max(windowSum, 1);
      magnitudes[bin] = magnitude;
      magnitudeSum += magnitude;
      weightedMagnitudeSum += magnitude * bin * binHz;
      positiveFluxSum += Math.max(0, magnitude - previousMagnitudes[bin]!);
    }

    const spectrumOffset = frameIndex * spectrumBinCount;
    for (
      let spectrumIndex = 0;
      spectrumIndex < spectrumBinCount;
      spectrumIndex += 1
    ) {
      const firstBin = Math.floor(
        (spectrumIndex * positiveBinCount) / spectrumBinCount,
      );
      const lastBin = Math.max(
        firstBin + 1,
        Math.floor(((spectrumIndex + 1) * positiveBinCount) / spectrumBinCount),
      );
      let peakMagnitude = 0;
      for (let bin = firstBin; bin < lastBin; bin += 1) {
        peakMagnitude = Math.max(peakMagnitude, magnitudes[bin]!);
      }
      frequencyData[spectrumOffset + spectrumIndex] = Math.round(
        amplitudeToDecibelUnit(peakMagnitude, minDecibels, maxDecibels) * 255,
      );
    }

    const rms = Math.sqrt(sumSquares / fftSize);
    seriesValues.get('rms')![frameIndex] = rms;
    seriesValues.get('loudness')![frameIndex] = amplitudeToDecibelUnit(
      rms,
      minDecibels,
      0,
    );
    seriesValues.get('bass-energy')![frameIndex] = amplitudeToDecibelUnit(
      getBandEnergy(20, 250),
      minDecibels,
      0,
    );
    seriesValues.get('mid-energy')![frameIndex] = amplitudeToDecibelUnit(
      getBandEnergy(250, 4000),
      minDecibels,
      0,
    );
    seriesValues.get('treble-energy')![frameIndex] = amplitudeToDecibelUnit(
      getBandEnergy(4000, options.sampleRate / 2),
      minDecibels,
      0,
    );
    seriesValues.get('spectral-centroid')![frameIndex] =
      magnitudeSum > 0 ? weightedMagnitudeSum / magnitudeSum : 0;
    const spectralFlux = positiveFluxSum / positiveBinCount;
    seriesValues.get('spectral-flux')![frameIndex] = spectralFlux;
    seriesValues.get('onset-strength')![frameIndex] = Math.log1p(spectralFlux);
    seriesValues.get('waveform-peak')![frameIndex] = waveformPeak;

    previousMagnitudes.set(magnitudes);
    options.onProgress?.(frameIndex + 1, frameCount);
  };

  const finalize = (): StandardAudioFrameAnalysisResult => {
    normalizeByPeak(seriesValues.get('spectral-flux')!);
    normalizeByPeak(seriesValues.get('onset-strength')!);

    const featureSeries: StandardAudioFeatureSeries[] = [
      {
        name: 'rms',
        unit: 'linear-amplitude',
        normalization: 'none',
        values: seriesValues.get('rms')!,
      },
      {
        name: 'loudness',
        unit: 'unit',
        normalization: 'decibel-unit',
        values: seriesValues.get('loudness')!,
      },
      {
        name: 'bass-energy',
        unit: 'unit',
        normalization: 'decibel-unit',
        values: seriesValues.get('bass-energy')!,
      },
      {
        name: 'mid-energy',
        unit: 'unit',
        normalization: 'decibel-unit',
        values: seriesValues.get('mid-energy')!,
      },
      {
        name: 'treble-energy',
        unit: 'unit',
        normalization: 'decibel-unit',
        values: seriesValues.get('treble-energy')!,
      },
      {
        name: 'spectral-centroid',
        unit: 'hertz',
        normalization: 'none',
        values: seriesValues.get('spectral-centroid')!,
      },
      {
        name: 'spectral-flux',
        unit: 'unit',
        normalization: 'artifact-peak',
        values: seriesValues.get('spectral-flux')!,
      },
      {
        name: 'onset-strength',
        unit: 'unit',
        normalization: 'artifact-peak',
        values: seriesValues.get('onset-strength')!,
      },
      {
        name: 'waveform-peak',
        unit: 'linear-amplitude',
        normalization: 'none',
        values: seriesValues.get('waveform-peak')!,
      },
    ];

    return {
      analysisVersion: STANDARD_AUDIO_FRAME_ANALYSIS_VERSION,
      sampleRate: options.sampleRate,
      channelCount,
      fps: options.fps,
      frameCount,
      fftSize,
      spectrumBinCount,
      waveformSampleCount,
      startSample,
      sampleCount,
      minDecibels,
      maxDecibels,
      featureSeries,
      frequencyData,
      timeDomainData,
    };
  };

  return {
    frameCount,
    processFrame,
    finalize,
  };
};

export const analyzeStandardAudioFrames = (
  signal: AudioSignal,
  options: StandardAudioFrameAnalysisOptions,
): StandardAudioFrameAnalysisResult => {
  const execution = createStandardAudioFrameAnalysisExecution(signal, options);
  for (let frameIndex = 0; frameIndex < execution.frameCount; frameIndex += 1) {
    execution.processFrame(frameIndex);
  }
  return execution.finalize();
};

const yieldToEventLoop = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

export const analyzeStandardAudioFramesAsync = async (
  signal: AudioSignal,
  options: StandardAudioFrameAnalysisAsyncOptions,
): Promise<StandardAudioFrameAnalysisResult> => {
  const yieldEveryFrames = options.yieldEveryFrames ?? 8;
  if (!Number.isInteger(yieldEveryFrames) || yieldEveryFrames <= 0) {
    throw new Error('yieldEveryFrames must be a positive integer.');
  }
  const execution = createStandardAudioFrameAnalysisExecution(signal, options);
  const yieldToHost = options.yieldToHost ?? yieldToEventLoop;

  for (let frameIndex = 0; frameIndex < execution.frameCount; frameIndex += 1) {
    execution.processFrame(frameIndex);
    if (
      frameIndex + 1 < execution.frameCount &&
      (frameIndex + 1) % yieldEveryFrames === 0
    ) {
      await yieldToHost();
    }
  }
  return execution.finalize();
};
