import { useStore } from 'zustand';

import {
  vizSessionActions,
  vizSessionStore,
  type LayerEditorHistory,
  type LayerEditorHistoryState,
  type NodeNetworkHistory,
} from '@/lib/viz-session';

export type HistoryContext = 'layer-editor' | 'node-editor';

interface HistoryStore {
  layerHistory: LayerEditorHistory;
  nodeHistories: Record<string, NodeNetworkHistory>;
  isNodeEditorFocused: boolean;
  isBypassingHistory: boolean;
  nodeDragBypass: Record<string, boolean>;
  debounceTimer: number | null;
  initializeLayerHistory: () => void;
  pushLayerHistory: (skipDebounce?: boolean) => void;
  flushPendingLayerHistory: () => void;
  applyLayerHistoryState: (state: LayerEditorHistoryState) => void;
  undoLayerEditor: () => void;
  redoLayerEditor: () => void;
  resetLayerHistory: () => void;
  initializeNodeHistory: (networkId: string) => void;
  pushNodeHistory: (networkId: string, nodes: any[], edges: any[]) => void;
  undoNodeEditor: (networkId: string) => void;
  redoNodeEditor: (networkId: string) => void;
  startNodeDrag: (networkId: string) => void;
  endNodeDrag: (networkId: string) => void;
  setNodeEditorFocused: (focused: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setBypassHistory: (bypass: boolean) => void;
}

const selectHistoryStore = (): HistoryStore => {
  const history = vizSessionStore.getState().history;

  return {
    layerHistory: history.layerHistory,
    nodeHistories: history.nodeHistories,
    isNodeEditorFocused: history.isNodeEditorFocused,
    isBypassingHistory: history.isBypassingHistory,
    nodeDragBypass: history.nodeDragBypass,
    debounceTimer: history.debounceTimer,
    initializeLayerHistory: vizSessionActions.history.initializeLayerHistory,
    pushLayerHistory: vizSessionActions.history.pushLayerHistory,
    flushPendingLayerHistory: vizSessionActions.history.flushPendingLayerHistory,
    applyLayerHistoryState: vizSessionActions.history.applyLayerHistoryState,
    undoLayerEditor: vizSessionActions.history.undoLayerEditor,
    redoLayerEditor: vizSessionActions.history.redoLayerEditor,
    resetLayerHistory: vizSessionActions.history.resetLayerHistory,
    initializeNodeHistory: vizSessionActions.history.initializeNodeHistory,
    pushNodeHistory: vizSessionActions.history.pushNodeHistory,
    undoNodeEditor: vizSessionActions.history.undoNodeEditor,
    redoNodeEditor: vizSessionActions.history.redoNodeEditor,
    startNodeDrag: vizSessionActions.history.startNodeDrag,
    endNodeDrag: vizSessionActions.history.endNodeDrag,
    setNodeEditorFocused: vizSessionActions.history.setNodeEditorFocused,
    undo: vizSessionActions.history.undo,
    redo: vizSessionActions.history.redo,
    canUndo: vizSessionActions.history.canUndo,
    canRedo: vizSessionActions.history.canRedo,
    setBypassHistory: vizSessionActions.history.setBypassHistory,
  };
};

type HistorySelector<T> = (state: HistoryStore) => T;
type HistoryListener = (state: HistoryStore, previousState: HistoryStore) => void;

export const useHistoryStore = Object.assign(
  <T>(selector: HistorySelector<T>) =>
    useStore(vizSessionStore, () => selector(selectHistoryStore())),
  {
    getState: () => selectHistoryStore(),
    setState: (partial: Partial<HistoryStore>) =>
      vizSessionActions.history.setState({
        layerHistory: partial.layerHistory,
        nodeHistories: partial.nodeHistories,
        isNodeEditorFocused: partial.isNodeEditorFocused,
        isBypassingHistory: partial.isBypassingHistory,
        nodeDragBypass: partial.nodeDragBypass,
        debounceTimer: partial.debounceTimer,
      }),
    subscribe: (listener: HistoryListener) =>
      vizSessionStore.subscribe((state, previousState) =>
        listener(
          {
            ...selectHistoryStore(),
            ...state.history,
          },
          {
            ...selectHistoryStore(),
            ...previousState.history,
          },
        ),
      ),
  },
);
