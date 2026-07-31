import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';

import { vizSessionActions, vizSessionHost, vizSessionStore } from './store';
import type { VizSessionState } from './types';

export const useVizSessionSelector = <T>(
  selector: (state: VizSessionState) => T,
) => useStore(vizSessionStore, selector);

export const useLiveLayerSetting = (
  layerId: string,
  path: readonly (string | number)[],
) => {
  const pathKey = JSON.stringify(path);
  const target = useMemo(
    () => ({
      layerId,
      path: JSON.parse(pathKey) as (string | number)[],
    }),
    [layerId, pathKey],
  );
  const subscribe = useCallback(
    (listener: () => void) =>
      vizSessionHost.subscribeLiveLayerSetting(target, listener),
    [target],
  );
  const getSnapshot = useCallback(
    () => vizSessionHost.getLiveLayerSetting(target),
    [target],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

const useHistoryCapability = (capability: 'canUndo' | 'canRedo') =>
  useVizSessionSelector((state) => {
    void state.project.revision;
    void state.history.activeGestureId;
    return vizSessionActions.history[capability]();
  });

export const useCanUndo = () => useHistoryCapability('canUndo');
export const useCanRedo = () => useHistoryCapability('canRedo');
