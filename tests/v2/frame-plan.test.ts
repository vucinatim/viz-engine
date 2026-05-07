import { exampleComponents, exampleProjectDocument, exampleResolvedArtifacts } from "@viz-engine/example-projects";
import { createVizComponentRegistry, createVizFramePlan, createVizRuntimeSession } from "@viz-engine/runtime";
import { describe, expect, it } from "vitest";

describe("Viz frame planning", () => {
  it("resolves artifact-backed inputs into a deterministic layer frame plan", () => {
    const session = createVizRuntimeSession({
      project: exampleProjectDocument,
      mode: "render",
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: "test-seed",
    });

    const registry = createVizComponentRegistry(exampleComponents);
    const framePlan = createVizFramePlan({
      session,
      frame: 36,
      registry,
    });

    expect(framePlan.issues).toHaveLength(0);
    expect(framePlan.layers).toHaveLength(3);
    expect(framePlan.frameContext.frame).toBe(36);

    const reactiveBarsLayer = framePlan.layers.find((layer) => layer.layerId === "layer-bars");

    expect(reactiveBarsLayer?.componentName).toBe("Reactive Bars");
    expect(reactiveBarsLayer?.resolvedInputs.bass.status).toBe("resolved");
    expect(typeof reactiveBarsLayer?.resolvedInputs.bass.value).toBe("number");
    expect(typeof reactiveBarsLayer?.resolvedInputs.loudness.value).toBe("number");
  });
});
