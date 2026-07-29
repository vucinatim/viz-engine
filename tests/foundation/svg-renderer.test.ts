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
import type { VizRenderPlan } from "@viz-engine/contracts";

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

  it("renders portable text nodes with explicit alignment and escaped content", () => {
    const renderPlan: VizRenderPlan = {
      frameContext: {
        frame: 0,
        fps: 30,
        durationInFrames: 1,
        timeInSeconds: 0,
        deltaTimeSeconds: 1 / 30,
        isFirstFrame: true,
        isLastFrame: true,
        mode: "render",
        seed: "text-node",
      },
      viewport: { width: 640, height: 360 },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: "text-layer",
          componentId: "text-proof",
          rendererFamily: "svg",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          resolvedInputs: {},
          node: {
            kind: "text",
            x: 320,
            y: 180,
            text: "Value < 50 & rising",
            fontSize: 24,
            fontFamily: "sans-serif",
            fontWeight: "bold",
            anchor: "middle",
            baseline: "middle",
            style: { fill: "#ffffff" },
          },
        },
      ],
    };

    const markup = renderVizRenderPlanToSvgMarkup(renderPlan);

    expect(markup).toContain("<text ");
    expect(markup).toContain('text-anchor="middle"');
    expect(markup).toContain("Value &lt; 50 &amp; rising");
  });
});
