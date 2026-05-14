import { createCoreComponentRegistry } from "@viz-engine/components-core";
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from "@viz-engine/example-projects";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import { renderVizRenderPlanToSvgMarkup } from "@viz-engine/renderer-svg";
import { createVizRenderPlan, createVizRuntimeSession } from "@viz-engine/runtime";
import { describe, expect, it } from "vitest";

describe("Viz SVG proof renderer", () => {
  it("renders a deterministic SVG document from the shared render plan", () => {
    const session = createVizRuntimeSession({
      project: exampleProjectDocument,
      mode: "render",
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: "svg-seed",
    });

    const renderPlan = createVizRenderPlan({
      session,
      frame: 36,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
    });

    const markup = renderVizRenderPlanToSvgMarkup(renderPlan);

    expect(markup.startsWith("<svg")).toBe(true);
    expect(markup.includes("data-layer-id=\"layer-background\"")).toBe(true);
    expect(markup.includes("data-layer-id=\"layer-cover\"")).toBe(true);
    expect(markup.includes("data-layer-id=\"layer-bars\"")).toBe(true);
    expect(markup.includes("data-layer-id=\"layer-bloom\"")).toBe(true);
    expect(markup.includes("<image ")).toBe(true);
  });
});
