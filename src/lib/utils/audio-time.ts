const VISUAL_TIME_OFFSET = 0;

export const getVisualTime = (
  rawTime: number,
  audioContext: AudioContext | null,
) => {
  const latency =
    (audioContext?.baseLatency || 0) + (audioContext?.outputLatency || 0);
  return Math.max(0, rawTime - latency - VISUAL_TIME_OFFSET);
};
