export interface FftResult {
  real: Float32Array;
  imag: Float32Array;
}

export interface FftBackend {
  forward: (real: Float32Array, imag?: Float32Array) => FftResult;
}

export function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

export function nextPowerOfTwo(value: number): number {
  if (value <= 1) return 1;
  let power = 1;
  while (power < value) power <<= 1;
  return power;
}

export function fftRadix2(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  if (n !== imag.length) {
    throw new Error('FFT input arrays must have the same length.');
  }
  if (!isPowerOfTwo(n)) {
    throw new Error('FFT length must be a power of two.');
  }

  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;

    if (i < j) {
      const tempReal = real[i]!;
      const tempImag = imag[i]!;
      real[i] = real[j]!;
      imag[i] = imag[j]!;
      real[j] = tempReal;
      imag[j] = tempImag;
    }
  }

  for (let size = 2; size <= n; size <<= 1) {
    const halfSize = size >> 1;
    const tableStep = n / size;
    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < halfSize; j += 1) {
        const k = j * tableStep;
        const angle = (-2 * Math.PI * k) / n;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const off = i + j + halfSize;
        const treal = real[off]! * cos - imag[off]! * sin;
        const timag = real[off]! * sin + imag[off]! * cos;

        const on = i + j;
        real[off] = real[on]! - treal;
        imag[off] = imag[on]! - timag;
        real[on] = real[on]! + treal;
        imag[on] = imag[on]! + timag;
      }
    }
  }
}

export const jsFftBackend: FftBackend = {
  forward: (realInput, imagInput) => {
    const real = imagInput ? realInput : new Float32Array(realInput);
    const imag = imagInput ? imagInput : new Float32Array(real.length);
    fftRadix2(real, imag);
    return { real, imag };
  },
};
