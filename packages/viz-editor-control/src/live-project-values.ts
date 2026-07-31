import type {
  VizLayer,
  VizNodeGraphDocument,
  VizProjectAction,
  VizProjectDocument,
} from '@viz-engine/contracts';
import type { VizEditorSessionMutationResult } from '@viz-engine/editor-session';

export interface VizLiveLayerSettingTarget {
  layerId: string;
  path: readonly (string | number)[];
}

export interface VizLiveLayerSettingSnapshot {
  target: VizLiveLayerSettingTarget;
  value: unknown;
  settings: Readonly<Record<string, unknown>>;
  layer: Readonly<VizLayer>;
  baseRevision: number;
}

export interface VizLiveLayerPropertyTarget {
  layerId: string;
  path: readonly (string | number)[];
}

export interface VizLiveLayerPropertySnapshot {
  target: VizLiveLayerPropertyTarget;
  value: unknown;
  layer: Readonly<VizLayer>;
  baseRevision: number;
}

export interface VizLiveGraphNodeInputTarget {
  graphId: string;
  nodeId: string;
  inputKey: string;
}

export interface VizLiveGraphNodeInputSnapshot {
  target: VizLiveGraphNodeInputTarget;
  value: unknown;
  graph: Readonly<VizNodeGraphDocument>;
  baseRevision: number;
}

type LiveLayerValueKind = 'property' | 'setting';
type LiveLayerValueTarget =
  VizLiveLayerPropertyTarget | VizLiveLayerSettingTarget;

interface LiveLayerValue {
  kind: LiveLayerValueKind;
  target: LiveLayerValueTarget;
  value: unknown;
  layer: VizLayer;
  baseRevision: number;
}

interface LiveGraphGesture {
  graphId: string;
  graph: VizNodeGraphDocument;
  baseRevision: number;
  changes: Map<string, VizLiveGraphNodeInputSnapshot>;
}

const clone = <T>(value: T): T => structuredClone(value);

const targetKey = (
  kind: LiveLayerValueKind,
  target: LiveLayerValueTarget,
): string => JSON.stringify([kind, target.layerId, target.path]);

const graphTargetKey = (target: VizLiveGraphNodeInputTarget): string =>
  JSON.stringify([
    'graph-node-input',
    target.graphId,
    target.nodeId,
    target.inputKey,
  ]);

const setValueAtPath = (
  current: unknown,
  path: readonly (string | number)[],
  value: unknown,
): unknown => {
  if (path.length === 0) {
    return clone(value);
  }
  const segment = path[0]!;
  const container = (
    Array.isArray(current)
      ? [...current]
      : typeof current === 'object' && current !== null
        ? { ...(current as Record<string, unknown>) }
        : typeof segment === 'number'
          ? []
          : {}
  ) as Record<string | number, unknown>;
  container[segment] = setValueAtPath(
    (current as Record<string | number, unknown> | undefined)?.[segment],
    path.slice(1),
    value,
  );
  return container;
};

const getValueAtPath = (
  current: unknown,
  path: readonly (string | number)[],
): unknown => {
  let value = current;
  for (const segment of path) {
    value =
      typeof value === 'object' && value !== null
        ? (value as Record<string | number, unknown>)[segment]
        : undefined;
  }
  return value;
};

export const createVizLiveProjectValuesController = ({
  getProject,
  getRevision,
  applyAction,
  applyActions,
}: {
  getProject(): Readonly<VizProjectDocument>;
  getRevision(): number;
  applyAction(action: VizProjectAction): VizEditorSessionMutationResult;
  applyActions(actions: VizProjectAction[]): VizEditorSessionMutationResult;
}) => {
  const listeners = new Map<string, Set<() => void>>();
  const valueListeners = new Set<() => void>();
  let current: LiveLayerValue | undefined;
  let currentGraphGesture: LiveGraphGesture | undefined;
  let layerValues: Readonly<Record<string, Readonly<VizLayer>>> = {};
  let graphValues: Readonly<Record<string, Readonly<VizNodeGraphDocument>>> =
    {};
  let settingSnapshot:
    | {
        edit: LiveLayerValue;
        value: VizLiveLayerSettingSnapshot;
      }
    | undefined;

  const notify = (kind: LiveLayerValueKind, target: LiveLayerValueTarget) => {
    for (const listener of listeners.get(targetKey(kind, target)) ?? []) {
      listener();
    }
    for (const listener of valueListeners) {
      listener();
    }
  };

  const cancelAll = () => {
    if (!current && !currentGraphGesture) {
      return;
    }
    const layerEdit = current;
    const graphGesture = currentGraphGesture;
    current = undefined;
    currentGraphGesture = undefined;
    layerValues = {};
    graphValues = {};
    settingSnapshot = undefined;
    if (layerEdit) {
      notify(layerEdit.kind, layerEdit.target);
    } else {
      for (const change of graphGesture?.changes.values() ?? []) {
        for (const listener of listeners.get(graphTargetKey(change.target)) ??
          []) {
          listener();
        }
      }
      for (const listener of valueListeners) {
        listener();
      }
    }
  };

  const begin = (
    kind: LiveLayerValueKind,
    target: LiveLayerValueTarget,
  ): LiveLayerValue => {
    if (
      current &&
      targetKey(current.kind, current.target) === targetKey(kind, target)
    ) {
      return current;
    }
    if (currentGraphGesture) {
      cancelAll();
    }
    if (target.path.length === 0) {
      throw new Error(`A live layer ${kind} path cannot be empty.`);
    }

    const layer = getProject().layers.find(
      (candidate) => candidate.id === target.layerId,
    );
    if (!layer) {
      throw new Error(`Cannot edit missing layer "${target.layerId}".`);
    }
    const valuePath =
      kind === 'setting' ? ['settings', ...target.path] : target.path;
    current = {
      kind,
      target: { layerId: target.layerId, path: [...target.path] },
      value: clone(getValueAtPath(layer, valuePath)),
      layer: clone(layer),
      baseRevision: getRevision(),
    };
    layerValues = { [target.layerId]: current.layer };
    notify(kind, target);
    return current;
  };

  const beginGraphGesture = (graphId: string): LiveGraphGesture => {
    if (currentGraphGesture?.graphId === graphId) {
      return currentGraphGesture;
    }
    cancelAll();
    const graph = getProject().graphs?.find(
      (candidate) => candidate.id === graphId,
    );
    if (!graph) {
      throw new Error(`Cannot edit missing graph "${graphId}".`);
    }
    currentGraphGesture = {
      graphId,
      graph: clone(graph),
      baseRevision: getRevision(),
      changes: new Map(),
    };
    graphValues = { [graphId]: currentGraphGesture.graph };
    for (const listener of valueListeners) {
      listener();
    }
    return currentGraphGesture;
  };

  const updateGraphNodeInput = (
    target: VizLiveGraphNodeInputTarget,
    value: unknown,
  ): VizLiveGraphNodeInputSnapshot => {
    const gesture = beginGraphGesture(target.graphId);
    const nodeIndex = gesture.graph.nodes.findIndex(
      (candidate) => candidate.id === target.nodeId,
    );
    if (nodeIndex < 0) {
      throw new Error(
        `Cannot edit missing node "${target.nodeId}" in graph "${target.graphId}".`,
      );
    }
    const node = gesture.graph.nodes[nodeIndex]!;
    const graph = {
      ...gesture.graph,
      nodes: gesture.graph.nodes.with(nodeIndex, {
        ...node,
        inputs: {
          ...node.inputs,
          [target.inputKey]: {
            kind: 'literal',
            value: clone(value),
          },
        },
      }),
    };
    const snapshot: VizLiveGraphNodeInputSnapshot = {
      target: { ...target },
      value: clone(value),
      graph,
      baseRevision: gesture.baseRevision,
    };
    const changes = new Map(gesture.changes);
    changes.set(graphTargetKey(target), snapshot);
    currentGraphGesture = { ...gesture, graph, changes };
    graphValues = { [target.graphId]: graph };
    for (const listener of listeners.get(graphTargetKey(target)) ?? []) {
      listener();
    }
    for (const listener of valueListeners) {
      listener();
    }
    return snapshot;
  };

  const commitGraphGesture = (
    graphId: string,
  ): VizEditorSessionMutationResult | undefined => {
    const gesture = currentGraphGesture;
    if (!gesture || gesture.graphId !== graphId) {
      return undefined;
    }
    if (gesture.baseRevision !== getRevision()) {
      cancelAll();
      throw new Error(
        'The project changed during the live graph gesture; the transient edit was cancelled.',
      );
    }
    const actions = [...gesture.changes.values()].map(
      (change): VizProjectAction => ({
        type: 'graph.node.input.set',
        payload: {
          graphId: change.target.graphId,
          nodeId: change.target.nodeId,
          inputKey: change.target.inputKey,
          binding: { kind: 'literal', value: clone(change.value) },
        },
      }),
    );
    if (actions.length === 0) {
      cancelAll();
      return undefined;
    }
    const result = applyActions(actions);
    cancelAll();
    return result;
  };

  const update = (
    kind: LiveLayerValueKind,
    target: LiveLayerValueTarget,
    value: unknown,
  ): LiveLayerValue => {
    const edit = begin(kind, target);
    const valuePath =
      kind === 'setting' ? ['settings', ...target.path] : target.path;
    current = {
      ...edit,
      value: clone(value),
      layer: setValueAtPath(edit.layer, valuePath, value) as VizLayer,
    };
    layerValues = { [target.layerId]: current.layer };
    notify(kind, target);
    return current;
  };

  const commit = (
    kind: LiveLayerValueKind,
    target: LiveLayerValueTarget,
    value?: unknown,
  ): VizEditorSessionMutationResult | undefined => {
    if (
      !current ||
      targetKey(current.kind, current.target) !== targetKey(kind, target)
    ) {
      if (value === undefined) {
        return undefined;
      }
      update(kind, target, value);
    } else if (value !== undefined) {
      update(kind, target, value);
    }

    const edit = current;
    if (!edit) {
      return undefined;
    }
    if (edit.baseRevision !== getRevision()) {
      cancelAll();
      throw new Error(
        'The project changed during the live layer gesture; the transient edit was cancelled.',
      );
    }
    const action: VizProjectAction =
      edit.kind === 'setting'
        ? {
            type: 'layer.settings.set',
            payload: {
              layerId: edit.target.layerId,
              path: edit.target.path.join('.'),
              value: edit.value,
            },
          }
        : {
            type: 'layer.replace',
            payload: {
              layerId: edit.target.layerId,
              layer: edit.layer,
            },
          };
    const result = applyAction(action);
    cancelAll();
    return result;
  };

  const subscribe = (
    kind: LiveLayerValueKind,
    target: LiveLayerValueTarget,
    listener: () => void,
  ) => {
    const key = targetKey(kind, target);
    const targetListeners = listeners.get(key) ?? new Set();
    targetListeners.add(listener);
    listeners.set(key, targetListeners);
    return () => {
      targetListeners.delete(listener);
      if (targetListeners.size === 0) {
        listeners.delete(key);
      }
    };
  };

  const get = (
    kind: LiveLayerValueKind,
    target: LiveLayerValueTarget,
  ): LiveLayerValue | undefined =>
    current &&
    targetKey(current.kind, current.target) === targetKey(kind, target)
      ? current
      : undefined;
  const toSettingSnapshot = (
    edit: LiveLayerValue,
  ): VizLiveLayerSettingSnapshot => {
    if (settingSnapshot?.edit === edit) {
      return settingSnapshot.value;
    }
    const value = {
      target: edit.target,
      value: edit.value,
      settings: edit.layer.settings ?? {},
      layer: edit.layer,
      baseRevision: edit.baseRevision,
    };
    settingSnapshot = { edit, value };
    return value;
  };

  return {
    getLayerValues: () => layerValues,
    getGraphValues: () => graphValues,
    subscribe: (listener: () => void) => {
      valueListeners.add(listener);
      return () => {
        valueListeners.delete(listener);
      };
    },
    cancelAll,
    getSetting: (target: VizLiveLayerSettingTarget) => {
      const edit = get('setting', target);
      return edit ? toSettingSnapshot(edit) : undefined;
    },
    beginSetting: (target: VizLiveLayerSettingTarget) => {
      return toSettingSnapshot(begin('setting', target));
    },
    updateSetting: (target: VizLiveLayerSettingTarget, value: unknown) => {
      return toSettingSnapshot(update('setting', target, value));
    },
    commitSetting: (target: VizLiveLayerSettingTarget, value?: unknown) =>
      commit('setting', target, value),
    cancelSetting: (target: VizLiveLayerSettingTarget) => {
      if (get('setting', target)) {
        cancelAll();
      }
    },
    subscribeSetting: (
      target: VizLiveLayerSettingTarget,
      listener: () => void,
    ) => subscribe('setting', target, listener),
    getProperty: (target: VizLiveLayerPropertyTarget) =>
      get('property', target) as VizLiveLayerPropertySnapshot | undefined,
    beginProperty: (target: VizLiveLayerPropertyTarget) =>
      begin('property', target),
    updateProperty: (target: VizLiveLayerPropertyTarget, value: unknown) =>
      update('property', target, value),
    commitProperty: (target: VizLiveLayerPropertyTarget, value?: unknown) =>
      commit('property', target, value),
    cancelProperty: (target: VizLiveLayerPropertyTarget) => {
      if (get('property', target)) {
        cancelAll();
      }
    },
    subscribeProperty: (
      target: VizLiveLayerPropertyTarget,
      listener: () => void,
    ) => subscribe('property', target, listener),
    getGraphNodeInput: (target: VizLiveGraphNodeInputTarget) =>
      currentGraphGesture?.changes.get(graphTargetKey(target)),
    beginGraphGesture,
    updateGraphNodeInput,
    commitGraphGesture,
    cancelGraphGesture: (graphId: string) => {
      if (currentGraphGesture?.graphId === graphId) {
        cancelAll();
      }
    },
    subscribeGraphNodeInput: (
      target: VizLiveGraphNodeInputTarget,
      listener: () => void,
    ) => {
      const key = graphTargetKey(target);
      const targetListeners = listeners.get(key) ?? new Set();
      targetListeners.add(listener);
      listeners.set(key, targetListeners);
      return () => {
        targetListeners.delete(listener);
        if (targetListeners.size === 0) {
          listeners.delete(key);
        }
      };
    },
  };
};
