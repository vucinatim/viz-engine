import {
  analyzeStandardAudioFrames,
  analyzeStandardAudioFramesAsync,
  STANDARD_AUDIO_FRAME_ANALYSIS_VERSION,
  StandardAudioFrameAnalysisCancelledError,
} from '@viz-engine/rhythm-core';
import { describe, expect, it } from 'vitest';

const createSine = (
  frequency: number,
  durationSeconds: number,
  sampleRate: number,
  amplitude = 0.8,
): Float32Array => {
  const signal = new Float32Array(
    Math.floor(durationSeconds * sampleRate),
  );
  for (let index = 0; index < signal.length; index += 1) {
    signal[index] =
      Math.sin((2 * Math.PI * frequency * index) / sampleRate) *
      amplitude;
  }
  return signal;
};

const getSeries = (
  result: ReturnType<typeof analyzeStandardAudioFrames>,
  name: string,
) => result.featureSeries.find((series) => series.name === name)!.values;

describe('standard audio frame analysis', () => {
  it('is deterministic and emits exactly described packed frame data', () => {
    const signal = createSine(110, 0.5, 8_000);
    const options = {
      sampleRate: 8_000,
      fps: 20,
      fftSize: 512,
      spectrumBinCount: 32,
      waveformSampleCount: 40,
    };
    const first = analyzeStandardAudioFrames(signal, options);
    const second = analyzeStandardAudioFrames(signal, options);

    expect(first.analysisVersion).toBe(
      STANDARD_AUDIO_FRAME_ANALYSIS_VERSION,
    );
    expect(first.frameCount).toBe(10);
    expect(first.frequencyData).toHaveLength(10 * 32);
    expect(first.timeDomainData).toHaveLength(10 * 40);
    expect(first.frequencyData).toEqual(second.frequencyData);
    expect(first.timeDomainData).toEqual(second.timeDomainData);
    expect(
      first.featureSeries.map(({ name, values }) => [
        name,
        Array.from(values),
      ]),
    ).toEqual(
      second.featureSeries.map(({ name, values }) => [
        name,
        Array.from(values),
      ]),
    );
  });

  it('keeps silence finite and centered in the waveform byte range', () => {
    const result = analyzeStandardAudioFrames(
      new Float32Array(4_000),
      {
        sampleRate: 8_000,
        fps: 20,
        fftSize: 512,
        spectrumBinCount: 32,
        waveformSampleCount: 40,
      },
    );

    expect(new Set(result.frequencyData)).toEqual(new Set([0]));
    expect(new Set(result.timeDomainData)).toEqual(new Set([128]));
    for (const series of result.featureSeries) {
      expect(Array.from(series.values).every(Number.isFinite)).toBe(true);
      expect(new Set(series.values)).toEqual(new Set([0]));
    }
  });

  it('places a bass sine in the low band and an impulse in onset channels', () => {
    const sampleRate = 8_000;
    const bass = analyzeStandardAudioFrames(
      createSine(110, 1, sampleRate),
      {
        sampleRate,
        fps: 20,
        fftSize: 512,
      },
    );
    const impulseSignal = new Float32Array(sampleRate);
    impulseSignal[Math.floor(sampleRate / 2)] = 1;
    const impulse = analyzeStandardAudioFrames(impulseSignal, {
      sampleRate,
      fps: 20,
      fftSize: 512,
    });

    const average = (values: Float32Array) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(average(getSeries(bass, 'bass-energy'))).toBeGreaterThan(
      average(getSeries(bass, 'mid-energy')) + 0.1,
    );
    expect(Math.max(...getSeries(impulse, 'spectral-flux'))).toBe(1);
    expect(Math.max(...getSeries(impulse, 'onset-strength'))).toBe(1);
  });

  it('uses explicit centered source-window alignment and reports progress', () => {
    const progress: Array<[number, number]> = [];
    const result = analyzeStandardAudioFrames(
      createSine(440, 1, 8_000),
      {
        sampleRate: 8_000,
        fps: 10,
        fftSize: 256,
        startSample: 2_000,
        sampleCount: 4_000,
        onProgress: (completed, total) => {
          progress.push([completed, total]);
        },
      },
    );

    expect(result).toMatchObject({
      startSample: 2_000,
      sampleCount: 4_000,
      frameCount: 5,
    });
    expect(progress).toEqual([
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
      [5, 5],
    ]);
  });

  it('keeps cooperative async execution byte-identical and cancellable', async () => {
    const signal = createSine(220, 0.5, 8_000);
    const options = {
      sampleRate: 8_000,
      fps: 20,
      fftSize: 256,
    };
    const expected = analyzeStandardAudioFrames(signal, options);
    let yields = 0;
    const actual = await analyzeStandardAudioFramesAsync(signal, {
      ...options,
      yieldEveryFrames: 2,
      yieldToHost: async () => {
        yields += 1;
      },
    });

    expect(actual).toEqual(expected);
    expect(yields).toBe(4);

    let cancel = false;
    await expect(
      analyzeStandardAudioFramesAsync(signal, {
        ...options,
        yieldEveryFrames: 2,
        shouldCancel: () => cancel,
        yieldToHost: async () => {
          cancel = true;
        },
      }),
    ).rejects.toBeInstanceOf(
      StandardAudioFrameAnalysisCancelledError,
    );
  });
});
