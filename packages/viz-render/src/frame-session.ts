import type { VizRenderRequest, VizRuntimeInputs } from '@viz-engine/contracts';
import {
  createVizRenderPlan,
  createVizRuntimeSession,
  type VizComponentRegistry,
  type VizNodeRegistry,
} from '@viz-engine/runtime';
import type { VizRenderSource } from './index.js';

/** Offline evaluation owns history and explicit inputs, never editor gestures. */
export const createVizRenderFrameSession = ({
  source,
  request,
  registry,
  nodeRegistry,
  runtimeInputProvider,
  seed,
}: {
  seed?: string;
  source: VizRenderSource;
  request: VizRenderRequest;
  registry: VizComponentRegistry;
  nodeRegistry: VizNodeRegistry;
  runtimeInputProvider: (frame: number) => VizRuntimeInputs | undefined;
}) => {
  const snapshot = structuredClone(source);
  const lastFrame =
    request.kind === 'still'
      ? request.frame
      : request.kind === 'contact-sheet'
        ? Math.max(...request.frames)
        : request.startFrame +
          Math.round(
            ((request.frameCount - 1) * snapshot.project.timeline.fps) /
              request.fps,
          );
  const project = {
    ...snapshot.project,
    viewport: { ...snapshot.project.viewport, ...request.viewport },
    timeline: {
      ...snapshot.project.timeline,
      durationInFrames: Math.max(
        snapshot.project.timeline.durationInFrames,
        lastFrame + 1,
      ),
    },
  };
  const session = createVizRuntimeSession({
    project,
    mode: 'render',
    ...(seed === undefined ? {} : { seed }),
    resolvedAssets: snapshot.resolvedAssets,
    resolvedArtifacts: snapshot.resolvedArtifacts,
  });
  return {
    evaluate(frame: number) {
      if (
        !Number.isInteger(frame) ||
        frame < 0 ||
        frame >= project.timeline.durationInFrames
      ) {
        throw new Error(
          `Frame ${frame} is outside the render session timeline.`,
        );
      }
      const runtimeInputs = runtimeInputProvider(frame);
      return createVizRenderPlan({
        session,
        frame,
        registry,
        nodeRegistry,
        runtimeInputProvider,
        ...(runtimeInputs === undefined ? {} : { runtimeInputs }),
      });
    },
  };
};
