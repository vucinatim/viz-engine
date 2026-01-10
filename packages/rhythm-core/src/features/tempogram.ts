import { TempogramOptions, TempogramResult } from '../utils/types';

export const DEFAULT_TEMPOGRAM_OPTIONS: Required<
  Pick<TempogramOptions, 'sr' | 'hopLength' | 'minBpm' | 'maxBpm' | 'method'>
> = {
  sr: 22050,
  hopLength: 512,
  minBpm: 30,
  maxBpm: 300,
  method: 'ac',
};

export function tempogram(
  onsetEnv: Float32Array,
  options: TempogramOptions = {},
): TempogramResult {
  const method = options.method ?? DEFAULT_TEMPOGRAM_OPTIONS.method;
  const sr = options.sr ?? DEFAULT_TEMPOGRAM_OPTIONS.sr;
  const hopLength = options.hopLength ?? DEFAULT_TEMPOGRAM_OPTIONS.hopLength;
  const minBpm = options.minBpm ?? DEFAULT_TEMPOGRAM_OPTIONS.minBpm;
  const maxBpm = options.maxBpm ?? DEFAULT_TEMPOGRAM_OPTIONS.maxBpm;

  if (!onsetEnv.length || method !== 'ac') {
    return {
      tempogram: new Float32Array(0),
      shape: [0, 0],
      tempos: new Float32Array(0),
      method,
    };
  }

  const smoothed = new Float32Array(onsetEnv.length);
  const smoothRadius = 2;
  for (let i = 0; i < onsetEnv.length; i += 1) {
    let sum = 0;
    let count = 0;
    for (let j = -smoothRadius; j <= smoothRadius; j += 1) {
      const idx = i + j;
      if (idx < 0 || idx >= onsetEnv.length) continue;
      sum += onsetEnv[idx];
      count += 1;
    }
    smoothed[i] = count > 0 ? sum / count : onsetEnv[i];
  }

  const medianFiltered = new Float32Array(smoothed.length);
  const medianRadius = 2;
  const windowSize = medianRadius * 2 + 1;
  const windowValues = new Float32Array(windowSize);
  for (let i = 0; i < smoothed.length; i += 1) {
    let count = 0;
    for (let j = -medianRadius; j <= medianRadius; j += 1) {
      const idx = i + j;
      if (idx < 0 || idx >= smoothed.length) continue;
      windowValues[count] = smoothed[idx];
      count += 1;
    }
    const slice = Array.from(windowValues.subarray(0, count)).sort(
      (a, b) => a - b,
    );
    medianFiltered[i] = slice[Math.floor(count / 2)] ?? smoothed[i];
  }

  const minLag = Math.max(
    1,
    Math.round((60 * sr) / (maxBpm * hopLength)),
  );
  const maxLag = Math.max(
    minLag,
    Math.round((60 * sr) / (minBpm * hopLength)),
  );
  const lagCount = Math.max(0, maxLag - minLag + 1);
  const tempogramValues = new Float32Array(lagCount);
  const tempos = new Float32Array(lagCount);

  const framesPerSecond = sr / hopLength;
  const windowSeconds = 8;
  const windowLength = Math.max(
    32,
    Math.min(medianFiltered.length, Math.round(framesPerSecond * windowSeconds)),
  );
  const windowHop = Math.max(1, Math.round(windowLength / 2));

  const accum = new Float32Array(lagCount);
  const counts = new Float32Array(lagCount);

  for (let start = 0; start + windowLength <= medianFiltered.length; start += windowHop) {
    let mean = 0;
    for (let i = start; i < start + windowLength; i += 1) {
      mean += medianFiltered[i];
    }
    mean /= windowLength;

    let variance = 0;
    for (let i = start; i < start + windowLength; i += 1) {
      const diff = medianFiltered[i] - mean;
      variance += diff * diff;
    }
    const std = Math.sqrt(variance / windowLength) || 1;

    for (let i = 0; i < lagCount; i += 1) {
      const lag = minLag + i;
      let sum = 0;
      let sumA = 0;
      let sumB = 0;
      for (let j = start; j + lag < start + windowLength; j += 1) {
        const a = (medianFiltered[j] - mean) / std;
        const b = (medianFiltered[j + lag] - mean) / std;
        sum += a * b;
        sumA += a * a;
        sumB += b * b;
      }
      const denom = Math.sqrt(sumA * sumB);
      const normalized = denom > 0 ? sum / denom : 0;
      accum[i] += normalized;
      counts[i] += 1;
      tempos[i] = (60 * sr) / (hopLength * lag);
    }
  }

  let maxValue = 0;
  for (let i = 0; i < lagCount; i += 1) {
    const averaged = counts[i] > 0 ? accum[i] / counts[i] : 0;
    tempogramValues[i] = averaged;
    if (averaged > maxValue) maxValue = averaged;
  }

  if (tempogramValues.length > 0) {
    const weighted = new Float32Array(tempogramValues.length);
    let weightedMax = 0;

    for (let i = 0; i < tempogramValues.length; i += 1) {
      const lag = minLag + i;
      let value = tempogramValues[i];
      const doubleIdx = Math.round(lag / 2 - minLag);
      const halfIdx = Math.round(lag * 2 - minLag);
      if (doubleIdx >= 0 && doubleIdx < tempogramValues.length) {
        value += 0.5 * tempogramValues[doubleIdx];
      }
      if (halfIdx >= 0 && halfIdx < tempogramValues.length) {
        value += 0.25 * tempogramValues[halfIdx];
      }
      weighted[i] = value;
      if (value > weightedMax) weightedMax = value;
    }

    if (weightedMax > 0) {
      for (let i = 0; i < weighted.length; i += 1) {
        weighted[i] /= weightedMax;
      }
    }

    return {
      tempogram: weighted,
      shape: [lagCount, 1],
      tempos,
      method,
    };
  }

  return {
    tempogram: tempogramValues,
    shape: [lagCount, 1],
    tempos,
    method,
  };
}
