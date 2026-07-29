import type { LayerRenderFunction } from '@/lib/editor-layer-types';
import type {
  VizSessionRuntimePreviewFrame,
  VizSessionRuntimePreviewLayerResult,
} from '@/lib/viz-session/types';
import type { PlayerRef } from '@remotion/player';
import { create } from 'zustand';

interface EditorRuntimePreviewAttachmentStore {
  layerRenderFunctions: Map<string, LayerRenderFunction>;
  mirrorCanvasesByLayerId: Record<string, HTMLCanvasElement[]>;
  playerRef: { current: PlayerRef | null };
  registerMirrorCanvas: (id: string, canvas: HTMLCanvasElement) => void;
  unregisterMirrorCanvas: (id: string, canvas: HTMLCanvasElement) => void;
  registerLayerRenderFunction: (id: string, fn: LayerRenderFunction) => void;
  unregisterLayerRenderFunction: (id: string) => void;
  setPlayerRef: (playerRef: { current: PlayerRef | null }) => void;
  pruneLayerAttachments: (activeLayerIds: string[]) => void;
  renderAllLayers: (
    frame: VizSessionRuntimePreviewFrame,
  ) => Record<string, VizSessionRuntimePreviewLayerResult>;
  reset: () => void;
}

const filterActiveLayerEntries = <T>(
  entries: Record<string, T>,
  activeLayerIds: Set<string>,
) =>
  Object.fromEntries(
    Object.entries(entries).filter(([layerId]) => activeLayerIds.has(layerId)),
  );

const useEditorRuntimePreviewAttachmentStore =
  create<EditorRuntimePreviewAttachmentStore>((set, get) => ({
    layerRenderFunctions: new Map(),
    mirrorCanvasesByLayerId: {},
    playerRef: { current: null },
    registerLayerRenderFunction: (id, fn) =>
      set((state) => {
        const layerRenderFunctions = new Map(state.layerRenderFunctions);
        layerRenderFunctions.set(id, fn);
        return { layerRenderFunctions };
      }),
    unregisterLayerRenderFunction: (id) =>
      set((state) => {
        if (!state.layerRenderFunctions.has(id)) {
          return state;
        }

        const layerRenderFunctions = new Map(state.layerRenderFunctions);
        layerRenderFunctions.delete(id);
        return { layerRenderFunctions };
      }),
    registerMirrorCanvas: (id, canvas) =>
      set((state) => {
        const current = state.mirrorCanvasesByLayerId[id] ?? [];
        if (current.includes(canvas)) {
          return state;
        }

        return {
          mirrorCanvasesByLayerId: {
            ...state.mirrorCanvasesByLayerId,
            [id]: [...current, canvas],
          },
        };
      }),
    unregisterMirrorCanvas: (id, canvas) =>
      set((state) => {
        const nextCanvases = (state.mirrorCanvasesByLayerId[id] ?? []).filter(
          (candidate) => candidate !== canvas,
        );
        const mirrorCanvasesByLayerId = {
          ...state.mirrorCanvasesByLayerId,
        };

        if (nextCanvases.length === 0) {
          delete mirrorCanvasesByLayerId[id];
        } else {
          mirrorCanvasesByLayerId[id] = nextCanvases;
        }

        return { mirrorCanvasesByLayerId };
      }),
    setPlayerRef: (playerRef) => set({ playerRef }),
    pruneLayerAttachments: (activeLayerIds) =>
      set((state) => {
        const activeLayerIdSet = new Set(activeLayerIds);
        const layerRenderFunctions = new Map(state.layerRenderFunctions);

        for (const layerId of layerRenderFunctions.keys()) {
          if (!activeLayerIdSet.has(layerId)) {
            layerRenderFunctions.delete(layerId);
          }
        }

        return {
          layerRenderFunctions,
          mirrorCanvasesByLayerId: filterActiveLayerEntries(
            state.mirrorCanvasesByLayerId,
            activeLayerIdSet,
          ),
        };
      }),
    renderAllLayers: (frame) =>
      Object.fromEntries(
        [...get().layerRenderFunctions.entries()].map(([layerId, render]) => [
          layerId,
          render(frame),
        ]),
      ),
    reset: () =>
      set({
        layerRenderFunctions: new Map(),
        mirrorCanvasesByLayerId: {},
        playerRef: { current: null },
      }),
  }));

export default useEditorRuntimePreviewAttachmentStore;
