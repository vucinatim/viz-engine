import type {
  VizFramePlanIssue,
  VizLayerRenderPlanEntry,
  VizRenderPlan,
} from "@viz-engine/contracts";
import { createVizFramePlan } from "./frame-plan.js";
import type { VizComponentRegistry } from "./component-registry.js";
import type { VizNodeRegistry } from "./node-registry.js";
import type { VizRuntimeSession } from "./runtime-session.js";

export interface CreateVizRenderPlanOptions {
  session: VizRuntimeSession;
  frame: number;
  registry: VizComponentRegistry;
  nodeRegistry?: VizNodeRegistry;
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

export const createVizRenderPlan = ({
  session,
  frame,
  registry,
  nodeRegistry,
}: CreateVizRenderPlanOptions): VizRenderPlan => {
  const framePlan = createVizFramePlan({
    session,
    frame,
    registry,
    ...(nodeRegistry === undefined ? {} : { nodeRegistry }),
  });

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
      const node = component.render({
        frameContext: framePlan.frameContext,
        viewport: session.project.viewport,
        layer: projectLayer,
        resolvedInputs: frameLayer.resolvedInputs,
        materializedAssets: session.getMaterializedAssetMap(),
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
