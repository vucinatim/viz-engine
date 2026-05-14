import {
  exampleResolvedAssets,
} from "@viz-engine/example-projects";
import { materializeVizResolvedAssets } from "@viz-engine/runtime";
import { describe, expect, it } from "vitest";

describe("Viz asset materialization", () => {
  it("creates renderer-consumable materialized assets from resolved assets", () => {
    const materializedAssets = materializeVizResolvedAssets(exampleResolvedAssets);

    expect(materializedAssets).toHaveLength(2);
    expect(materializedAssets[0]).toMatchObject({
      id: "asset-audio-main",
      kind: "audio",
      audioSourceUri: "memory://assets/main-song.mp3",
    });
    expect(materializedAssets[1]).toMatchObject({
      id: "asset-image-cover",
      kind: "image",
      imageSourceUri: expect.stringContaining("data:image/svg+xml"),
      width: 720,
      height: 720,
    });
  });
});
