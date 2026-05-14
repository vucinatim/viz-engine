import { createCoreComponentRegistry } from "@viz-engine/components-core";
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from "@viz-engine/example-projects";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import {
  createVizRemotionCompositionConfig,
  createVizRemotionFrameState,
  createVizRemotionRenderPlan,
  createVizRemotionSvgMarkup,
} from "@viz-engine/remotion-adapter";
import { describe, expect, it } from "vitest";

describe("Viz Remotion adapter", () => {
  it("derives a composition config from the canonical project document", () => {
    const composition = createVizRemotionCompositionConfig(exampleProjectDocument);

    expect(composition.id).toBe(exampleProjectDocument.projectId);
    expect(composition.width).toBe(exampleProjectDocument.viewport.width);
    expect(composition.height).toBe(exampleProjectDocument.viewport.height);
    expect(composition.fps).toBe(exampleProjectDocument.timeline.fps);
  });

  it("creates a deterministic frame state shell for Remotion mounting", () => {
    const frameState = createVizRemotionFrameState({
      project: exampleProjectDocument,
      frame: 12,
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: "remotion-seed",
    });

    expect(frameState.frameContext.frame).toBe(12);
    expect(frameState.frameContext.seed).toBe("remotion-seed");
    expect(frameState.layers).toHaveLength(4);
  });

  it("creates the same runtime-backed render plan for Remotion", () => {
    const renderPlan = createVizRemotionRenderPlan({
      project: exampleProjectDocument,
      frame: 12,
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
      seed: "remotion-seed",
    });

    expect(renderPlan.issues).toHaveLength(0);
    expect(renderPlan.layers).toHaveLength(4);
    expect(renderPlan.materializedAssets).toHaveLength(2);
    expect(renderPlan.layers[1]?.node?.kind).toBe("group");
  });

  it("produces proof-level SVG markup for Remotion consumption", () => {
    const svgMarkup = createVizRemotionSvgMarkup({
      project: exampleProjectDocument,
      frame: 12,
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
      seed: "remotion-seed",
    });

    expect(svgMarkup.startsWith("<svg")).toBe(true);
    expect(svgMarkup.includes("data-layer-id=\"layer-cover\"")).toBe(true);
    expect(svgMarkup.includes("data-layer-id=\"layer-bars\"")).toBe(true);
  });
});
