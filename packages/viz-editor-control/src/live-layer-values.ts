import type {
  VizLayer,
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

const clone = <T>(value: T): T => structuredClone(value);

const targetKey = (
  kind: LiveLayerValueKind,
  target: LiveLayerValueTarget,
): string => JSON.stringify([kind, target.layerId, target.path]);

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

export const createVizLiveLayerValuesController = ({
  getProject,
  getRevision,
  applyAction,
}: {
  getProject(): VizProjectDocument;
  getRevision(): number;
  applyAction(action: VizProjectAction): VizEditorSessionMutationResult;
}) => {
  const listeners = new Map<string, Set<() => void>>();
  let current: LiveLayerValue | undefined;
  let layerValues: Readonly<Record<string, Readonly<VizLayer>>> = {};

  const notify = (kind: LiveLayerValueKind, target: LiveLayerValueTarget) => {
    for (const listener of listeners.get(targetKey(kind, target)) ?? []) {
      listener();
    }
  };

  const cancelAll = () => {
    if (!current) {
      return;
    }
    const { kind, target } = current;
    current = undefined;
    layerValues = {};
    notify(kind, target);
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
    cancelAll();
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
  ): VizLiveLayerSettingSnapshot => ({
    target: edit.target,
    value: edit.value,
    settings: edit.layer.settings ?? {},
    layer: edit.layer,
    baseRevision: edit.baseRevision,
  });

  return {
    getLayerValues: () => layerValues,
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
  };
};
