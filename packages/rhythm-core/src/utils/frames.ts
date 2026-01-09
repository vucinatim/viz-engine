export function framesToTime(
  frames: Float32Array | number[],
  sr: number,
  hopLength: number,
): Float32Array {
  const out = new Float32Array(frames.length);
  const scale = hopLength / sr;
  for (let i = 0; i < frames.length; i += 1) {
    out[i] = frames[i] * scale;
  }
  return out;
}

export function timeToFrames(
  times: Float32Array | number[],
  sr: number,
  hopLength: number,
): Float32Array {
  const out = new Float32Array(times.length);
  const scale = sr / hopLength;
  for (let i = 0; i < times.length; i += 1) {
    out[i] = Math.round(times[i] * scale);
  }
  return out;
}
