import type { BeatTrackOptions, BeatTrackResult } from '../utils/types.js';
import { tempo } from './tempo.js';

export function beatTrack(
  onsetEnv: Float32Array,
  options: BeatTrackOptions = {},
): BeatTrackResult {
  const tempoBpm = options.tempo ?? tempo(onsetEnv, options).tempo;
  const sr = options.sr ?? 22050;
  const hopLength = options.hopLength ?? 512;
  const optimizePhase = options.optimizePhase ?? true;
  const requestedPhase = options.phaseOffset ?? 0;

  if (!onsetEnv.length || tempoBpm <= 0) {
    return {
      tempo: tempoBpm,
      beats: new Float32Array(0),
      confidence: 0,
    };
  }

  const periodFrames = (60 * sr) / (hopLength * tempoBpm);
  if (!Number.isFinite(periodFrames) || periodFrames <= 0) {
    return {
      tempo: tempoBpm,
      beats: new Float32Array(0),
      confidence: 0,
    };
  }

  const maxPhase = Math.max(1, Math.floor(periodFrames));
  let bestPhase = Math.max(0, Math.min(maxPhase - 1, requestedPhase));
  let bestSum = -Infinity;

  const totalEnergy = onsetEnv.reduce((acc, value) => acc + value, 0);

  const evaluatePhase = (phase: number) => {
    let sum = 0;
    let lastIndex = -1;
    for (let k = 0; ; k += 1) {
      const idx = Math.round(phase + k * periodFrames);
      if (idx >= onsetEnv.length) break;
      if (idx === lastIndex) continue;
      lastIndex = idx;
      sum += onsetEnv[idx]!;
    }
    return sum;
  };

  if (optimizePhase) {
    for (let phase = 0; phase < maxPhase; phase += 1) {
      const sum = evaluatePhase(phase);
      if (sum > bestSum) {
        bestSum = sum;
        bestPhase = phase;
      }
    }
  } else {
    bestSum = evaluatePhase(bestPhase);
  }

  const beatFrames: number[] = [];
  let lastIndex = -1;
  for (let k = 0; ; k += 1) {
    const idx = Math.round(bestPhase + k * periodFrames);
    if (idx >= onsetEnv.length) break;
    if (idx === lastIndex) continue;
    lastIndex = idx;
    beatFrames.push(idx);
  }

  const beats = new Float32Array(beatFrames);
  const beatsTimes = new Float32Array(
    beatFrames.map((frame) => (frame * hopLength) / sr),
  );
  const confidence = totalEnergy > 0 ? bestSum / totalEnergy : 0;

  return {
    tempo: tempoBpm,
    beats,
    beatsTimes,
    phaseOffset: bestPhase,
    periodFrames,
    confidence,
  };
}
