import type { VizExecutionMode, VizProjectDocument } from "@viz-engine/contracts";
import { createVizRuntimeSession } from "@viz-engine/runtime";

export interface VizRemotionCompositionConfig {
  id: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}

export interface CreateVizRemotionFrameStateOptions {
  project: VizProjectDocument;
  frame: number;
  mode?: Extract<VizExecutionMode, "render" | "bake">;
  seed?: string;
}

export const createVizRemotionCompositionConfig = (
  project: VizProjectDocument,
): VizRemotionCompositionConfig => {
  return {
    id: project.projectId,
    width: project.viewport.width,
    height: project.viewport.height,
    fps: project.timeline.fps,
    durationInFrames: project.timeline.durationInFrames,
  };
};

export const createVizRemotionFrameState = ({
  project,
  frame,
  mode = "render",
  seed,
}: CreateVizRemotionFrameStateOptions) => {
  const sessionOptions =
    seed === undefined
      ? {
          project,
          mode,
        }
      : {
          project,
          mode,
          seed,
        };

  const session = createVizRuntimeSession(sessionOptions);

  return {
    composition: createVizRemotionCompositionConfig(project),
    frameContext: session.getFrameContext(frame),
    layers: session.getOrderedLayers(),
  };
};
