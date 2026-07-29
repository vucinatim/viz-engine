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

  it("renders portable polylines with round strokes and a glow pass", () => {
    const renderPlan: VizRenderPlan = {
      frameContext: {
        frame: 2,
        fps: 60,
        durationInFrames: 120,
        timeInSeconds: 2 / 60,
        deltaTimeSeconds: 1 / 60,
        isFirstFrame: false,
        isLastFrame: false,
        mode: "render",
        seed: "polyline-node",
      },
      viewport: { width: 640, height: 360 },
      materializedAssets: [],
      issues: [],
      layers: [
        {
          layerId: "polyline-layer",
          componentId: "polyline-proof",
          rendererFamily: "three",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          resolvedInputs: {},
          node: {
            kind: "polyline",
            points: [
              { x: 0, y: 180 },
              { x: 1, y: 120 },
              { x: 2, y: 220 },
            ],
            lineCap: "round",
            lineJoin: "round",
            style: {
              stroke: "#34d399",
              strokeWidth: 2,
            },
            glow: {
              color: "#34d399",
              blur: 10,
              opacity: 0.18,
            },
          },
        },
      ],
    };

    const markup = renderVizRenderPlanToSvgMarkup(renderPlan);

    expect(markup.match(/<polyline /g)).toHaveLength(2);
    expect(markup).toContain('stroke-width="22"');
    expect(markup).toContain('stroke-linecap="round"');
    expect(markup).toContain("points=\"0,180 1,120 2,220\"");
  });
});
