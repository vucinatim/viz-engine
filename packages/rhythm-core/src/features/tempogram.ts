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
  _onsetEnv: Float32Array,
  options: TempogramOptions = {},
): TempogramResult {
  const method = options.method ?? DEFAULT_TEMPOGRAM_OPTIONS.method;

  return {
    tempogram: new Float32Array(0),
    shape: [0, 0],
    tempos: new Float32Array(0),
    method,
  };
}
