import type { AudioSignal, MonoSignal } from '../utils/types.js';

export function toMono(signal: AudioSignal): MonoSignal {
  if (signal instanceof Float32Array) return signal;
  const [left, right] = signal;
  const len = Math.min(left.length, right.length);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i += 1) {
    out[i] = 0.5 * (left[i]! + right[i]!);
  }
  return out;
}
