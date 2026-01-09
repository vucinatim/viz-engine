import { BeatTrackOptions, BeatTrackResult } from '../utils/types';
import { tempo } from './tempo';

export function beatTrack(
  onsetEnv: Float32Array,
  options: BeatTrackOptions = {},
): BeatTrackResult {
  const { tempo: tempoBpm } = tempo(onsetEnv, options);

  return {
    tempo: tempoBpm,
    beats: new Float32Array(0),
    confidence: 0,
  };
}
