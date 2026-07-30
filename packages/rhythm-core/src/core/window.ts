import type { WindowFunction } from '../utils/types.js';

export function getWindow(
  type: WindowFunction,
  length: number,
): Float32Array {
  const out = new Float32Array(length);
  if (length <= 1) {
    if (length === 1) out[0] = 1;
    return out;
  }

  const denom = length - 1;
  switch (type) {
    case 'hann':
      for (let i = 0; i < length; i += 1) {
        out[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / denom);
      }
      break;
    case 'hamming':
      for (let i = 0; i < length; i += 1) {
        out[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / denom);
      }
      break;
    case 'blackman':
      for (let i = 0; i < length; i += 1) {
        const phase = (2 * Math.PI * i) / denom;
        out[i] =
          0.42 - 0.5 * Math.cos(phase) + 0.08 * Math.cos(2 * phase);
      }
      break;
    case 'rect':
    default:
      out.fill(1);
      break;
  }

  return out;
}
