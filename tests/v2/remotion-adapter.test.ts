import { exampleProjectDocument } from "@viz-engine/example-projects";
import { createVizRemotionCompositionConfig, createVizRemotionFrameState } from "@viz-engine/remotion-adapter";
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
      seed: "remotion-seed",
    });

    expect(frameState.frameContext.frame).toBe(12);
    expect(frameState.frameContext.seed).toBe("remotion-seed");
    expect(frameState.layers).toHaveLength(3);
  });
});
