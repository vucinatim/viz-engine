import {
  beatTrack,
  onsetStrength,
  tempo,
  tempogram,
} from '@viz-engine/rhythm-core';
import { describe, expect, it } from 'vitest';

const createClickTrack = () => {
  const sampleRate = 8_000;
  const samples = new Float32Array(sampleRate * 8);
  const beatPeriod = sampleRate / 2;
  for (let start = 0; start < samples.length; start += beatPeriod) {
    for (let offset = 0; offset < 64; offset += 1) {
      samples[start + offset] = 1 - offset / 64;
    }
  }
  return { sampleRate, samples };
};

const analyze = () => {
  const { sampleRate, samples } = createClickTrack();
  const onset = onsetStrength(samples, {
    sr: sampleRate,
    hopLength: 128,
    nFft: 512,
    winLength: 512,
    aggregate: 'mean',
    logCompression: true,
    center: false,
  }).onsetEnv;
  const tempoResult = tempo(onset, {
    sr: sampleRate,
    hopLength: 128,
    minBpm: 80,
    maxBpm: 160,
    method: 'ac',
    preferHigher: true,
  });
  const tempogramResult = tempogram(onset, {
    sr: sampleRate,
    hopLength: 128,
    minBpm: 80,
    maxBpm: 160,
    method: 'ac',
  });
  const beats = beatTrack(onset, {
    sr: sampleRate,
    hopLength: 128,
    minBpm: 80,
    maxBpm: 160,
    tempo: tempoResult.tempo,
    optimizePhase: true,
  });
  return { onset, tempoResult, tempogramResult, beats };
};

describe('rhythm-core repeatability', () => {
  it('returns stable analysis for equivalent rhythmic audio', () => {
    const first = analyze();
    const second = analyze();

    expect(first.tempoResult.tempo).toBeCloseTo(120, 0);
    expect(first.tempoResult.tempo).toBe(second.tempoResult.tempo);
    expect(first.tempoResult.refinedTempo).toBe(
      second.tempoResult.refinedTempo,
    );
    expect(first.onset).toEqual(second.onset);
    expect(first.tempogramResult.tempogram).toEqual(
      second.tempogramResult.tempogram,
    );
    expect(first.beats.beatsTimes).toEqual(second.beats.beatsTimes);
    expect(first.beats.confidence).toBe(second.beats.confidence);
  });
});
