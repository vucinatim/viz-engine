import { onsetStrength } from '@viz-engine/rhythm-core';

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
};

type OnsetResponse = {
  id: number;
  onsetEnv: Float32Array;
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
};

const ctx: DedicatedWorkerGlobalScope = self as any;

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

  const response: OnsetResponse = {
    id,
    onsetEnv: env,
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
  };

  ctx.postMessage(response, [env.buffer]);
};

export {};
