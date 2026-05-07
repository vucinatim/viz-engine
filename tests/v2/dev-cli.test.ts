import { describe, expect, it } from "vitest";
import { inspectExampleFrame, validateExampleProject } from "@viz-engine/dev-cli";

describe("Viz local-first CLI surface", () => {
  it("validates the canonical example project", () => {
    const output = validateExampleProject();

    expect(output.ok).toBe(true);
    expect(output.command).toBe("example validate");
  });

  it("inspects a deterministic example frame", () => {
    const output = inspectExampleFrame(18);
    const payload = output.payload as {
      frameContext: { frame: number };
      layers: Array<{ layerId: string }>;
    };

    expect(output.ok).toBe(true);
    expect(payload.frameContext.frame).toBe(18);
    expect(payload.layers.map((layer) => layer.layerId)).toEqual([
      "layer-background",
      "layer-bars",
      "layer-bloom",
    ]);
  });
});
