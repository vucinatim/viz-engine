import { exampleProjectBundleDirectoryUrl } from "@viz-engine/example-projects/node";
import { createCoreComponentRegistry } from "@viz-engine/components-core";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import { createVizRemotionSvgMarkup } from "@viz-engine/remotion-adapter";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyActionsToBundleProject,
  applyActionsToExampleProject,
  exportBundleProject,
  exportExampleBundle,
  inspectBundleFrame,
  inspectExampleFrame,
  loadLocalVizProjectBundle,
  renderBundleSvg,
  validateBundleProject,
  validateExampleProject,
} from "@viz-engine/dev-cli";

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
      "layer-cover",
      "layer-bars",
      "layer-bloom",
    ]);
  });

  it("loads and validates the portable example bundle fixture", () => {
    const loaded = loadLocalVizProjectBundle(exampleProjectBundleDirectoryUrl);
    const output = validateBundleProject(exampleProjectBundleDirectoryUrl);

    expect(loaded.project.projectId).toBe("project-example-reactive-bars");
    expect(loaded.manifest.kind).toBe("viz.project-bundle-manifest.v1");
    expect(loaded.resolvedAssets).toHaveLength(2);
    expect(loaded.resolvedArtifacts).toHaveLength(1);
    expect(loaded.issues).toHaveLength(0);
    expect(output.ok).toBe(true);
    expect(output.command).toBe("bundle validate");
  });

  it("renders a deterministic frame plan from the portable example bundle fixture", () => {
    const output = inspectBundleFrame(exampleProjectBundleDirectoryUrl, 18);
    const payload = output.payload as {
      framePlan: {
        frameContext: { frame: number };
        layers: Array<{ layerId: string }>;
      };
    };

    expect(output.ok).toBe(true);
    expect(payload.framePlan.frameContext.frame).toBe(18);
    expect(payload.framePlan.layers.map((layer) => layer.layerId)).toEqual([
      "layer-background",
      "layer-cover",
      "layer-bars",
      "layer-bloom",
    ]);
  });

  it("renders matching SVG outputs from bundle-backed runtime and remotion paths", () => {
    const loaded = loadLocalVizProjectBundle(exampleProjectBundleDirectoryUrl);
    const svgOutput = renderBundleSvg(exampleProjectBundleDirectoryUrl, 36);
    const svgPayload = svgOutput.payload as { svg: string };
    const remotionSvg = createVizRemotionSvgMarkup({
      project: loaded.project,
      frame: 36,
      resolvedAssets: loaded.resolvedAssets,
      resolvedArtifacts: loaded.resolvedArtifacts,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
      seed: "cli-bundle-seed",
    });

    expect(svgOutput.ok).toBe(true);
    expect(svgPayload.svg).toContain("data-layer-id=\"layer-cover\"");
    expect(svgPayload.svg).toBe(remotionSvg);
  });

  it("exports the in-memory example project into a portable bundle", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "viz-example-bundle-export-"));

    try {
      const output = exportExampleBundle(tempDirectory);
      const loaded = loadLocalVizProjectBundle(tempDirectory);

      expect(output.ok).toBe(true);
      expect(loaded.issues).toHaveLength(0);
      expect(loaded.project.projectId).toBe("project-example-reactive-bars");
      expect(loaded.resolvedAssets).toHaveLength(2);
      expect(loaded.resolvedArtifacts).toHaveLength(1);
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it("roundtrips a loaded portable bundle through export and reload", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "viz-bundle-roundtrip-"));

    try {
      const output = exportBundleProject(exampleProjectBundleDirectoryUrl, tempDirectory);
      const reloaded = loadLocalVizProjectBundle(tempDirectory);
      const svgOutput = renderBundleSvg(tempDirectory, 36);

      expect(output.ok).toBe(true);
      expect(reloaded.issues).toHaveLength(0);
      expect(reloaded.project.graphs).toHaveLength(1);
      expect(svgOutput.ok).toBe(true);
      expect((svgOutput.payload as { svg: string }).svg).toContain("data-layer-id=\"layer-bars\"");
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it("applies canonical project actions to the example project and exports the result", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "viz-example-action-apply-"));

    try {
      const output = applyActionsToExampleProject(
        [
          {
            type: "layer.settings.set",
            payload: {
              layerId: "layer-background",
              path: "color",
              value: "#101e2d",
            },
          },
        ],
        tempDirectory,
      );
      const reloaded = loadLocalVizProjectBundle(tempDirectory);

      expect(output.ok).toBe(true);
      expect(reloaded.issues).toHaveLength(0);
      expect(
        reloaded.project.layers.find((layer) => layer.id === "layer-background")?.settings,
      ).toMatchObject({
        color: "#101e2d",
      });
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it("applies canonical project actions to a portable bundle and keeps it renderable", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "viz-bundle-action-apply-"));

    try {
      const output = applyActionsToBundleProject(
        exampleProjectBundleDirectoryUrl,
        [
          {
            type: "graph.output.set",
            payload: {
              graphId: "graph-main-reactivity",
              output: {
                key: "barsGainAlt",
                nodeId: "node-bars-bass-scale",
                output: "value",
              },
            },
          },
          {
            type: "layer.input.set",
            payload: {
              layerId: "layer-bars",
              inputKey: "gain",
              valueSource: {
                kind: "graph-output",
                graphId: "graph-main-reactivity",
                output: "barsGainAlt",
              },
            },
          },
        ],
        tempDirectory,
      );
      const reloaded = loadLocalVizProjectBundle(tempDirectory);
      const svgOutput = renderBundleSvg(tempDirectory, 36);

      expect(output.ok).toBe(true);
      expect(reloaded.issues).toHaveLength(0);
      expect(reloaded.project.graphs?.[0]?.outputs.some((output) => output.key === "barsGainAlt")).toBe(true);
      expect(svgOutput.ok).toBe(true);
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });
});
