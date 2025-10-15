import { create } from 'zustand';

// Serializable subset of LayerData (excludes runtime-only properties)
export interface SerializableLayer {
  id: string;
  compName: string;
  layerSettings: any; // LayerSettings type
  isExpanded: boolean;
  isDebugEnabled: boolean;
}

// What we track in history - only content, not UI state
export interface EditorHistoryState {
  layers: SerializableLayer[];
  layerValues: Record<string, any>; // LayerValuesStore state
}

export interface EditorHistory {
  past: EditorHistoryState[];
  present: EditorHistoryState;
  future: EditorHistoryState[];
}

interface EditorHistoryStore {
  history: EditorHistory;
  canUndo: boolean;
  canRedo: boolean;
  isBypassingHistory: boolean;
  setHistory: (history: EditorHistory) => void;
  setCanUndo: (canUndo: boolean) => void;
  setCanRedo: (canRedo: boolean) => void;
  resetHistory: () => void;
  setBypassHistory: (bypass: boolean) => void;
}

const createEmptyHistory = (): EditorHistory => ({
  past: [],
  present: {
    layers: [],
    layerValues: {},
  },
  future: [],
});

export const useEditorHistoryStore = create<EditorHistoryStore>((set) => ({
  history: createEmptyHistory(),
  canUndo: false,
  canRedo: false,
  isBypassingHistory: false,
  setHistory: (history) =>
    set({
      history,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    }),
  setCanUndo: (canUndo) => set({ canUndo }),
  setCanRedo: (canRedo) => set({ canRedo }),
  resetHistory: () =>
    set({
      history: createEmptyHistory(),
      canUndo: false,
      canRedo: false,
    }),
  setBypassHistory: (bypass) => set({ isBypassingHistory: bypass }),
}));
