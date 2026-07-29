import type {
  VizSessionRuntimePreviewFrame,
  VizSessionRuntimePreviewMode,
} from './types';

export const createVizSessionRuntimePreviewFrame = ({
  currentFrame,
  time,
  dt,
  fps,
  mode,
}: {
  currentFrame: number;
  time: number;
  dt: number;
  fps: number;
  mode: VizSessionRuntimePreviewMode;
}): VizSessionRuntimePreviewFrame => ({
  currentFrame,
  time,
  dt,
  fps,
  mode,
});
