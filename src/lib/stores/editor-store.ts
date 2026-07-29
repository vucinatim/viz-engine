// Zustand store for editor settings
import { create } from 'zustand';

export interface EditorLayerUiState {
  isExpanded: boolean;
  isDebugEnabled: boolean;
}

interface EditorStore {
  ambientMode: boolean;
  dominantColor: string;
  resolutionMultiplier: number;
  isRhythmLabOpen: boolean;
  rhythmSelection: { start: number; end: number };
  layerUi: Record<string, EditorLayerUiState>;
  setAmbientMode: (ambientMode: boolean) => void;
  setDominantColor: (color: string) => void;
  setResolutionMultiplier: (multiplier: number) => void;
  setIsRhythmLabOpen: (isOpen: boolean) => void;
  setRhythmSelection: (selection: { start: number; end: number }) => void;
  replaceLayerUi: (layerUi: Record<string, EditorLayerUiState>) => void;
  setLayerExpanded: (layerId: string, isExpanded: boolean) => void;
  setAllLayersExpanded: (layerIds: string[], isExpanded: boolean) => void;
  setLayerDebugEnabled: (layerId: string, isDebugEnabled: boolean) => void;
  pruneLayerUi: (layerIds: Iterable<string>) => void;
  rehydrate: (state: Partial<EditorStore>) => void;
}

const useEditorStore = create<EditorStore>((set) => ({
  ambientMode: false,
  dominantColor: '#fff',
  resolutionMultiplier: 1,
  isRhythmLabOpen: false,
  rhythmSelection: { start: 0, end: 0.2 },
  layerUi: {},
  setAmbientMode: (ambientMode) => set({ ambientMode }),
  setDominantColor: (color) => set({ dominantColor: color }),
  setResolutionMultiplier: (resolutionMultiplier) =>
    set({ resolutionMultiplier }),
  setIsRhythmLabOpen: (isRhythmLabOpen) => set({ isRhythmLabOpen }),
  setRhythmSelection: (rhythmSelection) => set({ rhythmSelection }),
  replaceLayerUi: (layerUi) => set({ layerUi }),
  setLayerExpanded: (layerId, isExpanded) =>
    set((state) => ({
      layerUi: {
        ...state.layerUi,
        [layerId]: {
          isExpanded,
          isDebugEnabled: state.layerUi[layerId]?.isDebugEnabled ?? false,
        },
      },
    })),
  setAllLayersExpanded: (layerIds, isExpanded) =>
    set((state) => ({
      layerUi: Object.fromEntries(
        layerIds.map((layerId) => [
          layerId,
          {
            isExpanded,
            isDebugEnabled: state.layerUi[layerId]?.isDebugEnabled ?? false,
          },
        ]),
      ),
    })),
  setLayerDebugEnabled: (layerId, isDebugEnabled) =>
    set((state) => ({
      layerUi: {
        ...state.layerUi,
        [layerId]: {
          isExpanded: state.layerUi[layerId]?.isExpanded ?? false,
          isDebugEnabled,
        },
      },
    })),
  pruneLayerUi: (layerIds) =>
    set((state) => {
      const validLayerIds = new Set(layerIds);
      return {
        layerUi: Object.fromEntries(
          Object.entries(state.layerUi).filter(([layerId]) =>
            validLayerIds.has(layerId),
          ),
        ),
      };
    }),
  rehydrate: (state) => set(state),
}));

export default useEditorStore;
