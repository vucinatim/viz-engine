import type {
  VizComponentImplementation,
  VizComponentInputSourceKind,
} from "./components.js";

export interface VizComponentRegistry {
  get(id: string): VizComponentImplementation | undefined;
  list(): VizComponentImplementation[];
  getValidationIssues(): VizComponentValidationIssue[];
}

export interface VizComponentValidationIssue {
  code:
    | "missing-component-id"
    | "missing-component-name"
    | "duplicate-component-id"
    | "duplicate-input-key"
    | "invalid-input-key"
    | "empty-supported-sources"
    | "invalid-default-asset";
  componentId?: string;
  path: string;
  message: string;
}

const VALID_INPUT_SOURCE_KINDS = new Set<VizComponentInputSourceKind>([
  "literal",
  "asset-ref",
  "graph-output",
  "artifact-feature",
]);

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

export const validateVizComponentImplementation = (
  component: VizComponentImplementation,
): VizComponentValidationIssue[] => {
  const issues: VizComponentValidationIssue[] = [];

  if (!isNonEmptyString(component.id)) {
    issues.push({
      code: "missing-component-id",
      path: "id",
      message: "Component id must be a non-empty string.",
    });
  }

  if (!isNonEmptyString(component.name)) {
    issues.push({
      code: "missing-component-name",
      componentId: component.id,
      path: `${component.id || "<missing-id>"}.name`,
      message: "Component name must be a non-empty string.",
    });
  }

  const seenInputKeys = new Set<string>();

  for (const input of component.inputs ?? []) {
    const pathPrefix = `${component.id || "<missing-id>"}.inputs.${input.key || "<missing-key>"}`;

    if (!isNonEmptyString(input.key)) {
      issues.push({
        code: "invalid-input-key",
        componentId: component.id,
        path: pathPrefix,
        message: "Component input key must be a non-empty string.",
      });
      continue;
    }

    if (seenInputKeys.has(input.key)) {
      issues.push({
        code: "duplicate-input-key",
        componentId: component.id,
        path: pathPrefix,
        message: `Duplicate component input key "${input.key}".`,
      });
      continue;
    }

    seenInputKeys.add(input.key);

    if (!Array.isArray(input.supportedSources) || input.supportedSources.length === 0) {
      issues.push({
        code: "empty-supported-sources",
        componentId: component.id,
        path: `${pathPrefix}.supportedSources`,
        message: `Component input "${input.key}" must declare at least one supported source kind.`,
      });
      continue;
    }

    for (const sourceKind of input.supportedSources) {
      if (!VALID_INPUT_SOURCE_KINDS.has(sourceKind)) {
        issues.push({
          code: "empty-supported-sources",
          componentId: component.id,
          path: `${pathPrefix}.supportedSources`,
          message: `Component input "${input.key}" references unknown source kind "${String(sourceKind)}".`,
        });
      }
    }

    if (
      input.defaultAsset !== undefined &&
      !input.supportedSources.includes("asset-ref")
    ) {
      issues.push({
        code: "invalid-default-asset",
        componentId: component.id,
        path: `${pathPrefix}.defaultAsset`,
        message: `Component input "${input.key}" declares a default asset without supporting asset-ref sources.`,
      });
    }
  }

  return issues;
};

export const validateVizComponentRegistry = (
  components: VizComponentImplementation[],
): VizComponentValidationIssue[] => {
  const issues: VizComponentValidationIssue[] = [];
  const seenComponentIds = new Set<string>();

  for (const component of components) {
    issues.push(...validateVizComponentImplementation(component));

    if (!isNonEmptyString(component.id)) {
      continue;
    }

    if (seenComponentIds.has(component.id)) {
      issues.push({
        code: "duplicate-component-id",
        componentId: component.id,
        path: component.id,
        message: `Duplicate component id "${component.id}" in registry.`,
      });
      continue;
    }

    seenComponentIds.add(component.id);
  }

  return issues;
};

export const createVizComponentRegistry = (
  components: VizComponentImplementation[],
  options: { strict?: boolean } = {},
): VizComponentRegistry => {
  const issues = validateVizComponentRegistry(components);

  if ((options.strict ?? false) && issues.length > 0) {
    throw new Error(
      `Invalid Viz component registry: ${issues.map((issue) => issue.message).join("; ")}`,
    );
  }

  const componentMap = new Map(components.map((component) => [component.id, component]));

  return {
    get: (id) => componentMap.get(id),
    list: () => components,
    getValidationIssues: () => [...issues],
  };
};
