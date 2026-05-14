import { applyVizProjectActions } from "@viz-engine/actions";
import { createCoreComponentRegistry } from "@viz-engine/components-core";
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from "@viz-engine/example-projects";
import { exampleProjectBundleDirectoryUrl } from "@viz-engine/example-projects/node";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import { renderVizRenderPlanToSvgMarkup } from "@viz-engine/renderer-svg";
import type {
  VizProjectAction,
  VizProjectDocument,
  VizResolvedArtifact,
  VizResolvedAsset,
} from "@viz-engine/contracts";
import { createVizFramePlan, createVizRenderPlan, createVizRuntimeSession, validateProjectDocument } from "@viz-engine/runtime";
import { readFileSync } from "node:fs";
import { createVizComponentScaffold } from "./component-scaffold.js";
import {
  loadLocalVizProjectBundle,
  type LoadedLocalVizProjectBundle,
  writeLocalVizProjectBundle,
} from "./local-project-bundle.js";

export { loadLocalVizProjectBundle } from "./local-project-bundle.js";
export { writeLocalVizProjectBundle } from "./local-project-bundle.js";
export { createVizComponentScaffold } from "./component-scaffold.js";
export type { LoadedLocalVizProjectBundle } from "./local-project-bundle.js";

export interface VizCliOutput {
  ok: boolean;
  command: string;
  payload: unknown;
}

const componentRegistry = createCoreComponentRegistry();
const nodeRegistry = createCoreNodeRegistry();

const createBundleSession = (loaded: LoadedLocalVizProjectBundle) => {
  return createVizRuntimeSession({
    project: loaded.project,
    mode: "render",
    resolvedAssets: loaded.resolvedAssets,
    resolvedArtifacts: loaded.resolvedArtifacts,
    seed: "cli-bundle-seed",
  });
};

export const validateExampleProject = (): VizCliOutput => {
  const result = validateProjectDocument(exampleProjectDocument);

  return {
    ok: result.ok,
    command: "example validate",
    payload: result,
  };
};

export const inspectExampleFrame = (frame: number): VizCliOutput => {
  const session = createVizRuntimeSession({
    project: exampleProjectDocument,
    mode: "render",
    resolvedAssets: exampleResolvedAssets,
    resolvedArtifacts: exampleResolvedArtifacts,
    seed: "cli-seed",
  });

  const framePlan = createVizFramePlan({
    session,
    frame,
    registry: componentRegistry,
    nodeRegistry,
  });

  return {
    ok: framePlan.issues.length === 0,
    command: "example frame",
    payload: framePlan,
  };
};

export const inspectExampleRender = (frame: number): VizCliOutput => {
  const session = createVizRuntimeSession({
    project: exampleProjectDocument,
    mode: "render",
    resolvedAssets: exampleResolvedAssets,
    resolvedArtifacts: exampleResolvedArtifacts,
    seed: "cli-seed",
  });

  const renderPlan = createVizRenderPlan({
    session,
    frame,
    registry: componentRegistry,
    nodeRegistry,
  });

  return {
    ok: renderPlan.issues.length === 0,
    command: "example render",
    payload: renderPlan,
  };
};

export const renderExampleSvg = (frame: number): VizCliOutput => {
  const renderOutput = inspectExampleRender(frame);

  if (!renderOutput.ok) {
    return renderOutput;
  }

  return {
    ok: true,
    command: "example svg",
    payload: {
      frame,
      svg: renderVizRenderPlanToSvgMarkup(renderOutput.payload as Parameters<typeof renderVizRenderPlanToSvgMarkup>[0]),
    },
  };
};

export const validateBundleProject = (bundleDirectory: string): VizCliOutput => {
  const loaded = loadLocalVizProjectBundle(bundleDirectory);
  const result = validateProjectDocument(loaded.project);
  const ok = result.ok && loaded.issues.length === 0;

  return {
    ok,
    command: "bundle validate",
    payload: {
      ...loaded,
      validation: result,
    },
  };
};

export const inspectBundleFrame = (bundleDirectory: string, frame: number): VizCliOutput => {
  const loaded = loadLocalVizProjectBundle(bundleDirectory);
  const session = createBundleSession(loaded);
  const framePlan = createVizFramePlan({
    session,
    frame,
    registry: componentRegistry,
    nodeRegistry,
  });

  return {
    ok: framePlan.issues.length === 0,
    command: "bundle frame",
    payload: {
      bundleDirectory: loaded.bundleDirectory,
      manifest: loaded.manifest,
      framePlan,
    },
  };
};

export const inspectBundleRender = (bundleDirectory: string, frame: number): VizCliOutput => {
  const loaded = loadLocalVizProjectBundle(bundleDirectory);
  const session = createBundleSession(loaded);
  const renderPlan = createVizRenderPlan({
    session,
    frame,
    registry: componentRegistry,
    nodeRegistry,
  });

  return {
    ok: renderPlan.issues.length === 0,
    command: "bundle render",
    payload: {
      bundleDirectory: loaded.bundleDirectory,
      manifest: loaded.manifest,
      renderPlan,
    },
  };
};

export const renderBundleSvg = (bundleDirectory: string, frame: number): VizCliOutput => {
  const renderOutput = inspectBundleRender(bundleDirectory, frame);

  if (!renderOutput.ok) {
    return renderOutput;
  }

  const payload = renderOutput.payload as {
    bundleDirectory: string;
    manifest: unknown;
    renderPlan: Parameters<typeof renderVizRenderPlanToSvgMarkup>[0];
  };

  return {
    ok: true,
    command: "bundle svg",
    payload: {
      bundleDirectory: payload.bundleDirectory,
      manifest: payload.manifest,
      frame,
      svg: renderVizRenderPlanToSvgMarkup(payload.renderPlan),
    },
  };
};

export const exportExampleBundle = (bundleDirectory: string): VizCliOutput => {
  const result = writeLocalVizProjectBundle({
    bundleDirectory,
    project: exampleProjectDocument,
    resolvedAssets: exampleResolvedAssets,
    resolvedArtifacts: exampleResolvedArtifacts,
  });

  return {
    ok: result.issues.length === 0,
    command: "example bundle export",
    payload: result,
  };
};

export const exportBundleProject = (sourceBundleDirectory: string, outputBundleDirectory: string): VizCliOutput => {
  const loaded = loadLocalVizProjectBundle(sourceBundleDirectory);
  const result = writeLocalVizProjectBundle({
    bundleDirectory: outputBundleDirectory,
    project: loaded.project,
    resolvedAssets: loaded.resolvedAssets,
    resolvedArtifacts: loaded.resolvedArtifacts,
  });

  return {
    ok: loaded.issues.length === 0 && result.issues.length === 0,
    command: "bundle export",
    payload: {
      sourceBundleDirectory: loaded.bundleDirectory,
      manifest: result.manifest,
      issues: [...loaded.issues, ...result.issues],
    },
  };
};

interface ApplyProjectActionsOptions {
  command: string;
  project: VizProjectDocument;
  resolvedAssets: VizResolvedAsset[];
  resolvedArtifacts: VizResolvedArtifact[];
  actions: VizProjectAction[];
  outputBundleDirectory?: string;
  sourceIssues?: LoadedLocalVizProjectBundle["issues"];
  sourceBundleDirectory?: string;
}

const applyProjectActions = ({
  command,
  project,
  resolvedAssets,
  resolvedArtifacts,
  actions,
  outputBundleDirectory,
  sourceIssues = [],
  sourceBundleDirectory,
}: ApplyProjectActionsOptions): VizCliOutput => {
  const actionResult = applyVizProjectActions(project, actions);
  const validation = validateProjectDocument(actionResult.project);
  const bundleWriteResult =
    outputBundleDirectory === undefined || !validation.ok
      ? undefined
      : writeLocalVizProjectBundle({
          bundleDirectory: outputBundleDirectory,
          project: actionResult.project,
          resolvedAssets,
          resolvedArtifacts,
        });
  const framePlan = !validation.ok
    ? undefined
    : createVizFramePlan({
        session: createVizRuntimeSession({
          project: actionResult.project,
          mode: "render",
          resolvedAssets,
          resolvedArtifacts,
          seed: "cli-action-seed",
        }),
        frame: 0,
        registry: componentRegistry,
        nodeRegistry,
      });

  const ok =
    sourceIssues.length === 0 &&
    actionResult.ok &&
    validation.ok &&
    (framePlan?.issues.length ?? 0) === 0 &&
    (bundleWriteResult?.issues.length ?? 0) === 0;

  return {
    ok,
    command,
    payload: {
      ...(sourceBundleDirectory === undefined
        ? {}
        : {
            sourceBundleDirectory,
          }),
      actionResult,
      validation,
      ...(framePlan === undefined ? {} : { framePlan }),
      ...(sourceIssues.length === 0 ? {} : { sourceIssues }),
      ...(bundleWriteResult === undefined
        ? {}
        : {
            bundleWriteResult,
          }),
    },
  };
};

export const applyActionsToExampleProject = (
  actions: VizProjectAction[],
  outputBundleDirectory?: string,
): VizCliOutput => {
  return applyProjectActions({
    command: "example action-apply",
    project: exampleProjectDocument,
    resolvedAssets: exampleResolvedAssets,
    resolvedArtifacts: exampleResolvedArtifacts,
    actions,
    ...(outputBundleDirectory === undefined
      ? {}
      : { outputBundleDirectory }),
  });
};

export const applyActionsToBundleProject = (
  sourceBundleDirectory: string,
  actions: VizProjectAction[],
  outputBundleDirectory?: string,
): VizCliOutput => {
  const loaded = loadLocalVizProjectBundle(sourceBundleDirectory);

  return applyProjectActions({
    command: "bundle action-apply",
    project: loaded.project,
    resolvedAssets: loaded.resolvedAssets,
    resolvedArtifacts: loaded.resolvedArtifacts,
    actions,
    sourceIssues: loaded.issues,
    sourceBundleDirectory: loaded.bundleDirectory,
    ...(outputBundleDirectory === undefined
      ? {}
      : { outputBundleDirectory }),
  });
};

const printJson = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

const parseFrameArg = (argv: string[]): number => {
  const frameFlagIndex = argv.findIndex((entry) => entry === "--frame");

  if (frameFlagIndex === -1) {
    return 0;
  }

  const rawValue = argv[frameFlagIndex + 1];
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid --frame value "${rawValue ?? ""}".`);
  }

  return Math.max(0, Math.floor(parsed));
};

const parseDirArg = (argv: string[]): string => {
  const dirFlagIndex = argv.findIndex((entry) => entry === "--dir");

  if (dirFlagIndex !== -1) {
    const rawValue = argv[dirFlagIndex + 1];

    if (!rawValue) {
      throw new Error("Missing --dir value.");
    }

    return rawValue;
  }

  const exampleFlagIndex = argv.findIndex((entry) => entry === "--example");

  if (exampleFlagIndex !== -1) {
    return exampleProjectBundleDirectoryUrl;
  }

  throw new Error("Missing bundle directory. Pass --dir <path-or-file-url> or --example.");
};

const parseOutArg = (argv: string[]): string => {
  const outFlagIndex = argv.findIndex((entry) => entry === "--out");

  if (outFlagIndex === -1) {
    throw new Error("Missing output directory. Pass --out <path-or-file-url>.");
  }

  const rawValue = argv[outFlagIndex + 1];

  if (!rawValue) {
    throw new Error("Missing --out value.");
  }

  return rawValue;
};

const parseOptionalOutArg = (argv: string[]): string | undefined => {
  const outFlagIndex = argv.findIndex((entry) => entry === "--out");

  if (outFlagIndex === -1) {
    return undefined;
  }

  const rawValue = argv[outFlagIndex + 1];

  if (!rawValue) {
    throw new Error("Missing --out value.");
  }

  return rawValue;
};

const parseComponentIdArg = (argv: string[]): string => {
  const flagIndex = argv.findIndex((entry) => entry === "--id");

  if (flagIndex === -1) {
    throw new Error("Missing component id. Pass --id <kebab-case-id>.");
  }

  const rawValue = argv[flagIndex + 1];

  if (!rawValue) {
    throw new Error("Missing --id value.");
  }

  return rawValue;
};

const parseComponentNameArg = (argv: string[]): string => {
  const flagIndex = argv.findIndex((entry) => entry === "--name");

  if (flagIndex === -1) {
    throw new Error("Missing component name. Pass --name <display-name>.");
  }

  const rawValue = argv[flagIndex + 1];

  if (!rawValue) {
    throw new Error("Missing --name value.");
  }

  return rawValue;
};

const parseActionsArg = (argv: string[]): VizProjectAction[] => {
  const actionsFlagIndex = argv.findIndex((entry) => entry === "--actions");

  if (actionsFlagIndex === -1) {
    throw new Error("Missing action file. Pass --actions <path-to-json>.");
  }

  const rawValue = argv[actionsFlagIndex + 1];

  if (!rawValue) {
    throw new Error("Missing --actions value.");
  }

  const rawJson = readFileSync(rawValue, "utf8");
  const parsed = JSON.parse(rawJson) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Action file must contain a JSON array of Viz project actions.");
  }

  return parsed as VizProjectAction[];
};

const run = (argv: string[]): VizCliOutput => {
  const [scope, action] = argv;

  if (scope === "example" && action === "validate") {
    return validateExampleProject();
  }

  if (scope === "example" && action === "frame") {
    return inspectExampleFrame(parseFrameArg(argv.slice(2)));
  }

  if (scope === "example" && action === "render") {
    return inspectExampleRender(parseFrameArg(argv.slice(2)));
  }

  if (scope === "example" && action === "svg") {
    return renderExampleSvg(parseFrameArg(argv.slice(2)));
  }

  if (scope === "example" && action === "bundle-export") {
    return exportExampleBundle(parseOutArg(argv.slice(2)));
  }

  if (scope === "example" && action === "action-apply") {
    const rest = argv.slice(2);
    return applyActionsToExampleProject(parseActionsArg(rest), parseOptionalOutArg(rest));
  }

  if (scope === "bundle" && action === "validate") {
    return validateBundleProject(parseDirArg(argv.slice(2)));
  }

  if (scope === "bundle" && action === "frame") {
    const rest = argv.slice(2);
    return inspectBundleFrame(parseDirArg(rest), parseFrameArg(rest));
  }

  if (scope === "bundle" && action === "render") {
    const rest = argv.slice(2);
    return inspectBundleRender(parseDirArg(rest), parseFrameArg(rest));
  }

  if (scope === "bundle" && action === "svg") {
    const rest = argv.slice(2);
    return renderBundleSvg(parseDirArg(rest), parseFrameArg(rest));
  }

  if (scope === "bundle" && action === "export") {
    const rest = argv.slice(2);
    return exportBundleProject(parseDirArg(rest), parseOutArg(rest));
  }

  if (scope === "bundle" && action === "action-apply") {
    const rest = argv.slice(2);
    return applyActionsToBundleProject(parseDirArg(rest), parseActionsArg(rest), parseOptionalOutArg(rest));
  }

  if (scope === "component" && action === "scaffold") {
    const rest = argv.slice(2);
    const outputFile = parseOutArg(rest);
    const result = createVizComponentScaffold({
      componentId: parseComponentIdArg(rest),
      componentName: parseComponentNameArg(rest),
      outputFile,
    });

    return {
      ok: result.issues.length === 0,
      command: "component scaffold",
      payload: result,
    };
  }

  throw new Error(`Unknown command: ${argv.join(" ") || "<empty>"}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const output = run(process.argv.slice(2));
    printJson(output);
    process.exit(output.ok ? 0 : 1);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown CLI error.";
    printJson({
      ok: false,
      command: "error",
      payload: {
        message,
      },
    });
    process.exit(1);
  }
}
