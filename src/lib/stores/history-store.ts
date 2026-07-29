import { useStore } from 'zustand';

import { vizSessionActions, vizSessionStore } from '@/lib/viz-session';

export type HistoryContext = 'layer-editor' | 'node-editor';

interface HistoryStore {
  isNodeEditorFocused: boolean;
  activeGestureId: string | null;
  undo: () => void;
  redo: () => void;
  undoLayerEditor: () => void;
  redoLayerEditor: () => void;
  undoNodeEditor: (networkId: string) => void;
  redoNodeEditor: (networkId: string) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  startNodeDrag: (networkId: string) => void;
  endNodeDrag: (networkId: string) => void;
  setNodeEditorFocused: (focused: boolean) => void;
  reset: () => void;
}

const selectHistoryStore = (): HistoryStore => {
  const history = vizSessionStore.getState().history;

  return {
    ...history,
    undo: vizSessionActions.history.undo,
    redo: vizSessionActions.history.redo,
    undoLayerEditor: vizSessionActions.history.undo,
    redoLayerEditor: vizSessionActions.history.redo,
    undoNodeEditor: vizSessionActions.history.undoNodeEditor,
    redoNodeEditor: vizSessionActions.history.redoNodeEditor,
    canUndo: vizSessionActions.history.canUndo,
    canRedo: vizSessionActions.history.canRedo,
    startNodeDrag: vizSessionActions.history.startNodeDrag,
    endNodeDrag: vizSessionActions.history.endNodeDrag,
    setNodeEditorFocused: vizSessionActions.history.setNodeEditorFocused,
    reset: vizSessionActions.history.reset,
  };
};

type HistorySelector<T> = (state: HistoryStore) => T;
type HistoryListener = (state: HistoryStore, previousState: HistoryStore) => void;

export const useHistoryStore = Object.assign(
  <T>(selector: HistorySelector<T>) =>
    useStore(vizSessionStore, () => selector(selectHistoryStore())),
  {
    getState: () => selectHistoryStore(),
    subscribe: (listener: HistoryListener) =>
      vizSessionStore.subscribe((state, previousState) =>
        listener(
          { ...selectHistoryStore(), ...state.history },
          { ...selectHistoryStore(), ...previousState.history },
        ),
      ),
  },
);
