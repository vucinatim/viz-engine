import { stft } from '../core/stft';
import { framesToTime } from '../utils/frames';
import {
  AnalysisOptions,
  OnsetStrengthOptions,
  OnsetStrengthResult,
} from '../utils/types';

export const DEFAULT_ONSET_OPTIONS: Required<
  Pick<
    OnsetStrengthOptions,
    'sr' | 'hopLength' | 'aggregate' | 'logCompression' | 'nFft' | 'winLength'
  >
> = {
  sr: 22050,
  hopLength: 512,
  nFft: 2048,
  winLength: 2048,
  aggregate: 'mean',
  logCompression: true,
};

export function onsetStrength(
  y: Float32Array,
  options: OnsetStrengthOptions = {},
): OnsetStrengthResult {
  const sr = options.sr ?? DEFAULT_ONSET_OPTIONS.sr;
  const hopLength = options.hopLength ?? DEFAULT_ONSET_OPTIONS.hopLength;
  const nFft = options.nFft ?? DEFAULT_ONSET_OPTIONS.nFft;
  const winLength = options.winLength ?? DEFAULT_ONSET_OPTIONS.winLength;
  const aggregate = options.aggregate ?? DEFAULT_ONSET_OPTIONS.aggregate;
  const logCompression =
    options.logCompression ?? DEFAULT_ONSET_OPTIONS.logCompression;

  const stftOptions: AnalysisOptions = {
    nFft,
    hopLength,
    winLength,
    window: options.window,
    center: options.center,
  };
  const { real, imag, shape } = stft(y, stftOptions);
  const [nBins, nFrames] = shape;
  const onsetEnv = new Float32Array(nFrames);
  const scratch = aggregate === 'median' ? new Float32Array(nBins) : null;

  for (let frame = 1; frame < nFrames; frame += 1) {
    const currentOffset = frame * nBins;
    const prevOffset = (frame - 1) * nBins;
    let sum = 0;
    let max = 0;
    let count = 0;

    for (let bin = 0; bin < nBins; bin += 1) {
      const r = real[currentOffset + bin];
      const im = imag[currentOffset + bin];
      const pr = real[prevOffset + bin];
      const pim = imag[prevOffset + bin];
      const mag = Math.hypot(r, im);
      const prevMag = Math.hypot(pr, pim);
      const diff = mag - prevMag;
      if (diff > 0) {
        sum += diff;
        if (diff > max) max = diff;
        if (scratch) scratch[count++] = diff;
      }
    }

    let value = 0;
    if (aggregate === 'max') {
      value = max;
    } else if (aggregate === 'median') {
      if (count > 0 && scratch) {
        const values = Array.from(scratch.subarray(0, count));
        values.sort((a, b) => a - b);
        value = values[Math.floor(values.length / 2)];
      }
    } else {
      value = nBins > 0 ? sum / nBins : 0;
    }

    onsetEnv[frame] = logCompression ? Math.log1p(value) : value;
  }

  const frameIndices = new Float32Array(nFrames);
  for (let i = 0; i < nFrames; i += 1) {
    frameIndices[i] = i;
  }
  const times = framesToTime(frameIndices, sr, hopLength);

  return {
    onsetEnv,
    times,
    sr,
    hopLength,
  };
}
