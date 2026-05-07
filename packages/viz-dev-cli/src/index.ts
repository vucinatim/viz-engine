import { exampleComponents, exampleProjectDocument, exampleResolvedArtifacts } from "@viz-engine/example-projects";
import { createVizComponentRegistry, createVizFramePlan, createVizRuntimeSession, validateProjectDocument } from "@viz-engine/runtime";

export interface VizCliOutput {
  ok: boolean;
  command: string;
  payload: unknown;
}

const componentRegistry = createVizComponentRegistry(exampleComponents);

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
    resolvedArtifacts: exampleResolvedArtifacts,
    seed: "cli-seed",
  });

  const framePlan = createVizFramePlan({
    session,
    frame,
    registry: componentRegistry,
  });

  return {
    ok: framePlan.issues.length === 0,
    command: "example frame",
    payload: framePlan,
  };
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

const run = (argv: string[]): VizCliOutput => {
  const [scope, action] = argv;

  if (scope === "example" && action === "validate") {
    return validateExampleProject();
  }

  if (scope === "example" && action === "frame") {
    return inspectExampleFrame(parseFrameArg(argv.slice(2)));
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
