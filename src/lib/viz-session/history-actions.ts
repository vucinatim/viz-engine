import type { VizSessionHost } from '@viz-engine/editor-control';

import type { VizSessionHistoryState } from './types';

interface CreateStudioHistoryActionsOptions {
  host: VizSessionHost;
  getState(): VizSessionHistoryState;
  replaceState(state: VizSessionHistoryState): void;
  syncProject(): void;
}

export const createStudioHistoryActions = ({
  host,
  getState,
  replaceState,
  syncProject,
}: CreateStudioHistoryActionsOptions) => {
  const undo = () => {
    if (!host.canUndo()) {
      return false;
    }
    host.undo();
    syncProject();
    return true;
  };
  const redo = () => {
    if (!host.canRedo()) {
      return false;
    }
    host.redo();
    syncProject();
    return true;
  };

  return {
    undo,
    redo,
    undoNodeEditor(_networkId: string) {
      return undo();
    },
    redoNodeEditor(_networkId: string) {
      return redo();
    },
    canUndo() {
      return host.canUndo();
    },
    canRedo() {
      return host.canRedo();
    },
    startNodeDrag(networkId: string) {
      host.beginHistoryGroup();
      replaceState({
        ...getState(),
        activeGestureId: networkId,
      });
    },
    endNodeDrag(networkId: string) {
      if (getState().activeGestureId !== networkId) {
        return;
      }
      host.endHistoryGroup();
      replaceState({
        ...getState(),
        activeGestureId: null,
      });
    },
    setNodeEditorFocused(isNodeEditorFocused: boolean) {
      replaceState({
        ...getState(),
        isNodeEditorFocused,
      });
    },
    reset() {
      replaceState({
        isNodeEditorFocused: false,
        activeGestureId: null,
        recentAgentActivity: null,
      });
    },
    setState(partial: Partial<VizSessionHistoryState>) {
      replaceState({
        ...getState(),
        ...partial,
      });
    },
  };
};
