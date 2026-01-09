export interface FrameResult {
  frames: Float32Array;
  frameCount: number;
  frameLength: number;
  hopLength: number;
}

function padCentered(y: Float32Array, pad: number): Float32Array {
  if (pad <= 0) return y;
  const out = new Float32Array(y.length + pad * 2);
  out.set(y, pad);
  return out;
}

export function frame(
  y: Float32Array,
  frameLength: number,
  hopLength: number,
  center = true,
): FrameResult {
  const pad = center ? Math.floor(frameLength / 2) : 0;
  const padded = padCentered(y, pad);
  const frameCount =
    padded.length < frameLength
      ? 0
      : Math.floor((padded.length - frameLength) / hopLength) + 1;
  const frames = new Float32Array(frameCount * frameLength);

  for (let i = 0; i < frameCount; i += 1) {
    const frameStart = i * hopLength;
    const outOffset = i * frameLength;
    frames.set(
      padded.subarray(frameStart, frameStart + frameLength),
      outOffset,
    );
  }

  return {
    frames,
    frameCount,
    frameLength,
    hopLength,
  };
}
