import type {
  VizComponentFrameContext,
  VizComponentImplementation,
  VizFramePlanIssue,
  VizLayerFrameSnapshot,
  VizLayerRenderPlanEntry,
  VizRenderPlan,
  VizRuntimeInputs,
} from '@viz-engine/contracts';
import type { VizComponentRegistry } from './component-registry.js';
import { resolveVizComponentSettings } from './component-settings.js';
import type {
  VizRuntimeFrameInputValues,
  VizRuntimeLayerValues,
} from './frame-plan.js';
import { createVizFramePlan } from './frame-plan.js';
import type {
  VizRuntimeGraphInputValues,
  VizRuntimeGraphValues,
} from './graph-evaluator.js';
import type { VizNodeRegistry } from './node-registry.js';
import type { VizRuntimeSession } from './runtime-session.js';

export interface CreateVizRenderPlanOptions {
  session: VizRuntimeSession;
  frame: number;
  registry: VizComponentRegistry;
  nodeRegistry?: VizNodeRegistry;
  inputValues?: VizRuntimeFrameInputValues;
  layerValues?: VizRuntimeLayerValues;
  graphInputValues?: VizRuntimeGraphInputValues;
  graphValues?: VizRuntimeGraphValues;
  runtimeInputs?: VizRuntimeInputs;
  runtimeInputProvider?: (frame: number) => VizRuntimeInputs | undefined;
}

const createRenderIssue = (
  code: VizFramePlanIssue['code'],
  layerId: string,
  message: string,
): VizFramePlanIssue => ({
  code,
  layerId,
  inputKey: '__render__',
  message,
});

const mergeUniqueIssues = (
  target: VizFramePlanIssue[],
  source: VizFramePlanIssue[],
): void => {
  const seen = new Set(
    target.map((issue) =>
      JSON.stringify([
        issue.code,
        issue.layerId,
        issue.inputKey,
        issue.message,
      ]),
    ),
  );

  for (const issue of source) {
    const key = JSON.stringify([
      issue.code,
      issue.layerId,
      issue.inputKey,
      issue.message,
    ]);

    if (!seen.has(key)) {
      seen.add(key);
      target.push(issue);
    }
  }
};

const createComponentFrameContext = ({
  componentLayer,
  frameLayer,
  frameContext,
  session,
}: {
  componentLayer: VizRuntimeLayerValues[string];
  frameLayer: VizLayerFrameSnapshot;
  frameContext: VizComponentFrameContext['frameContext'];
  session: VizRuntimeSession;
}): VizComponentFrameContext => {
  const layerSettings = frameLayer.settings ?? componentLayer.settings;
  return {
    frameContext,
    viewport: session.project.viewport,
    layer:
      layerSettings === undefined || layerSettings === componentLayer.settings
        ? componentLayer
        : { ...componentLayer, settings: layerSettings },
    settings: resolveVizComponentSettings(
      layerSettings,
      frameLayer.resolvedInputs,
    ),
    resolvedInputs: frameLayer.resolvedInputs,
    materializedAssets: session.getMaterializedAssetMap(),
  };
};

export const createVizRenderPlan = ({
  session,
  frame,
  registry,
  nodeRegistry,
  inputValues,
  layerValues,
  graphInputValues,
  graphValues,
  runtimeInputs,
  runtimeInputProvider,
}: CreateVizRenderPlanOptions): VizRenderPlan => {
  const targetFrame = session.getFrameContext(frame).frame;
  const usesRuntimeAudio =
    (session.project.graphs?.length ?? 0) > 0 ||
    session.project.layers.some((layer) =>
      registry
        .get(layer.componentId)
        ?.inputs?.some((input) => input.runtimeBinding !== undefined),
    );
  const missingRuntimeInputFrames = new Set<number>();
  if (runtimeInputs !== undefined) {
    session.setRuntimeInputs(targetFrame, runtimeInputs);
  }
  const resolveRuntimeInputs = (
    requestedFrame: number,
  ): VizRuntimeInputs | undefined => {
    const inputs =
      runtimeInputProvider?.(requestedFrame) ??
      (requestedFrame === targetFrame ? runtimeInputs : undefined) ??
      session.getRuntimeInputs(requestedFrame);
    if (
      inputs === undefined &&
      requestedFrame !== targetFrame &&
      runtimeInputs?.audio?.provenance === 'live' &&
      usesRuntimeAudio
    ) {
      missingRuntimeInputFrames.add(requestedFrame);
    }
    return inputs;
  };
  const framePlanCache = new Map<
    number,
    ReturnType<typeof createVizFramePlan>
  >();
  const getFramePlan = (requestedFrame: number) => {
    const normalizedFrame = session.getFrameContext(requestedFrame).frame;
    const cached = framePlanCache.get(normalizedFrame);

    if (cached) {
      return cached;
    }

    const requestedRuntimeInputs = resolveRuntimeInputs(normalizedFrame);
    const nextFramePlan = createVizFramePlan({
      session,
      frame: normalizedFrame,
      registry,
      ...(nodeRegistry === undefined ? {} : { nodeRegistry }),
      ...(inputValues === undefined ? {} : { inputValues }),
      ...(layerValues === undefined ? {} : { layerValues }),
      ...(graphInputValues === undefined ? {} : { graphInputValues }),
      ...(graphValues === undefined ? {} : { graphValues }),
      ...(requestedRuntimeInputs === undefined
        ? {}
        : { runtimeInputs: requestedRuntimeInputs }),
      runtimeInputProvider: resolveRuntimeInputs,
    });
    framePlanCache.set(normalizedFrame, nextFramePlan);
    return nextFramePlan;
  };
  const framePlan = getFramePlan(frame);

  const projectLayersById = new Map(
    session.project.layers.map((layer) => [
      layer.id,
      layerValues?.[layer.id] ?? layer,
    ]),
  );
  const issues = [...framePlan.issues];
  const canStoreTemporalCheckpoints =
    Object.keys(layerValues ?? {}).length === 0 &&
    Object.keys(graphValues ?? {}).length === 0 &&
    graphInputValues === undefined;

  const resolveTemporalState = ({
    component,
    projectLayer,
  }: {
    component: VizComponentImplementation;
    projectLayer: VizRuntimeLayerValues[string];
  }): unknown => {
    if (!component.temporal) {
      return undefined;
    }

    const targetFrame = framePlan.frameContext.frame;
    const checkpointFrame = canStoreTemporalCheckpoints
      ? targetFrame
      : targetFrame - 1;
    const checkpoint =
      checkpointFrame < 0
        ? undefined
        : session.getComponentCheckpointBeforeOrAt(
            projectLayer.id,
            component.id,
            component.implementationVersion,
            checkpointFrame,
          );
    if (canStoreTemporalCheckpoints && checkpoint?.frame === targetFrame) {
      return checkpoint.state;
    }

    let state = checkpoint?.state;
    const firstFrame = checkpoint ? checkpoint.frame + 1 : 0;
    const checkpointInterval = session.getComponentCheckpointIntervalFrames();

    for (
      let steppedFrame = firstFrame;
      steppedFrame <= targetFrame;
      steppedFrame += 1
    ) {
      const steppedPlan = getFramePlan(steppedFrame);
      mergeUniqueIssues(issues, steppedPlan.issues);
      const steppedLayer = steppedPlan.layers.find(
        (candidate) => candidate.layerId === projectLayer.id,
      );
      if (!steppedLayer) {
        throw new Error(
          `Temporal component "${component.id}" could not resolve layer "${projectLayer.id}" at frame ${steppedFrame}.`,
        );
      }
      const context = createComponentFrameContext({
        componentLayer: projectLayer,
        frameLayer: steppedLayer,
        frameContext: steppedPlan.frameContext,
        session,
      });
      state = component.temporal.step(context, state);

      if (
        canStoreTemporalCheckpoints &&
        (steppedFrame === targetFrame ||
          steppedFrame % checkpointInterval === 0)
      ) {
        session.setComponentCheckpoint({
          layerId: projectLayer.id,
          componentId: component.id,
          ...(component.implementationVersion === undefined
            ? {}
            : { implementationVersion: component.implementationVersion }),
          frame: steppedFrame,
          state,
        });
      }
    }

    return state;
  };

  const layers: VizLayerRenderPlanEntry[] = framePlan.layers.map(
    (frameLayer) => {
      const component = registry.get(frameLayer.componentId);
      const projectLayer = projectLayersById.get(frameLayer.layerId);

      if (!component || !projectLayer) {
        issues.push(
          createRenderIssue(
            'missing-component',
            frameLayer.layerId,
            `Missing executable component "${frameLayer.componentId}" for layer "${frameLayer.layerId}".`,
          ),
        );

        return frameLayer;
      }

      try {
        const context = createComponentFrameContext({
          componentLayer: projectLayer,
          frameLayer,
          frameContext: framePlan.frameContext,
          session,
        });
        const temporalState = resolveTemporalState({
          component,
          projectLayer,
        });
        const node = component.render({
          ...context,
          ...(component.temporal ? { temporalState } : {}),
        });

        return {
          ...frameLayer,
          resolvedSettings: context.settings,
          node,
        };
      } catch (error) {
        issues.push(
          createRenderIssue(
            'component-render-failed',
            frameLayer.layerId,
            error instanceof Error
              ? error.message
              : `Unknown render failure in component "${frameLayer.componentId}".`,
          ),
        );

        return frameLayer;
      }
    },
  );

  if (missingRuntimeInputFrames.size > 0) {
    const missingFrames = [...missingRuntimeInputFrames].sort(
      (left, right) => left - right,
    );
    issues.push(
      createRenderIssue(
        'temporal-input-unavailable',
        '__runtime__',
        `Live temporal input is unavailable for frames ${missingFrames[0]}-${missingFrames.at(-1)}; evaluation resumed from an explicit input discontinuity instead of fabricating historical audio.`,
      ),
    );
  }

  return {
    frameContext: framePlan.frameContext,
    viewport: session.project.viewport,
    materializedAssets: [...session.getMaterializedAssetMap().values()],
    graphResults: framePlan.graphResults,
    layers,
    issues,
  };
};
