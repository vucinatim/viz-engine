import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizArtifactRef,
  type VizAssetRef,
  type VizLayer,
  type VizNodeGraphRef,
  type VizProjectDocument,
} from "@viz-engine/contracts";

export type VizValidationCode =
  | "invalid-type"
  | "invalid-value"
  | "missing-field"
  | "duplicate-id"
  | "missing-reference";

export interface VizProjectValidationIssue {
  code: VizValidationCode;
  path: string;
  message: string;
}

export interface VizProjectValidationResult {
  ok: boolean;
  issues: VizProjectValidationIssue[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isPositiveInteger = (value: unknown): value is number => {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
};

const collectDuplicateIds = (
  values: Array<{ id: string }>,
  path: string,
  issues: VizProjectValidationIssue[],
): void => {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value.id)) {
      issues.push({
        code: "duplicate-id",
        path,
        message: `Duplicate id "${value.id}" found in ${path}.`,
      });
      continue;
    }

    seen.add(value.id);
  }
};

const validateObjectArray = <T extends { id: string }>(
  value: unknown,
  path: string,
  issues: VizProjectValidationIssue[],
): T[] => {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    issues.push({
      code: "invalid-type",
      path,
      message: `${path} must be an array.`,
    });
    return [];
  }

  const records = value.filter((entry): entry is T => isRecord(entry) && isNonEmptyString(entry.id));
  collectDuplicateIds(records, path, issues);
  return records;
};

const validateLayerReferences = (
  layer: VizLayer,
  artifactIds: Set<string>,
  assetIds: Set<string>,
  graphIds: Set<string>,
  issues: VizProjectValidationIssue[],
): void => {
  for (const assetId of layer.requiredAssetIds ?? []) {
    if (!assetIds.has(assetId)) {
      issues.push({
        code: "missing-reference",
        path: `layers.${layer.id}.requiredAssetIds`,
        message: `Layer "${layer.id}" references missing asset "${assetId}".`,
      });
    }
  }

  for (const artifactId of layer.requiredArtifactIds ?? []) {
    if (!artifactIds.has(artifactId)) {
      issues.push({
        code: "missing-reference",
        path: `layers.${layer.id}.requiredArtifactIds`,
        message: `Layer "${layer.id}" references missing artifact "${artifactId}".`,
      });
    }
  }

  if (layer.graphId && !graphIds.has(layer.graphId)) {
    issues.push({
      code: "missing-reference",
      path: `layers.${layer.id}.graphId`,
      message: `Layer "${layer.id}" references missing graph "${layer.graphId}".`,
    });
  }
};

export const validateProjectDocument = (value: unknown): VizProjectValidationResult => {
  const issues: VizProjectValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        {
          code: "invalid-type",
          path: "",
          message: "Project document must be an object.",
        },
      ],
    };
  }

  if (value.schemaVersion !== VIZ_PROJECT_SCHEMA_VERSION) {
    issues.push({
      code: "invalid-value",
      path: "schemaVersion",
      message: `schemaVersion must be "${VIZ_PROJECT_SCHEMA_VERSION}".`,
    });
  }

  if (!isNonEmptyString(value.projectId)) {
    issues.push({
      code: "missing-field",
      path: "projectId",
      message: "projectId must be a non-empty string.",
    });
  }

  if (!isNonEmptyString(value.name)) {
    issues.push({
      code: "missing-field",
      path: "name",
      message: "name must be a non-empty string.",
    });
  }

  if (!isRecord(value.timeline)) {
    issues.push({
      code: "missing-field",
      path: "timeline",
      message: "timeline must be present.",
    });
  } else {
    if (!isPositiveInteger(value.timeline.fps)) {
      issues.push({
        code: "invalid-value",
        path: "timeline.fps",
        message: "timeline.fps must be a positive integer.",
      });
    }

    if (!isPositiveInteger(value.timeline.durationInFrames)) {
      issues.push({
        code: "invalid-value",
        path: "timeline.durationInFrames",
        message: "timeline.durationInFrames must be a positive integer.",
      });
    }
  }

  if (!isRecord(value.viewport)) {
    issues.push({
      code: "missing-field",
      path: "viewport",
      message: "viewport must be present.",
    });
  } else {
    if (!isPositiveInteger(value.viewport.width)) {
      issues.push({
        code: "invalid-value",
        path: "viewport.width",
        message: "viewport.width must be a positive integer.",
      });
    }

    if (!isPositiveInteger(value.viewport.height)) {
      issues.push({
        code: "invalid-value",
        path: "viewport.height",
        message: "viewport.height must be a positive integer.",
      });
    }
  }

  const layers = validateObjectArray<VizLayer>(value.layers, "layers", issues);
  const assetRefs = validateObjectArray<VizAssetRef>(value.assetRefs, "assetRefs", issues);
  const artifactRefs = validateObjectArray<VizArtifactRef>(value.artifactRefs, "artifactRefs", issues);
  const graphs = validateObjectArray<VizNodeGraphRef>(value.graphs, "graphs", issues);

  if (!Array.isArray(value.layerOrder)) {
    issues.push({
      code: "invalid-type",
      path: "layerOrder",
      message: "layerOrder must be an array of layer ids.",
    });
  }

  const layerIds = new Set(layers.map((layer) => layer.id));
  const assetIds = new Set(assetRefs.map((asset) => asset.id));
  const artifactIds = new Set(artifactRefs.map((artifact) => artifact.id));
  const graphIds = new Set(graphs.map((graph) => graph.id));

  if (Array.isArray(value.layerOrder)) {
    const layerOrderSeen = new Set<string>();

    for (const layerId of value.layerOrder) {
      if (!isNonEmptyString(layerId)) {
        issues.push({
          code: "invalid-type",
          path: "layerOrder",
          message: "layerOrder must only contain strings.",
        });
        continue;
      }

      if (layerOrderSeen.has(layerId)) {
        issues.push({
          code: "duplicate-id",
          path: "layerOrder",
          message: `layerOrder contains "${layerId}" more than once.`,
        });
      }

      layerOrderSeen.add(layerId);

      if (!layerIds.has(layerId)) {
        issues.push({
          code: "missing-reference",
          path: "layerOrder",
          message: `layerOrder references missing layer "${layerId}".`,
        });
      }
    }
  }

  for (const layer of layers) {
    validateLayerReferences(layer, artifactIds, assetIds, graphIds, issues);
  }

  return {
    ok: issues.length === 0,
    issues,
  };
};

export function assertValidProjectDocument(value: unknown): asserts value is VizProjectDocument {
  const result = validateProjectDocument(value);

  if (!result.ok) {
    const [firstIssue] = result.issues;
    const prefix = firstIssue ? `${firstIssue.path || "project"}: ` : "";
    throw new Error(`Invalid Viz project document. ${prefix}${firstIssue?.message ?? "Unknown validation error."}`);
  }
}
