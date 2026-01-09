import { frame } from './frame';
import { jsFftBackend, nextPowerOfTwo, isPowerOfTwo } from './fft';
import { getWindow } from './window';
import { AnalysisOptions } from '../utils/types';

export interface ComplexMatrix {
  real: Float32Array;
  imag: Float32Array;
  shape: [number, number];
}

export interface StftResult extends ComplexMatrix {
  nFft: number;
  hopLength: number;
  winLength: number;
}

export const DEFAULT_STFT_OPTIONS: Required<Pick<AnalysisOptions, 'nFft' | 'hopLength' | 'winLength'>> = {
  nFft: 2048,
  hopLength: 512,
  winLength: 2048,
};

export function stft(
  y: Float32Array,
  options: AnalysisOptions = {},
): StftResult {
  const requestedFft = options.nFft ?? DEFAULT_STFT_OPTIONS.nFft;
  const nFft = isPowerOfTwo(requestedFft)
    ? requestedFft
    : nextPowerOfTwo(requestedFft);
  const hopLength = options.hopLength ?? DEFAULT_STFT_OPTIONS.hopLength;
  const winLength = options.winLength ?? DEFAULT_STFT_OPTIONS.winLength;
  const center = options.center ?? true;
  const windowType = options.window ?? 'hann';

  const framed = frame(y, winLength, hopLength, center);
  const frameCount = framed.frameCount;
  const nBins = nFft;
  const real = new Float32Array(frameCount * nBins);
  const imag = new Float32Array(frameCount * nBins);
  const window = getWindow(windowType, winLength);
  const tempReal = new Float32Array(nFft);
  const tempImag = new Float32Array(nFft);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    tempReal.fill(0);
    tempImag.fill(0);
    const frameOffset = frameIndex * winLength;
    for (let i = 0; i < winLength; i += 1) {
      tempReal[i] = framed.frames[frameOffset + i] * window[i];
    }

    const { real: outReal, imag: outImag } = jsFftBackend.forward(
      tempReal,
      tempImag,
    );

    const outOffset = frameIndex * nBins;
    real.set(outReal, outOffset);
    imag.set(outImag, outOffset);
  }

  return {
    real,
    imag,
    shape: [nBins, frameCount],
    nFft,
    hopLength,
    winLength,
  };
}
