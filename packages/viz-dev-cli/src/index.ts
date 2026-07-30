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
import {
  createVizFramePlan,
  createVizRenderPlan,
  createVizRuntimeSession,
  sampleProjectAudioFrameSnapshot,
  validateProjectDocument,
} from "@viz-engine/runtime";
import { readFileSync } from "node:fs";
import { createVizComponentScaffold } from "./component-scaffold.js";
import {
  loadLocalVizProjectBundle,
  type LoadedLocalVizProjectBundle,
  writeLocalVizProjectBundle,
} from "./local-project-bundle.js";
import {
  DEFAULT_VIZ_CONTROL_URL,
  discoverLiveVizControl,
  requestLiveVizControl,
  VIZ_CONTROL_PROTOCOL_VERSION,
  type LiveVizControlRequest,
} from "./live-control-client.js";
import { bakeLocalBundleAudio } from "./audio-bake-command.js";

export { loadLocalVizProjectBundle } from "./local-project-bundle.js";
export { writeLocalVizProjectBundle } from "./local-project-bundle.js";
export { createVizComponentScaffold } from "./component-scaffold.js";
export * from "./live-control-client.js";
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

const createBundleRuntimeInputs = (
  loaded: LoadedLocalVizProjectBundle,
  frame: number,
) => {
  const audio = sampleProjectAudioFrameSnapshot(
    loaded.project,
    loaded.resolvedArtifacts,
    frame,
  );
  return audio === undefined ? {} : { audio };
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
    runtimeInputs: createBundleRuntimeInputs(loaded, frame),
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
    runtimeInputProvider: (requestedFrame) =>
      createBundleRuntimeInputs(loaded, requestedFrame),
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

const parseOptionalStringArg = (
  argv: string[],
  flag: string,
): string | undefined => {
  const flagIndex = argv.findIndex((entry) => entry === flag);
  if (flagIndex === -1) {
    return undefined;
  }
  const rawValue = argv[flagIndex + 1];
  if (!rawValue) {
    throw new Error(`Missing ${flag} value.`);
  }
  return rawValue;
};

const parseLiveUrlArg = (argv: string[]): string => {
  return parseOptionalStringArg(argv, "--url") ?? DEFAULT_VIZ_CONTROL_URL;
};

const parseTransactionArg = (argv: string[]): unknown => {
  const path = parseOptionalStringArg(argv, "--transaction");
  if (path === undefined) {
    throw new Error(
      "Missing transaction file. Pass --transaction <path-to-json>.",
    );
  }
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
};

const parseJsonFileArg = (
  argv: string[],
  flag: string,
  label: string,
): unknown => {
  const path = parseOptionalStringArg(argv, flag);
  if (path === undefined) {
    throw new Error(`Missing ${label}. Pass ${flag} <path-to-json>.`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
};

const parseOptionalRevisionArg = (
  argv: string[],
): number | undefined => {
  const value = parseOptionalStringArg(argv, "--expected-revision");
  if (value === undefined) {
    return undefined;
  }
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 0) {
    throw new Error("--expected-revision must be a non-negative integer.");
  }
  return revision;
};

const parseOptionalNumberArg = (
  argv: string[],
  flag: string,
  allowZero: boolean,
): number | undefined => {
  const raw = parseOptionalStringArg(argv, flag);
  if (raw === undefined) {
    return undefined;
  }
  const value = Number(raw);
  if (
    !Number.isFinite(value) ||
    (allowZero ? value < 0 : value <= 0)
  ) {
    throw new Error(
      `${flag} must be a ${allowZero ? "non-negative" : "positive"} finite number.`,
    );
  }
  return value;
};

const createRequestId = (operation: string): string => {
  const suffix =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `viz-dev-${operation}-${suffix}`;
};

const createLiveRequest = (
  operation: string,
  payload: Record<string, unknown> = {},
): LiveVizControlRequest => ({
  protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
  id: createRequestId(operation),
  operation,
  ...payload,
});

const createHelpOutput = (): VizCliOutput => ({
  ok: true,
  command: "help",
  payload: {
    executable: "viz-dev",
    commands: {
      live: [
        "live discover [--url <origin>]",
        "live snapshot [--url <origin>]",
        "live project [--url <origin>]",
        "live components [--url <origin>]",
        "live graphs [--graph-id <id>] [--url <origin>]",
        "live transact --transaction <json-file> [--url <origin>]",
        "live undo|redo|play|pause [--url <origin>]",
        "live seek --frame <frame> [--url <origin>]",
        "live jobs [--url <origin>]",
        "live job --job-id <id> [--url <origin>]",
        "live bake-start --request <json-file> [--url <origin>]",
        "live job-cancel --job-id <id> [--url <origin>]",
        "live bake-attach --job-id <id> [--expected-revision <revision>] [--url <origin>]",
      ],
      local: [
        "example validate|frame|render|svg",
        "example bundle-export --out <directory>",
        "example action-apply --actions <json-file> [--out <directory>]",
        "bundle validate|frame|render|svg --dir <directory>",
        "bundle export --dir <directory> --out <directory>",
        "bundle action-apply --dir <directory> --actions <json-file> [--out <directory>]",
        "bundle bake-audio --dir <directory> --out <directory> [--asset-id <id>] [--fps <fps>] [--fft-size <size>] [--start <seconds>] [--duration <seconds>]",
        "component scaffold --id <id> --name <name> --out <file>",
      ],
    },
  },
});

const runLiveCommand = async (argv: string[]): Promise<VizCliOutput> => {
  const [action] = argv;
  const rest = argv.slice(1);
  const baseUrl = parseLiveUrlArg(rest);

  if (action === "discover") {
    const bridge = await discoverLiveVizControl({ baseUrl });
    if (!bridge.ok || !bridge.discovery.editor.connected) {
      return {
        ok: false,
        command: "live discover",
        payload: {
          bridge: bridge.discovery,
          status: bridge.status,
        },
      };
    }
    const control = await requestLiveVizControl(
      createLiveRequest("control.discover"),
      { baseUrl },
    );
    return {
      ok: control.ok,
      command: "live discover",
      payload: {
        bridge: bridge.discovery,
        control: control.response,
      },
    };
  }

  const operationByAction: Record<string, string> = {
    snapshot: "control.snapshot",
    project: "project.inspect",
    components: "component.inspect",
    graphs: "graph.inspect",
    undo: "history.undo",
    redo: "history.redo",
    play: "preview.play",
    pause: "preview.pause",
    seek: "preview.seek",
    transact: "transaction.apply",
    jobs: "job.list",
    job: "job.inspect",
    "bake-start": "audio-bake.start",
    "job-cancel": "job.cancel",
    "bake-attach": "audio-bake.attach",
  };
  const operation = operationByAction[action ?? ""];
  if (operation === undefined) {
    throw new Error(`Unknown live command: ${argv.join(" ") || "<empty>"}`);
  }

  const payload: Record<string, unknown> = {};
  if (action === "graphs") {
    const graphId = parseOptionalStringArg(rest, "--graph-id");
    if (graphId !== undefined) {
      payload.graphId = graphId;
    }
  } else if (action === "seek") {
    payload.frame = parseFrameArg(rest);
  } else if (action === "transact") {
    payload.transaction = parseTransactionArg(rest);
  } else if (action === "job" || action === "job-cancel") {
    payload.jobId = parseOptionalStringArg(rest, "--job-id");
    if (payload.jobId === undefined) {
      throw new Error("Missing job id. Pass --job-id <id>.");
    }
  } else if (action === "bake-start") {
    payload.request = parseJsonFileArg(
      rest,
      "--request",
      "audio bake request file",
    );
  } else if (action === "bake-attach") {
    payload.jobId = parseOptionalStringArg(rest, "--job-id");
    if (payload.jobId === undefined) {
      throw new Error("Missing job id. Pass --job-id <id>.");
    }
    const expectedRevision = parseOptionalRevisionArg(rest);
    if (expectedRevision !== undefined) {
      payload.expectedRevision = expectedRevision;
    }
  }

  const result = await requestLiveVizControl(
    createLiveRequest(operation, payload),
    { baseUrl },
  );
  return {
    ok: result.ok,
    command: `live ${action}`,
    payload: result.response,
  };
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

export const runVizCli = async (argv: string[]): Promise<VizCliOutput> => {
  const [scope, action] = argv;

  if (
    scope === undefined ||
    scope === "help" ||
    scope === "--help" ||
    scope === "-h"
  ) {
    return createHelpOutput();
  }

  if (scope === "live") {
    return runLiveCommand(argv.slice(1));
  }

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

  if (scope === "bundle" && action === "bake-audio") {
    const rest = argv.slice(2);
    const sourceAssetId = parseOptionalStringArg(rest, "--asset-id");
    const fps = parseOptionalNumberArg(rest, "--fps", false);
    const fftSize = parseOptionalNumberArg(
      rest,
      "--fft-size",
      false,
    );
    const startSeconds = parseOptionalNumberArg(
      rest,
      "--start",
      true,
    );
    const durationSeconds = parseOptionalNumberArg(
      rest,
      "--duration",
      true,
    );
    const result = await bakeLocalBundleAudio({
      sourceBundleDirectory: parseDirArg(rest),
      outputBundleDirectory: parseOutArg(rest),
      ...(sourceAssetId === undefined ? {} : { sourceAssetId }),
      ...(fps === undefined ? {} : { fps }),
      ...(fftSize === undefined ? {} : { fftSize }),
      ...(startSeconds === undefined ? {} : { startSeconds }),
      ...(durationSeconds === undefined
        ? {}
        : { durationSeconds }),
    });
    return {
      ok: result.ok,
      command: "bundle bake-audio",
      payload: result.payload,
    };
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

const main = async (): Promise<void> => {
  try {
    const output = await runVizCli(process.argv.slice(2));
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
};

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
