import { createCoreComponentRegistry } from "@viz-engine/components-core";
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from "@viz-engine/example-projects";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import { renderVizRenderPlanToSvgMarkup } from "@viz-engine/renderer-svg";
import { createVizFramePlan, createVizRenderPlan, createVizRuntimeSession } from "@viz-engine/runtime";
import { exportExampleBundle } from "@viz-engine/dev-cli";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { summarizeFramePlan, summarizeRenderPlan } from "../../tools/v2/golden-output";

const fixtureDirectory = resolve(process.cwd(), "tests/v2/fixtures");
const componentRegistry = createCoreComponentRegistry();
const nodeRegistry = createCoreNodeRegistry();

const createExampleSession = () => {
  return createVizRuntimeSession({
    project: exampleProjectDocument,
    mode: "render",
    resolvedAssets: exampleResolvedAssets,
    resolvedArtifacts: exampleResolvedArtifacts,
    seed: "golden-fixture-seed",
  });
};

describe("Viz golden outputs", () => {
  it("matches the canonical frame-plan goldens", () => {
    const session = createExampleSession();
    const framePlanZero = createVizFramePlan({
      session,
      frame: 0,
      registry: componentRegistry,
      nodeRegistry,
    });
    const framePlanThirtySix = createVizFramePlan({
      session,
      frame: 36,
      registry: componentRegistry,
      nodeRegistry,
    });

    expect(`${JSON.stringify(summarizeFramePlan(framePlanZero), null, 2)}\n`).toBe(
      readFileSync(join(fixtureDirectory, "example-frame-plan-frame-0.json"), "utf8"),
    );
    expect(`${JSON.stringify(summarizeFramePlan(framePlanThirtySix), null, 2)}\n`).toBe(
      readFileSync(join(fixtureDirectory, "example-frame-plan-frame-36.json"), "utf8"),
    );
  });

  it("matches the canonical render-plan and SVG goldens", () => {
    const renderPlan = createVizRenderPlan({
      session: createExampleSession(),
      frame: 36,
      registry: componentRegistry,
      nodeRegistry,
    });

    expect(`${JSON.stringify(summarizeRenderPlan(renderPlan), null, 2)}\n`).toBe(
      readFileSync(join(fixtureDirectory, "example-render-plan-frame-36.json"), "utf8"),
    );
    expect(`${renderVizRenderPlanToSvgMarkup(renderPlan)}\n`).toBe(
      readFileSync(join(fixtureDirectory, "example-render-frame-36.svg"), "utf8"),
    );
  });

  it("matches the canonical exported bundle manifest golden", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "viz-bundle-golden-"));

    try {
      const output = exportExampleBundle(tempDirectory);
      expect(output.ok).toBe(true);

      const manifestText = readFileSync(join(tempDirectory, "bundle-manifest.json"), "utf8");
      expect(manifestText.endsWith("\n") ? manifestText : `${manifestText}\n`).toBe(
        readFileSync(join(fixtureDirectory, "example-exported-bundle-manifest.json"), "utf8"),
      );
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });
});
