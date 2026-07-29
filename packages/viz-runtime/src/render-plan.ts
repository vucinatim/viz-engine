import type {
  VizFramePlanIssue,
  VizLayerRenderPlanEntry,
  VizRenderPlan,
} from "@viz-engine/contracts";
import { createVizFramePlan } from "./frame-plan.js";
import type { VizComponentRegistry } from "./component-registry.js";
import type { VizNodeRegistry } from "./node-registry.js";
import type { VizRuntimeSession } from "./runtime-session.js";
import { resolveVizComponentSettings } from "./component-settings.js";
import type { VizRuntimeFrameInputValues } from "./frame-plan.js";
import type { VizRuntimeGraphInputValues } from "./graph-evaluator.js";

export interface CreateVizRenderPlanOptions {
  session: VizRuntimeSession;
  frame: number;
  registry: VizComponentRegistry;
  nodeRegistry?: VizNodeRegistry;
  inputValues?: VizRuntimeFrameInputValues;
  graphInputValues?: VizRuntimeGraphInputValues;
}

const createRenderIssue = (
  code: VizFramePlanIssue["code"],
  layerId: string,
  message: string,
): VizFramePlanIssue => ({
  code,
  layerId,
  inputKey: "__render__",
  message,
});

const mergeUniqueIssues = (
  target: VizFramePlanIssue[],
  source: VizFramePlanIssue[],
): void => {
  const seen = new Set(
    target.map((issue) =>
      JSON.stringify([issue.code, issue.layerId, issue.inputKey, issue.message]),
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

export const createVizRenderPlan = ({
  session,
  frame,
  registry,
  nodeRegistry,
  inputValues,
  graphInputValues,
}: CreateVizRenderPlanOptions): VizRenderPlan => {
  const framePlanCache = new Map<number, ReturnType<typeof createVizFramePlan>>();
  const getFramePlan = (requestedFrame: number) => {
    const normalizedFrame = session.getFrameContext(requestedFrame).frame;
    const cached = framePlanCache.get(normalizedFrame);

    if (cached) {
      return cached;
    }

    const nextFramePlan = createVizFramePlan({
      session,
      frame: normalizedFrame,
      registry,
      ...(nodeRegistry === undefined ? {} : { nodeRegistry }),
      ...(inputValues === undefined ? {} : { inputValues }),
      ...(graphInputValues === undefined ? {} : { graphInputValues }),
    });
    framePlanCache.set(normalizedFrame, nextFramePlan);
    return nextFramePlan;
  };
  const framePlan = getFramePlan(frame);

  const projectLayersById = new Map(session.project.layers.map((layer) => [layer.id, layer]));
  const issues = [...framePlan.issues];

  const layers: VizLayerRenderPlanEntry[] = framePlan.layers.map((frameLayer) => {
    const component = registry.get(frameLayer.componentId);
    const projectLayer = projectLayersById.get(frameLayer.layerId);

    if (!component || !projectLayer) {
      issues.push(
        createRenderIssue(
          "missing-component",
          frameLayer.layerId,
          `Missing executable component "${frameLayer.componentId}" for layer "${frameLayer.layerId}".`,
        ),
      );

      return frameLayer;
    }

    try {
      const settings = resolveVizComponentSettings(
        projectLayer.settings,
        frameLayer.resolvedInputs,
      );
      const hasTemporalSettingInput = Object.values(
        projectLayer.inputs ?? {},
      ).some(
        (source) =>
          source.kind === "artifact-feature" ||
          (source.kind === "graph-output" && nodeRegistry !== undefined),
      );
      const node = component.render({
        frameContext: framePlan.frameContext,
        viewport: session.project.viewport,
        layer: projectLayer,
        settings,
        resolvedInputs: frameLayer.resolvedInputs,
        materializedAssets: session.getMaterializedAssetMap(),
        sampleSettings: (requestedFrame) => {
          if (!hasTemporalSettingInput) {
            return settings;
          }

          const sampledFramePlan = getFramePlan(requestedFrame);
          mergeUniqueIssues(issues, sampledFramePlan.issues);
          const sampledLayer = sampledFramePlan.layers.find(
            (candidate) => candidate.layerId === projectLayer.id,
          );

          return resolveVizComponentSettings(
            projectLayer.settings,
            sampledLayer?.resolvedInputs ?? {},
          );
        },
      });

      return {
        ...frameLayer,
        node,
      };
    } catch (error) {
      issues.push(
        createRenderIssue(
          "component-render-failed",
          frameLayer.layerId,
          error instanceof Error
            ? error.message
            : `Unknown render failure in component "${frameLayer.componentId}".`,
        ),
      );

      return frameLayer;
    }
  });

  return {
    frameContext: framePlan.frameContext,
    viewport: session.project.viewport,
    materializedAssets: [...session.getMaterializedAssetMap().values()],
    layers,
    issues,
  };
};
