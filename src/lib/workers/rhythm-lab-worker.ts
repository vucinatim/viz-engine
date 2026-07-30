import {
  beatTrack,
  onsetStrength,
  tempo,
  tempogram,
} from '@viz-engine/rhythm-core';

type OnsetAggregate = 'mean' | 'median' | 'max';

type OnsetRequest = {
  id: number;
  samples: Float32Array;
  sampleRate: number;
  hopLength: number;
  nFft: number;
  winLength: number;
  aggregate: OnsetAggregate;
  logCompression: boolean;
  center?: boolean;
  minBpm?: number;
  maxBpm?: number;
  phaseOffset?: number;
  optimizePhase?: boolean;
  tempoOverride?: number;
};

type OnsetResponse = {
  id: number;
  onsetEnv: Float32Array;
  tempogram?: Float32Array;
  tempos?: Float32Array;
  tempo?: number;
  tempoCandidates?: Float32Array;
  tempoRefined?: number;
  beats?: Float32Array;
  beatsTimes?: Float32Array;
  beatConfidence?: number;
  beatPhase?: number;
  beatPeriodFrames?: number;
  sampleRate: number;
  hopLength: number;
  winLength: number;
  sampleCount: number;
  stats: {
    min: number;
    max: number;
    mean: number;
    frames: number;
  };
  tempogramStats?: {
    min: number;
    max: number;
    mean: number;
    points: number;
  };
};

const ctx = self as typeof globalThis & {
  postMessage: (message: OnsetResponse, transfer?: Transferable[]) => void;
  onmessage: ((event: MessageEvent<OnsetRequest>) => void) | null;
};

ctx.onmessage = (event: MessageEvent<OnsetRequest>) => {
  const {
    id,
    samples,
    sampleRate,
    hopLength,
    nFft,
    winLength,
    aggregate,
    logCompression,
    center,
    minBpm,
    maxBpm,
    phaseOffset,
    optimizePhase,
    tempoOverride,
  } = event.data;

  const result = onsetStrength(samples, {
    sr: sampleRate,
    hopLength,
    nFft,
    winLength,
    aggregate,
    logCompression,
    center,
  });

  const env = result.onsetEnv;
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  let sum = 0;
  for (let i = 0; i < env.length; i += 1) {
    const value = env[i];
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
  }

  const tempoResult = tempogram(env, {
    sr: sampleRate,
    hopLength,
    minBpm,
    maxBpm,
    method: 'ac',
  });

  const tempoPick = tempo(env, {
    sr: sampleRate,
    hopLength,
    minBpm,
    maxBpm,
    method: 'ac',
    preferHigher: true,
  });

  const beatResult = beatTrack(env, {
    sr: sampleRate,
    hopLength,
    minBpm,
    maxBpm,
    tempo: tempoOverride ?? tempoPick.tempo,
    phaseOffset,
    optimizePhase,
  });

  const tempoCurve = tempoResult.tempogram;
  let tempoMin = Number.POSITIVE_INFINITY;
  let tempoMax = 0;
  let tempoSum = 0;
  for (let i = 0; i < tempoCurve.length; i += 1) {
    const value = tempoCurve[i];
    if (value < tempoMin) tempoMin = value;
    if (value > tempoMax) tempoMax = value;
    tempoSum += value;
  }

  const response: OnsetResponse = {
    id,
    onsetEnv: env,
    tempogram: tempoCurve,
    tempos: tempoResult.tempos,
    tempo: tempoPick.tempo,
    tempoCandidates: tempoPick.candidates,
    tempoRefined: tempoPick.refinedTempo,
    beats: beatResult.beats,
    beatsTimes: beatResult.beatsTimes,
    beatConfidence: beatResult.confidence,
    beatPhase: beatResult.phaseOffset,
    beatPeriodFrames: beatResult.periodFrames,
    sampleRate,
    hopLength,
    winLength,
    sampleCount: samples.length,
    stats: {
      min: env.length ? min : 0,
      max,
      mean: env.length ? sum / env.length : 0,
      frames: env.length,
    },
    tempogramStats: {
      min: tempoCurve.length ? tempoMin : 0,
      max: tempoMax,
      mean: tempoCurve.length ? tempoSum / tempoCurve.length : 0,
      points: tempoCurve.length,
    },
  };

  ctx.postMessage(response, [
    env.buffer,
    tempoCurve.buffer,
    tempoPick.candidates.buffer,
    beatResult.beats.buffer,
    beatResult.beatsTimes?.buffer ?? new ArrayBuffer(0),
  ]);
};

export {};
