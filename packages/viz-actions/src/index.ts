import type {
  VizActionError,
  VizActionWarning,
  VizGraphInputSetAction,
  VizGraphNodeAddAction,
  VizGraphNodeInputSetAction,
  VizGraphNodeRemoveAction,
  VizGraphOutputSetAction,
  VizGraphRemoveAction,
  VizGraphReplaceAction,
  VizLayerCreateAction,
  VizLayerInputSetAction,
  VizLayerMoveAction,
  VizLayerRemoveAction,
  VizLayerReplaceAction,
  VizLayerSettingsSetAction,
  VizProjectAction,
  VizProjectActionResult,
  VizProjectDocument,
} from "@viz-engine/contracts";

const createGeneratedId = (
  prefix: string,
  existingIds: Iterable<string>,
): string => {
  const used = new Set(existingIds);
  let counter = 1;

  while (used.has(`${prefix}-${counter}`)) {
    counter += 1;
  }

  return `${prefix}-${counter}`;
};

const clampIndex = (index: number, length: number): number => {
  if (!Number.isFinite(index)) {
    return length;
  }

  return Math.max(0, Math.min(length, Math.trunc(index)));
};

const setNestedValue = (
  source: Record<string, unknown> | undefined,
  path: string,
  value: unknown,
): Record<string, unknown> => {
  const segments = path.split(".").filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    throw new Error("Invalid empty settings path.");
  }

  const result: Record<string, unknown> = {
    ...(source ?? {}),
  };

  let cursor: Record<string, unknown> = result;

  for (const segment of segments.slice(0, -1)) {
    const next = cursor[segment];

    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[segment] = {};
    } else {
      cursor[segment] = {
        ...(next as Record<string, unknown>),
      };
    }

    cursor = cursor[segment] as Record<string, unknown>;
  }

  cursor[segments[segments.length - 1]!] = value;
  return result;
};

const replaceById = <T extends { id: string }>(
  items: T[] | undefined,
  id: string,
  nextItem: T,
): T[] => {
  const current = items ?? [];
  let replaced = false;

  const updated = current.map((item) => {
    if (item.id !== id) {
      return item;
    }

    replaced = true;
    return nextItem;
  });

  if (!replaced) {
    updated.push(nextItem);
  }

  return updated;
};

const applyLayerCreate = (
  project: VizProjectDocument,
  action: VizLayerCreateAction,
  warnings: VizActionWarning[],
): VizProjectDocument => {
  const layerIds = new Set(project.layers.map((layer) => layer.id));
  const generatedId = action.payload.layerId ?? action.payload.layer.id;
  const layerId =
    generatedId && !layerIds.has(generatedId)
      ? generatedId
      : createGeneratedId("layer", layerIds);

  if (!generatedId || layerId !== generatedId) {
    warnings.push({
      code: "generated-id",
      message: `Generated layer id "${layerId}" for layer.create action.`,
    });
  }

  const nextLayer = {
    id: layerId,
    ...action.payload.layer,
  };

  const nextLayers = [...project.layers, nextLayer];
  const nextLayerOrder = [...project.layerOrder];
  nextLayerOrder.splice(clampIndex(action.payload.index ?? nextLayerOrder.length, nextLayerOrder.length), 0, layerId);

  return {
    ...project,
    layers: nextLayers,
    layerOrder: nextLayerOrder,
  };
};

const applyLayerRemove = (
  project: VizProjectDocument,
  action: VizLayerRemoveAction,
  errors: VizActionError[],
): VizProjectDocument => {
  if (!project.layers.some((layer) => layer.id === action.payload.layerId)) {
    errors.push({
      code: "missing-layer",
      message: `Cannot remove missing layer "${action.payload.layerId}".`,
    });
    return project;
  }

  return {
    ...project,
    layers: project.layers.filter((layer) => layer.id !== action.payload.layerId),
    layerOrder: project.layerOrder.filter((layerId) => layerId !== action.payload.layerId),
  };
};

const applyLayerMove = (
  project: VizProjectDocument,
  action: VizLayerMoveAction,
  errors: VizActionError[],
): VizProjectDocument => {
  const currentIndex = project.layerOrder.indexOf(action.payload.layerId);

  if (currentIndex === -1) {
    errors.push({
      code: "missing-layer",
      message: `Cannot move missing layer "${action.payload.layerId}".`,
    });
    return project;
  }

  const nextLayerOrder = [...project.layerOrder];
  nextLayerOrder.splice(currentIndex, 1);
  nextLayerOrder.splice(clampIndex(action.payload.index, nextLayerOrder.length), 0, action.payload.layerId);

  return {
    ...project,
    layerOrder: nextLayerOrder,
  };
};

const applyLayerReplace = (
  project: VizProjectDocument,
  action: VizLayerReplaceAction,
  errors: VizActionError[],
): VizProjectDocument => {
  if (
    action.payload.layer.id !== action.payload.layerId ||
    !project.layers.some((layer) => layer.id === action.payload.layerId)
  ) {
    errors.push({
      code: "missing-layer",
      message: `Cannot replace missing layer "${action.payload.layerId}".`,
    });
    return project;
  }

  return {
    ...project,
    layers: project.layers.map((layer) =>
      layer.id === action.payload.layerId ? action.payload.layer : layer,
    ),
  };
};

const applyLayerSettingsSet = (
  project: VizProjectDocument,
  action: VizLayerSettingsSetAction,
  errors: VizActionError[],
): VizProjectDocument => {
  const layer = project.layers.find((entry) => entry.id === action.payload.layerId);

  if (!layer) {
    errors.push({
      code: "missing-layer",
      message: `Cannot set settings on missing layer "${action.payload.layerId}".`,
    });
    return project;
  }

  let nextSettings: Record<string, unknown>;

  try {
    nextSettings = setNestedValue(layer.settings, action.payload.path, action.payload.value);
  } catch (error) {
    errors.push({
      code: "invalid-path",
      message: error instanceof Error ? error.message : "Invalid layer settings path.",
    });
    return project;
  }

  return {
    ...project,
    layers: project.layers.map((entry) =>
      entry.id === action.payload.layerId
        ? {
            ...entry,
            settings: nextSettings,
          }
        : entry,
    ),
  };
};

const applyLayerInputSet = (
  project: VizProjectDocument,
  action: VizLayerInputSetAction,
  errors: VizActionError[],
): VizProjectDocument => {
  const layer = project.layers.find((entry) => entry.id === action.payload.layerId);

  if (!layer) {
    errors.push({
      code: "missing-layer",
      message: `Cannot set input on missing layer "${action.payload.layerId}".`,
    });
    return project;
  }

  const nextInputs = {
    ...(layer.inputs ?? {}),
  };

  if (action.payload.valueSource === null) {
    delete nextInputs[action.payload.inputKey];
  } else {
    nextInputs[action.payload.inputKey] = action.payload.valueSource;
  }

  return {
    ...project,
    layers: project.layers.map((entry) =>
      entry.id === action.payload.layerId
        ? {
            ...entry,
            inputs: nextInputs,
          }
        : entry,
    ),
  };
};

const applyGraphCreate = (
  project: VizProjectDocument,
  name: string,
  graphId: string | undefined,
  warnings: VizActionWarning[],
): VizProjectDocument => {
  const currentGraphs = project.graphs ?? [];
  const graphIds = currentGraphs.map((graph) => graph.id);
  const nextGraphId =
    graphId && !graphIds.includes(graphId)
      ? graphId
      : createGeneratedId("graph", graphIds);

  if (!graphId || nextGraphId !== graphId) {
    warnings.push({
      code: "generated-id",
      message: `Generated graph id "${nextGraphId}" for graph.create action.`,
    });
  }

  return {
    ...project,
    graphs: [
      ...currentGraphs,
      {
        id: nextGraphId,
        name,
        nodes: [],
        outputs: [],
      },
    ],
  };
};

const updateGraphById = (
  project: VizProjectDocument,
  graphId: string,
  updater: (graph: NonNullable<VizProjectDocument["graphs"]>[number]) => NonNullable<VizProjectDocument["graphs"]>[number],
  errors: VizActionError[],
): VizProjectDocument => {
  const currentGraphs = project.graphs ?? [];
  let found = false;

  const nextGraphs = currentGraphs.map((graph) => {
    if (graph.id !== graphId) {
      return graph;
    }

    found = true;
    return updater(graph);
  });

  if (!found) {
    errors.push({
      code: "missing-graph",
      message: `Cannot mutate missing graph "${graphId}".`,
    });
    return project;
  }

  return {
    ...project,
    graphs: nextGraphs,
  };
};

const applyGraphInputSet = (
  project: VizProjectDocument,
  action: VizGraphInputSetAction,
  errors: VizActionError[],
): VizProjectDocument => {
  return updateGraphById(
    project,
    action.payload.graphId,
    (graph) => {
      const nextInputs = {
        ...(graph.inputs ?? {}),
      };

      if (action.payload.source === null) {
        delete nextInputs[action.payload.inputKey];
      } else {
        nextInputs[action.payload.inputKey] = action.payload.source;
      }

      return {
        ...graph,
        inputs: nextInputs,
      };
    },
    errors,
  );
};

const applyGraphReplace = (
  project: VizProjectDocument,
  action: VizGraphReplaceAction,
  errors: VizActionError[],
): VizProjectDocument => {
  if (
    action.payload.graph.id !== action.payload.graphId ||
    !(project.graphs ?? []).some((graph) => graph.id === action.payload.graphId)
  ) {
    errors.push({
      code: "missing-graph",
      message: `Cannot replace missing graph "${action.payload.graphId}".`,
    });
    return project;
  }

  return {
    ...project,
    graphs: (project.graphs ?? []).map((graph) =>
      graph.id === action.payload.graphId ? action.payload.graph : graph,
    ),
  };
};

const applyGraphRemove = (
  project: VizProjectDocument,
  action: VizGraphRemoveAction,
  errors: VizActionError[],
): VizProjectDocument => {
  if (!(project.graphs ?? []).some((graph) => graph.id === action.payload.graphId)) {
    errors.push({
      code: "missing-graph",
      message: `Cannot remove missing graph "${action.payload.graphId}".`,
    });
    return project;
  }

  return {
    ...project,
    graphs: (project.graphs ?? []).filter(
      (graph) => graph.id !== action.payload.graphId,
    ),
    layers: project.layers.map((layer) => ({
      ...layer,
      inputs: Object.fromEntries(
        Object.entries(layer.inputs ?? {}).filter(
          ([, source]) =>
            source.kind !== "graph-output" ||
            source.graphId !== action.payload.graphId,
        ),
      ),
    })),
  };
};

const applyGraphNodeAdd = (
  project: VizProjectDocument,
  action: VizGraphNodeAddAction,
  warnings: VizActionWarning[],
  errors: VizActionError[],
): VizProjectDocument => {
  return updateGraphById(
    project,
    action.payload.graphId,
    (graph) => {
      const nodeIds = graph.nodes.map((node) => node.id);
      const nodeId =
        action.payload.nodeId && !nodeIds.includes(action.payload.nodeId)
          ? action.payload.nodeId
          : createGeneratedId("node", nodeIds);

      if (!action.payload.nodeId || nodeId !== action.payload.nodeId) {
        warnings.push({
          code: "generated-id",
          message: `Generated node id "${nodeId}" for graph.node.add action.`,
        });
      }

      return {
        ...graph,
        nodes: [
          ...graph.nodes,
          {
            id: nodeId,
            type: action.payload.nodeType,
            ...(action.payload.initialInputs === undefined
              ? {}
              : { inputs: action.payload.initialInputs }),
            ...(action.payload.metadata === undefined
              ? {}
              : { metadata: action.payload.metadata }),
          },
        ],
      };
    },
    errors,
  );
};

const applyGraphNodeInputSet = (
  project: VizProjectDocument,
  action: VizGraphNodeInputSetAction,
  errors: VizActionError[],
): VizProjectDocument => {
  return updateGraphById(
    project,
    action.payload.graphId,
    (graph) => {
      let foundNode = false;

      const nextNodes = graph.nodes.map((node) => {
        if (node.id !== action.payload.nodeId) {
          return node;
        }

        foundNode = true;
        const nextInputs = {
          ...(node.inputs ?? {}),
        };

        if (action.payload.binding === null) {
          delete nextInputs[action.payload.inputKey];
        } else {
          nextInputs[action.payload.inputKey] = action.payload.binding;
        }

        return {
          ...node,
          inputs: nextInputs,
        };
      });

      if (!foundNode) {
        errors.push({
          code: "missing-node",
          message: `Cannot set input on missing node "${action.payload.nodeId}" in graph "${action.payload.graphId}".`,
        });
      }

      return {
        ...graph,
        nodes: nextNodes,
      };
    },
    errors,
  );
};

const applyGraphNodeRemove = (
  project: VizProjectDocument,
  action: VizGraphNodeRemoveAction,
  errors: VizActionError[],
): VizProjectDocument => {
  return updateGraphById(
    project,
    action.payload.graphId,
    (graph) => {
      if (!graph.nodes.some((node) => node.id === action.payload.nodeId)) {
        errors.push({
          code: "missing-node",
          message: `Cannot remove missing node "${action.payload.nodeId}" from graph "${action.payload.graphId}".`,
        });
        return graph;
      }

      return {
        ...graph,
        nodes: graph.nodes
          .filter((node) => node.id !== action.payload.nodeId)
          .map((node) => ({
            ...node,
            inputs: Object.fromEntries(
              Object.entries(node.inputs ?? {}).filter(
                ([, binding]) =>
                  binding.kind !== "node-output" ||
                  binding.nodeId !== action.payload.nodeId,
              ),
            ),
          })),
        outputs: graph.outputs.filter(
          (output) => output.nodeId !== action.payload.nodeId,
        ),
      };
    },
    errors,
  );
};

const applyGraphOutputSet = (
  project: VizProjectDocument,
  action: VizGraphOutputSetAction,
  warnings: VizActionWarning[],
  errors: VizActionError[],
): VizProjectDocument => {
  return updateGraphById(
    project,
    action.payload.graphId,
    (graph) => {
      const hasExistingOutput = graph.outputs.some((output) => output.key === action.payload.output.key);

      if (hasExistingOutput) {
        warnings.push({
          code: "replaced-existing-output",
          message: `Replaced existing graph output "${action.payload.output.key}" in graph "${action.payload.graphId}".`,
        });
      }

      return {
        ...graph,
        outputs: [
          ...graph.outputs.filter((output) => output.key !== action.payload.output.key),
          action.payload.output,
        ],
      };
    },
    errors,
  );
};

export const applyVizProjectAction = (
  project: VizProjectDocument,
  action: VizProjectAction,
): VizProjectActionResult => {
  const warnings: VizActionWarning[] = [];
  const errors: VizActionError[] = [];
  let nextProject = project;

  switch (action.type) {
    case "asset.attach":
      nextProject = {
        ...nextProject,
        assetRefs: [...(nextProject.assetRefs ?? []), action.payload.asset],
      };
      break;
    case "asset.replace":
      nextProject = {
        ...nextProject,
        assetRefs: replaceById(nextProject.assetRefs, action.payload.assetId, action.payload.asset),
      };
      break;
    case "artifact.attach":
      nextProject = {
        ...nextProject,
        artifactRefs: [...(nextProject.artifactRefs ?? []), action.payload.artifact],
      };
      break;
    case "layer.create":
      nextProject = applyLayerCreate(nextProject, action, warnings);
      break;
    case "layer.remove":
      nextProject = applyLayerRemove(nextProject, action, errors);
      break;
    case "layer.move":
      nextProject = applyLayerMove(nextProject, action, errors);
      break;
    case "layer.replace":
      nextProject = applyLayerReplace(nextProject, action, errors);
      break;
    case "layer.settings.set":
      nextProject = applyLayerSettingsSet(nextProject, action, errors);
      break;
    case "layer.input.set":
      nextProject = applyLayerInputSet(nextProject, action, errors);
      break;
    case "timeline.set":
      nextProject = {
        ...nextProject,
        timeline: action.payload.timeline,
      };
      break;
    case "graph.create":
      nextProject = applyGraphCreate(nextProject, action.payload.name, action.payload.graphId, warnings);
      break;
    case "graph.replace":
      nextProject = applyGraphReplace(nextProject, action, errors);
      break;
    case "graph.remove":
      nextProject = applyGraphRemove(nextProject, action, errors);
      break;
    case "graph.input.set":
      nextProject = applyGraphInputSet(nextProject, action, errors);
      break;
    case "graph.node.add":
      nextProject = applyGraphNodeAdd(nextProject, action, warnings, errors);
      break;
    case "graph.node.remove":
      nextProject = applyGraphNodeRemove(nextProject, action, errors);
      break;
    case "graph.node.input.set":
      nextProject = applyGraphNodeInputSet(nextProject, action, errors);
      break;
    case "graph.output.set":
      nextProject = applyGraphOutputSet(nextProject, action, warnings, errors);
      break;
    default: {
      const exhaustiveAction: never = action;
      throw new Error(`Unhandled Viz project action: ${JSON.stringify(exhaustiveAction)}`);
    }
  }

  return {
    ok: errors.length === 0,
    project: nextProject,
    warnings,
    errors,
  };
};

export const applyVizProjectActions = (
  project: VizProjectDocument,
  actions: VizProjectAction[],
): VizProjectActionResult => {
  let current = project;
  const warnings: VizActionWarning[] = [];
  const errors: VizActionError[] = [];

  for (const action of actions) {
    const result = applyVizProjectAction(current, action);
    current = result.project;
    warnings.push(...result.warnings);
    errors.push(...result.errors);

    if (!result.ok) {
      break;
    }
  }

  return {
    ok: errors.length === 0,
    project: current,
    warnings,
    errors,
  };
};
