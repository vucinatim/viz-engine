import { createCoreComponentRegistry } from "@viz-engine/components-core";
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from "@viz-engine/example-projects";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import { renderVizRenderPlanToSvgMarkup } from "@viz-engine/renderer-svg";
import { createVizFramePlan, createVizRenderPlan, createVizRuntimeSession } from "@viz-engine/runtime";
import { exportExampleBundle, loadLocalVizProjectBundle } from "@viz-engine/dev-cli";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeFramePlan, summarizeRenderPlan } from "./golden-output";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDirectory, "..", "..");
const fixtureDirectory = resolve(repoRoot, "tests", "v2", "fixtures");

mkdirSync(fixtureDirectory, { recursive: true });

const componentRegistry = createCoreComponentRegistry();
const nodeRegistry = createCoreNodeRegistry();

const session = createVizRuntimeSession({
  project: exampleProjectDocument,
  mode: "render",
  resolvedAssets: exampleResolvedAssets,
  resolvedArtifacts: exampleResolvedArtifacts,
  seed: "golden-fixture-seed",
});

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

const renderPlanThirtySix = createVizRenderPlan({
  session,
  frame: 36,
  registry: componentRegistry,
  nodeRegistry,
});

writeFileSync(
  join(fixtureDirectory, "example-frame-plan-frame-0.json"),
  `${JSON.stringify(summarizeFramePlan(framePlanZero), null, 2)}\n`,
);

writeFileSync(
  join(fixtureDirectory, "example-frame-plan-frame-36.json"),
  `${JSON.stringify(summarizeFramePlan(framePlanThirtySix), null, 2)}\n`,
);

writeFileSync(
  join(fixtureDirectory, "example-render-plan-frame-36.json"),
  `${JSON.stringify(summarizeRenderPlan(renderPlanThirtySix), null, 2)}\n`,
);

writeFileSync(
  join(fixtureDirectory, "example-render-frame-36.svg"),
  `${renderVizRenderPlanToSvgMarkup(renderPlanThirtySix)}\n`,
);

const tempDirectory = mkdtempSync(join(tmpdir(), "viz-validation-golden-"));

try {
  exportExampleBundle(tempDirectory);
  const loaded = loadLocalVizProjectBundle(tempDirectory);
  const manifestText = readFileSync(join(tempDirectory, "bundle-manifest.json"), "utf8");

  if (loaded.issues.length > 0) {
    throw new Error(`Generated golden bundle has issues: ${JSON.stringify(loaded.issues)}`);
  }

  writeFileSync(
    join(fixtureDirectory, "example-exported-bundle-manifest.json"),
    manifestText.endsWith("\n") ? manifestText : `${manifestText}\n`,
  );
} finally {
  rmSync(tempDirectory, {
    recursive: true,
    force: true,
  });
}
