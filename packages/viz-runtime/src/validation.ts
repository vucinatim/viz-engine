import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizArtifactRef,
  type VizAssetRef,
  type VizLayer,
  type VizNodeGraphDocument,
  type VizNodeGraphNode,
  type VizProjectDocument,
} from '@viz-engine/contracts';

export type VizValidationCode =
  | 'invalid-type'
  | 'invalid-value'
  | 'missing-field'
  | 'duplicate-id'
  | 'missing-reference';

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
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const isPositiveInteger = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
};

interface ValueSourceValidationContext {
  artifactIds: Set<string>;
  assetIds: Set<string>;
  graphOutputs?: Map<string, Set<string>>;
}

const validateValueSource = (
  source: unknown,
  path: string,
  context: ValueSourceValidationContext,
  issues: VizProjectValidationIssue[],
): void => {
  if (!isRecord(source)) {
    issues.push({
      code: 'invalid-type',
      path,
      message: `${path} must be a value-source object.`,
    });
    return;
  }

  if (source.kind === 'literal') return;

  if (source.kind === 'asset-ref') {
    if (!isNonEmptyString(source.assetId)) {
      issues.push({
        code: 'missing-field',
        path,
        message: `${path} must define a non-empty assetId.`,
      });
    } else if (!context.assetIds.has(source.assetId)) {
      issues.push({
        code: 'missing-reference',
        path,
        message: `${path} references missing asset "${source.assetId}".`,
      });
    }
    return;
  }

  if (source.kind === 'artifact-feature') {
    if (
      !isNonEmptyString(source.artifactId) ||
      !isNonEmptyString(source.feature)
    ) {
      issues.push({
        code: 'missing-field',
        path,
        message: `${path} must define non-empty artifactId and feature fields.`,
      });
    } else if (!context.artifactIds.has(source.artifactId)) {
      issues.push({
        code: 'missing-reference',
        path,
        message: `${path} references missing artifact "${source.artifactId}".`,
      });
    }
    return;
  }

  if (source.kind === 'graph-output' && context.graphOutputs) {
    if (!isNonEmptyString(source.graphId) || !isNonEmptyString(source.output)) {
      issues.push({
        code: 'missing-field',
        path,
        message: `${path} must define non-empty graphId and output fields.`,
      });
    } else if (!context.graphOutputs.has(source.graphId)) {
      issues.push({
        code: 'missing-reference',
        path,
        message: `${path} references missing graph "${source.graphId}".`,
      });
    } else if (!context.graphOutputs.get(source.graphId)?.has(source.output)) {
      issues.push({
        code: 'missing-reference',
        path,
        message: `${path} references missing output "${source.output}" on graph "${source.graphId}".`,
      });
    }
    return;
  }

  issues.push({
    code: 'invalid-value',
    path,
    message: `${path} has unsupported value-source kind "${String(source.kind)}".`,
  });
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
        code: 'duplicate-id',
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
      code: 'invalid-type',
      path,
      message: `${path} must be an array.`,
    });
    return [];
  }

  const records: T[] = [];
  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      issues.push({
        code: 'invalid-type',
        path: `${path}.${index}`,
        message: `${path}[${index}] must be an object.`,
      });
    } else if (!isNonEmptyString(entry.id)) {
      issues.push({
        code: 'missing-field',
        path: `${path}.${index}.id`,
        message: `${path}[${index}].id must be a non-empty string.`,
      });
    } else {
      records.push(entry as T);
    }
  });
  collectDuplicateIds(records, path, issues);
  return records;
};

const validateLayerReferences = (
  layer: VizLayer,
  artifactIds: Set<string>,
  assetIds: Set<string>,
  graphOutputs: Map<string, Set<string>>,
  issues: VizProjectValidationIssue[],
): void => {
  for (const assetId of layer.requiredAssetIds ?? []) {
    if (!assetIds.has(assetId)) {
      issues.push({
        code: 'missing-reference',
        path: `layers.${layer.id}.requiredAssetIds`,
        message: `Layer "${layer.id}" references missing asset "${assetId}".`,
      });
    }
  }

  for (const artifactId of layer.requiredArtifactIds ?? []) {
    if (!artifactIds.has(artifactId)) {
      issues.push({
        code: 'missing-reference',
        path: `layers.${layer.id}.requiredArtifactIds`,
        message: `Layer "${layer.id}" references missing artifact "${artifactId}".`,
      });
    }
  }

  if (layer.graphId && !graphOutputs.has(layer.graphId)) {
    issues.push({
      code: 'missing-reference',
      path: `layers.${layer.id}.graphId`,
      message: `Layer "${layer.id}" references missing graph "${layer.graphId}".`,
    });
  }

  if (layer.inputs !== undefined && !isRecord(layer.inputs)) {
    issues.push({
      code: 'invalid-type',
      path: `layers.${layer.id}.inputs`,
      message: `Layer "${layer.id}" inputs must be an object.`,
    });
    return;
  }

  for (const [inputKey, source] of Object.entries(layer.inputs ?? {})) {
    validateValueSource(
      source,
      `layers.${layer.id}.inputs.${inputKey}`,
      { artifactIds, assetIds, graphOutputs },
      issues,
    );
  }
};

const validateGraphDocuments = (
  graphs: VizNodeGraphDocument[],
  artifactIds: Set<string>,
  assetIds: Set<string>,
  issues: VizProjectValidationIssue[],
): void => {
  for (const graph of graphs) {
    const graphPath = `graphs.${graph.id}`;
    if (!isNonEmptyString(graph.name)) {
      issues.push({
        code: 'missing-field',
        path: `${graphPath}.name`,
        message: `Graph "${graph.id}" must have a non-empty name.`,
      });
    }
    if (!Array.isArray(graph.nodes)) {
      issues.push({
        code: 'invalid-type',
        path: `${graphPath}.nodes`,
        message: `Graph "${graph.id}" nodes must be an array.`,
      });
    }
    if (!Array.isArray(graph.outputs)) {
      issues.push({
        code: 'invalid-type',
        path: `${graphPath}.outputs`,
        message: `Graph "${graph.id}" outputs must be an array.`,
      });
    }
    if (graph.inputs !== undefined && !isRecord(graph.inputs)) {
      issues.push({
        code: 'invalid-type',
        path: `${graphPath}.inputs`,
        message: `Graph "${graph.id}" inputs must be an object.`,
      });
    } else {
      for (const [inputKey, source] of Object.entries(graph.inputs ?? {})) {
        validateValueSource(
          source,
          `${graphPath}.inputs.${inputKey}`,
          { artifactIds, assetIds },
          issues,
        );
      }
    }

    const nodes = Array.isArray(graph.nodes)
      ? validateObjectArray<VizNodeGraphNode>(
          graph.nodes,
          `${graphPath}.nodes`,
          issues,
        )
      : [];
    const nodeIds = new Set(nodes.map((node) => node.id));
    const dependencies = new Map<string, string[]>();

    for (const node of nodes) {
      if (!isNonEmptyString(node.type)) {
        issues.push({
          code: 'missing-field',
          path: `${graphPath}.nodes.${node.id}.type`,
          message: `Graph "${graph.id}" contains node "${node.id}" without a node type.`,
        });
      }
      if (node.inputs !== undefined && !isRecord(node.inputs)) {
        issues.push({
          code: 'invalid-type',
          path: `${graphPath}.nodes.${node.id}.inputs`,
          message: `Graph "${graph.id}" node "${node.id}" inputs must be an object.`,
        });
        continue;
      }

      for (const [inputKey, binding] of Object.entries(node.inputs ?? {})) {
        const bindingPath = `${graphPath}.nodes.${node.id}.inputs.${inputKey}`;
        if (!isNonEmptyString(inputKey) || !isRecord(binding)) {
          issues.push({
            code: 'invalid-type',
            path: bindingPath,
            message: `Graph "${graph.id}" node "${node.id}" has a malformed input binding.`,
          });
          continue;
        }
        if (binding.kind === 'literal') continue;
        if (binding.kind === 'graph-input') {
          if (
            !isNonEmptyString(binding.inputKey) ||
            !isRecord(graph.inputs) ||
            !(binding.inputKey in graph.inputs)
          ) {
            issues.push({
              code: 'missing-reference',
              path: bindingPath,
              message: `Graph "${graph.id}" node "${node.id}" references missing graph input "${String(binding.inputKey)}".`,
            });
          }
          continue;
        }
        if (
          binding.kind !== 'node-output' ||
          !isNonEmptyString(binding.nodeId) ||
          !isNonEmptyString(binding.output)
        ) {
          issues.push({
            code: 'invalid-value',
            path: bindingPath,
            message: `Graph "${graph.id}" node "${node.id}" has an invalid input binding.`,
          });
          continue;
        }
        if (!nodeIds.has(binding.nodeId)) {
          issues.push({
            code: 'missing-reference',
            path: bindingPath,
            message: `Graph "${graph.id}" node "${node.id}" references missing upstream node "${binding.nodeId}".`,
          });
        } else {
          const sources = dependencies.get(node.id) ?? [];
          sources.push(binding.nodeId);
          dependencies.set(node.id, sources);
        }
      }
    }

    const visited = new Set<string>();
    const visiting = new Set<string>();
    const hasCycle = (nodeId: string): boolean => {
      if (visiting.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      visiting.add(nodeId);
      const cyclic = (dependencies.get(nodeId) ?? []).some(hasCycle);
      visiting.delete(nodeId);
      visited.add(nodeId);
      return cyclic;
    };
    if (nodes.some((node) => hasCycle(node.id))) {
      issues.push({
        code: 'invalid-value',
        path: `${graphPath}.nodes`,
        message: `Graph "${graph.id}" contains a cycle.`,
      });
    }

    const outputKeys = new Set<string>();

    for (const [index, output] of (Array.isArray(graph.outputs)
      ? graph.outputs
      : []
    ).entries()) {
      if (!isRecord(output) || !isNonEmptyString(output.key)) {
        issues.push({
          code: 'missing-field',
          path: `${graphPath}.outputs.${index}`,
          message: `Graph "${graph.id}" output ${index} must be an object with a non-empty key.`,
        });
        continue;
      }
      if (outputKeys.has(output.key)) {
        issues.push({
          code: 'duplicate-id',
          path: `${graphPath}.outputs`,
          message: `Graph "${graph.id}" contains duplicate output key "${output.key}".`,
        });
      }

      outputKeys.add(output.key);

      if ((output.nodeId === undefined) !== (output.output === undefined)) {
        issues.push({
          code: 'missing-reference',
          path: `${graphPath}.outputs.${output.key}`,
          message: `Graph "${graph.id}" output "${output.key}" must define both nodeId and output, or neither.`,
        });
      } else if (output.nodeId !== undefined) {
        if (
          !isNonEmptyString(output.nodeId) ||
          !isNonEmptyString(output.output)
        ) {
          issues.push({
            code: 'invalid-value',
            path: `${graphPath}.outputs.${output.key}`,
            message: `Graph "${graph.id}" output "${output.key}" has an invalid node/output binding.`,
          });
        } else if (!nodeIds.has(output.nodeId)) {
          issues.push({
            code: 'missing-reference',
            path: `${graphPath}.outputs.${output.key}`,
            message: `Graph "${graph.id}" output "${output.key}" references missing node "${output.nodeId}".`,
          });
        }
      }
    }
  }
};

export const validateProjectDocument = (
  value: unknown,
): VizProjectValidationResult => {
  const issues: VizProjectValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        {
          code: 'invalid-type',
          path: '',
          message: 'Project document must be an object.',
        },
      ],
    };
  }

  if (value.schemaVersion !== VIZ_PROJECT_SCHEMA_VERSION) {
    issues.push({
      code: 'invalid-value',
      path: 'schemaVersion',
      message: `schemaVersion must be "${VIZ_PROJECT_SCHEMA_VERSION}".`,
    });
  }

  if (!isNonEmptyString(value.projectId)) {
    issues.push({
      code: 'missing-field',
      path: 'projectId',
      message: 'projectId must be a non-empty string.',
    });
  }

  if (!isNonEmptyString(value.name)) {
    issues.push({
      code: 'missing-field',
      path: 'name',
      message: 'name must be a non-empty string.',
    });
  }

  if (!isRecord(value.timeline)) {
    issues.push({
      code: 'missing-field',
      path: 'timeline',
      message: 'timeline must be present.',
    });
  } else {
    if (!isPositiveInteger(value.timeline.fps)) {
      issues.push({
        code: 'invalid-value',
        path: 'timeline.fps',
        message: 'timeline.fps must be a positive integer.',
      });
    }

    if (!isPositiveInteger(value.timeline.durationInFrames)) {
      issues.push({
        code: 'invalid-value',
        path: 'timeline.durationInFrames',
        message: 'timeline.durationInFrames must be a positive integer.',
      });
    }
  }

  if (!isRecord(value.viewport)) {
    issues.push({
      code: 'missing-field',
      path: 'viewport',
      message: 'viewport must be present.',
    });
  } else {
    if (!isPositiveInteger(value.viewport.width)) {
      issues.push({
        code: 'invalid-value',
        path: 'viewport.width',
        message: 'viewport.width must be a positive integer.',
      });
    }

    if (!isPositiveInteger(value.viewport.height)) {
      issues.push({
        code: 'invalid-value',
        path: 'viewport.height',
        message: 'viewport.height must be a positive integer.',
      });
    }
  }

  const layers = validateObjectArray<VizLayer>(value.layers, 'layers', issues);
  const assetRefs = validateObjectArray<VizAssetRef>(
    value.assetRefs,
    'assetRefs',
    issues,
  );
  const artifactRefs = validateObjectArray<VizArtifactRef>(
    value.artifactRefs,
    'artifactRefs',
    issues,
  );
  const graphs = validateObjectArray<VizNodeGraphDocument>(
    value.graphs,
    'graphs',
    issues,
  );
  for (const asset of assetRefs) {
    if (asset.source === 'external' && !isNonEmptyString(asset.externalUri)) {
      issues.push({
        code: 'missing-field',
        path: `assetRefs.${asset.id}.externalUri`,
        message: `External asset "${asset.id}" must define externalUri.`,
      });
    }
  }

  const assetIds = new Set(assetRefs.map((asset) => asset.id));
  const artifactIds = new Set(artifactRefs.map((artifact) => artifact.id));
  validateGraphDocuments(graphs, artifactIds, assetIds, issues);

  if (!Array.isArray(value.layerOrder)) {
    issues.push({
      code: 'invalid-type',
      path: 'layerOrder',
      message: 'layerOrder must be an array of layer ids.',
    });
  }

  const layerIds = new Set(layers.map((layer) => layer.id));
  const graphOutputs = new Map(
    graphs.map((graph) => [
      graph.id,
      new Set(
        Array.isArray(graph.outputs)
          ? graph.outputs
              .filter(
                (output): output is { key: string } =>
                  isRecord(output) && isNonEmptyString(output.key),
              )
              .map((output) => output.key)
          : [],
      ),
    ]),
  );

  if (Array.isArray(value.layerOrder)) {
    const layerOrderSeen = new Set<string>();

    for (const layerId of value.layerOrder) {
      if (!isNonEmptyString(layerId)) {
        issues.push({
          code: 'invalid-type',
          path: 'layerOrder',
          message: 'layerOrder must only contain strings.',
        });
        continue;
      }

      if (layerOrderSeen.has(layerId)) {
        issues.push({
          code: 'duplicate-id',
          path: 'layerOrder',
          message: `layerOrder contains "${layerId}" more than once.`,
        });
      }

      layerOrderSeen.add(layerId);

      if (!layerIds.has(layerId)) {
        issues.push({
          code: 'missing-reference',
          path: 'layerOrder',
          message: `layerOrder references missing layer "${layerId}".`,
        });
      }
    }
  }

  for (const layer of layers) {
    validateLayerReferences(layer, artifactIds, assetIds, graphOutputs, issues);
  }

  return {
    ok: issues.length === 0,
    issues,
  };
};

export function assertValidProjectDocument(
  value: unknown,
): asserts value is VizProjectDocument {
  const result = validateProjectDocument(value);

  if (!result.ok) {
    const [firstIssue] = result.issues;
    const prefix = firstIssue ? `${firstIssue.path || 'project'}: ` : '';
    throw new Error(
      `Invalid Viz project document. ${prefix}${firstIssue?.message ?? 'Unknown validation error.'}`,
    );
  }
}
