import { useStore } from 'zustand';

import { vizSessionActions, vizSessionStore } from './store';
import type { VizSessionState } from './types';

export const useVizSessionSelector = <T>(
  selector: (state: VizSessionState) => T,
) => useStore(vizSessionStore, selector);

const useHistoryCapability = (capability: 'canUndo' | 'canRedo') =>
  useVizSessionSelector((state) => {
    void state.project.revision;
    void state.history.activeGestureId;
    return vizSessionActions.history[capability]();
  });

export const useCanUndo = () => useHistoryCapability('canUndo');
export const useCanRedo = () => useHistoryCapability('canRedo');
