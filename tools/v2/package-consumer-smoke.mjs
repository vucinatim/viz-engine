import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");

const packageEntries = [
  { name: "@viz-engine/contracts", dir: "packages/viz-contracts" },
  { name: "@viz-engine/actions", dir: "packages/viz-actions" },
  { name: "@viz-engine/editor-control", dir: "packages/viz-editor-control" },
  { name: "@viz-engine/editor-session", dir: "packages/viz-editor-session" },
  { name: "@viz-engine/runtime", dir: "packages/viz-runtime" },
  { name: "@viz-engine/components-core", dir: "packages/viz-components-core" },
  { name: "@viz-engine/nodes-core", dir: "packages/viz-nodes-core" },
  { name: "@viz-engine/dev-cli", dir: "packages/viz-dev-cli" },
  { name: "@viz-engine/example-projects", dir: "packages/viz-example-projects" },
  { name: "@viz-engine/renderer-svg", dir: "packages/viz-renderer-svg" },
  { name: "@viz-engine/remotion-adapter", dir: "packages/viz-remotion-adapter" },
];

const run = (command, args, cwd) => {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
};

const tempRoot = mkdtempSync(join(tmpdir(), "viz-v2-package-smoke-"));
const tarballDir = join(tempRoot, "tarballs");
const consumerDir = join(tempRoot, "consumer");

mkdirSync(tarballDir, { recursive: true });
mkdirSync(consumerDir, { recursive: true });

const tarballByPackageName = new Map();

try {
  for (const entry of packageEntries) {
    const packageDir = resolve(repoRoot, entry.dir);
    const before = new Set(readdirSync(tarballDir));
    run("pnpm", ["-C", packageDir, "pack", "--pack-destination", tarballDir], repoRoot);
    const after = readdirSync(tarballDir);
    const tarballName = after.find((file) => file.endsWith(".tgz") && !before.has(file));

    if (!tarballName) {
      throw new Error(`Could not locate packed tarball for ${entry.name}.`);
    }

    tarballByPackageName.set(entry.name, join(tarballDir, tarballName));
  }

  const consumerPackageJson = {
    name: "viz-v2-consumer-smoke",
    private: true,
    type: "module",
    dependencies: Object.fromEntries(
      packageEntries.map((entry) => [entry.name, tarballByPackageName.get(entry.name)]),
    ),
    pnpm: {
      overrides: Object.fromEntries(
        packageEntries.map((entry) => [entry.name, tarballByPackageName.get(entry.name)]),
      ),
    },
  };

  writeFileSync(
    join(consumerDir, "package.json"),
    `${JSON.stringify(consumerPackageJson, null, 2)}\n`,
  );

  const consumerScript = `
import { createCoreComponentRegistry } from "@viz-engine/components-core";
import { applyVizProjectAction } from "@viz-engine/actions";
import { createVizEditorControl } from "@viz-engine/editor-control";
import { createVizEditorSession } from "@viz-engine/editor-session";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from "@viz-engine/example-projects";
import { exampleProjectBundleDirectoryUrl } from "@viz-engine/example-projects/node";
import { exportBundleProject, loadLocalVizProjectBundle } from "@viz-engine/dev-cli";
import { createVizRemotionSvgMarkup } from "@viz-engine/remotion-adapter";
import { renderVizRenderPlanToSvgMarkup } from "@viz-engine/renderer-svg";
import { createVizRenderPlan, createVizRuntimeSession } from "@viz-engine/runtime";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const session = createVizRuntimeSession({
  project: createVizEditorSession({
    project: applyVizProjectAction(exampleProjectDocument, {
      type: "layer.settings.set",
      payload: {
        layerId: "layer-background",
        path: "meta.smoke.source",
        value: "consumer",
      },
    }).project,
  }).exportWorkingProject(),
  mode: "render",
  resolvedAssets: exampleResolvedAssets,
  resolvedArtifacts: exampleResolvedArtifacts,
  seed: "consumer-smoke-seed",
});

const renderPlan = createVizRenderPlan({
  session,
  frame: 36,
  registry: createCoreComponentRegistry(),
  nodeRegistry: createCoreNodeRegistry(),
});

if (renderPlan.issues.length > 0) {
  throw new Error(\`Unexpected render-plan issues: \${JSON.stringify(renderPlan.issues)}\`);
}

const svgMarkup = renderVizRenderPlanToSvgMarkup(renderPlan);
const remotionSvgMarkup = createVizRemotionSvgMarkup({
  project: exampleProjectDocument,
  frame: 36,
  resolvedAssets: exampleResolvedAssets,
  resolvedArtifacts: exampleResolvedArtifacts,
  registry: createCoreComponentRegistry(),
  nodeRegistry: createCoreNodeRegistry(),
  seed: "consumer-smoke-seed",
});

if (!svgMarkup.includes("data-layer-id=\\"layer-cover\\"")) {
  throw new Error("Expected the consumer SVG output to include the cover-art layer.");
}

if (!svgMarkup.includes("<image ")) {
  throw new Error("Expected the consumer SVG output to include an image node.");
}

if (svgMarkup !== remotionSvgMarkup) {
  throw new Error("Expected runtime SVG and Remotion SVG outputs to match for the same frame.");
}

if (!existsSync(fileURLToPath(new URL("bundle-manifest.json", exampleProjectBundleDirectoryUrl)))) {
  throw new Error("Expected packaged example-projects fixture bundle to be shipped.");
}

const loadedBundle = loadLocalVizProjectBundle(exampleProjectBundleDirectoryUrl);

if (loadedBundle.issues.length > 0) {
  throw new Error(\`Unexpected bundle issues: \${JSON.stringify(loadedBundle.issues)}\`);
}

const bundleSession = createVizRuntimeSession({
  project: loadedBundle.project,
  mode: "render",
  resolvedAssets: loadedBundle.resolvedAssets,
  resolvedArtifacts: loadedBundle.resolvedArtifacts,
  seed: "consumer-smoke-seed",
});

const bundleRenderPlan = createVizRenderPlan({
  session: bundleSession,
  frame: 36,
  registry: createCoreComponentRegistry(),
  nodeRegistry: createCoreNodeRegistry(),
});

if (bundleRenderPlan.issues.length > 0) {
  throw new Error(\`Unexpected bundle render-plan issues: \${JSON.stringify(bundleRenderPlan.issues)}\`);
}

const bundleSvgMarkup = renderVizRenderPlanToSvgMarkup(bundleRenderPlan);

if (!bundleSvgMarkup.includes("example-cover.svg")) {
  throw new Error("Expected the bundle-backed SVG output to include the bundled cover asset URI.");
}

const roundtripDirectoryUrl = new URL("./roundtrip-bundle/", import.meta.url).href;
const roundtripOutput = exportBundleProject(exampleProjectBundleDirectoryUrl, roundtripDirectoryUrl);

if (!roundtripOutput.ok) {
  throw new Error(\`Expected bundle roundtrip export to succeed: \${JSON.stringify(roundtripOutput.payload)}\`);
}

const reloadedRoundtripBundle = loadLocalVizProjectBundle(roundtripDirectoryUrl);

if (reloadedRoundtripBundle.issues.length > 0) {
  throw new Error(\`Unexpected roundtrip bundle issues: \${JSON.stringify(reloadedRoundtripBundle.issues)}\`);
}

const editorControl = createVizEditorControl();
const controlSnapshot = editorControl.openExampleProject();
const controlMutation = editorControl.applyAction({
  type: "layer.settings.set",
  payload: {
    layerId: "layer-background",
    path: "meta.operator.source",
    value: "consumer",
  },
});

if (!controlMutation.ok) {
  throw new Error(\`Expected editor control mutation to succeed: \${JSON.stringify(controlMutation.actionResult)}\`);
}

const controlDebugSnapshot = editorControl.createDebugSnapshot(24);

if (controlDebugSnapshot.renderPlan.issues.length > 0) {
  throw new Error(\`Unexpected editor control render issues: \${JSON.stringify(controlDebugSnapshot.renderPlan.issues)}\`);
}

if (controlSnapshot.graphSummaries.length === 0) {
  throw new Error("Expected editor control to expose graph summaries.");
}

process.stdout.write(\`\${JSON.stringify({
  ok: true,
  layerCount: renderPlan.layers.length,
  bundleLayerCount: bundleRenderPlan.layers.length,
  roundtripGraphCount: reloadedRoundtripBundle.project.graphs?.length ?? 0,
  controlGraphCount: controlSnapshot.graphSummaries.length,
  issues: renderPlan.issues.length,
  layerIds: renderPlan.layers.map((layer) => layer.layerId),
}, null, 2)}\\n\`);
`.trimStart();

  writeFileSync(join(consumerDir, "index.mjs"), consumerScript);

  run("pnpm", ["install"], consumerDir);
  const output = run("node", ["index.mjs"], consumerDir);

  const consumerNodeModules = join(consumerDir, "node_modules");
  const installedRendererPackage = resolve(
    consumerNodeModules,
    "@viz-engine/renderer-svg/package.json",
  );
  const installedRendererManifest = JSON.parse(readFileSync(installedRendererPackage, "utf8"));

  if (Array.isArray(installedRendererManifest.files) && installedRendererManifest.files.includes("src")) {
    throw new Error("Expected packed package manifests to exclude src/ from published files.");
  }

  process.stdout.write(`${output}\n`);
} finally {
  rmSync(tempRoot, {
    recursive: true,
    force: true,
  });
}
