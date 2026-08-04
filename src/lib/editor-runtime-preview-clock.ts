const FRAME_DEADLINE_TOLERANCE_MILLISECONDS = 1;

export const MAX_LIVE_PREVIEW_FRAME_GAP = 8;

export const isEditorPreviewFrameDue = (
  now: number,
  deadline: number,
): boolean => now + FRAME_DEADLINE_TOLERANCE_MILLISECONDS >= deadline;

export const advanceEditorPreviewFrameDeadline = (
  now: number,
  deadline: number,
  interval: number,
): number => {
  const missedIntervals = Math.max(
    1,
    Math.floor((now - deadline) / interval) + 1,
  );
  return deadline + missedIntervals * interval;
};

export const resolveMediaSynchronizedPreviewFrame = (
  currentFrame: number,
  mediaFrame: number,
): number => {
  const frameDelta = mediaFrame - currentFrame;
  if (Math.abs(frameDelta) > MAX_LIVE_PREVIEW_FRAME_GAP) {
    return mediaFrame;
  }

  return mediaFrame >= currentFrame ? currentFrame + 1 : currentFrame;
};
