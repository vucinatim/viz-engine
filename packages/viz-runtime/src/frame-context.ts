import type {
  VizExecutionMode,
  VizFrameContext,
  VizTimeline,
} from '@viz-engine/contracts';

export interface CreateFrameContextOptions {
  frame: number;
  timeline: VizTimeline;
  mode: VizExecutionMode;
  seed?: string;
}

export const createFrameContext = ({
  frame,
  timeline,
  mode,
  seed = 'viz-default-seed',
}: CreateFrameContextOptions): VizFrameContext => {
  const normalizedFrame = Math.max(
    0,
    Math.min(frame, timeline.durationInFrames - 1),
  );
  const deltaTimeSeconds = 1 / timeline.fps;

  return {
    frame: normalizedFrame,
    fps: timeline.fps,
    durationInFrames: timeline.durationInFrames,
    timeInSeconds: normalizedFrame / timeline.fps,
    deltaTimeSeconds,
    isFirstFrame: normalizedFrame === 0,
    isLastFrame: normalizedFrame === timeline.durationInFrames - 1,
    mode,
    seed,
  };
};
