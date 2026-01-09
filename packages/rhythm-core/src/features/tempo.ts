import { TempoOptions, TempoResult } from '../utils/types';
import { tempogram } from './tempogram';

export function tempo(
  onsetEnv: Float32Array,
  options: TempoOptions = {},
): TempoResult {
  const tempogramResult = tempogram(onsetEnv, options);

  return {
    tempo: 0,
    candidates: tempogramResult.tempos,
  };
}
