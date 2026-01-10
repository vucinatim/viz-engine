import { TempoOptions, TempoResult } from '../utils/types';
import { tempogram } from './tempogram';

export function tempo(
  onsetEnv: Float32Array,
  options: TempoOptions = {},
): TempoResult {
  const tempogramResult = tempogram(onsetEnv, options);
  const preferHigher = options.preferHigher ?? true;
  const candidateCount = options.candidateCount ?? 5;
  const dedupeTolerance = options.dedupeTolerance ?? 0.5;
  const snapToHalf = options.snapToHalf ?? true;
  const preferIntegerTolerance = options.preferIntegerTolerance ?? 0;

  const tempogramValues = tempogramResult.tempogram;
  const tempos = tempogramResult.tempos;
  if (!tempogramValues.length || !tempos.length) {
    return { tempo: 0, candidates: new Float32Array(0) };
  }

  const ranked: { bpm: number; value: number; index: number }[] = [];
  for (let i = 0; i < tempogramValues.length; i += 1) {
    ranked.push({ bpm: tempos[i], value: tempogramValues[i], index: i });
  }
  ranked.sort((a, b) => b.value - a.value);

  const unique: { bpm: number; value: number }[] = [];
  for (const candidate of ranked) {
    if (
      unique.some((entry) => Math.abs(entry.bpm - candidate.bpm) <= dedupeTolerance)
    ) {
      continue;
    }
    unique.push(candidate);
    if (unique.length >= candidateCount) break;
  }

  let chosen = unique[0];
  if (preferHigher && chosen) {
    const doubleMatch = unique.find(
      (entry) => Math.abs(entry.bpm - chosen.bpm * 2) <= dedupeTolerance,
    );
    if (doubleMatch && doubleMatch.bpm > chosen.bpm) {
      chosen = doubleMatch;
    }
  }

  let refinedTempo = chosen ? chosen.bpm : 0;
  let refinedRaw = refinedTempo;
  if (chosen && ranked.length > 0) {
    const sampleRate = options.sr ?? 22050;
    const hopLength = options.hopLength ?? 512;
    const minBpm = options.minBpm ?? 30;
    const maxBpm = options.maxBpm ?? 300;
    const minLag = Math.max(
      1,
      Math.round((60 * sampleRate) / (maxBpm * hopLength)),
    );
    const maxLag = Math.max(
      minLag,
      Math.round((60 * sampleRate) / (minBpm * hopLength)),
    );

    const bestIndex = ranked[0]?.index ?? 0;
    let refinedIndex = bestIndex;
    if (bestIndex > 0 && bestIndex < tempogramValues.length - 1) {
      const y0 = tempogramValues[bestIndex - 1];
      const y1 = tempogramValues[bestIndex];
      const y2 = tempogramValues[bestIndex + 1];
      const denom = y0 - 2 * y1 + y2;
      if (denom !== 0) {
        const delta = 0.5 * (y0 - y2) / denom;
        refinedIndex = bestIndex + Math.max(-0.5, Math.min(0.5, delta));
      }
    }
    const lag = Math.min(
      maxLag,
      Math.max(minLag, minLag + refinedIndex),
    );
    const bpm = (60 * sampleRate) / (hopLength * lag);
    refinedRaw = bpm;
    if (snapToHalf) {
      const snapped = Math.round(bpm * 2) / 2;
      const nearestInt = Math.round(bpm);
      const preferInt =
        snapped % 1 !== 0 && Math.abs(bpm - nearestInt) <= preferIntegerTolerance;
      refinedTempo = preferInt ? nearestInt : snapped;
    } else {
      refinedTempo = bpm;
    }
  }

  return {
    tempo: refinedTempo,
    refinedTempo: refinedRaw,
    candidates: new Float32Array(unique.map((entry) => entry.bpm)),
  };
}
