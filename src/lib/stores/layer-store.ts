import { CompDefinitionMap } from '@/components/comps';
import { Comp, UnknownConfig } from '@/components/config/create-component';
import {
  LayerSettings,
  layerSettingsSchema,
} from '@/components/editor/layer-settings';
import { arrayMove } from '@dnd-kit/sortable';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateLayerId } from '../id-utils';
import { getDefaults } from '../schema-utils';

export interface LayerData {
  id: string;
  comp: Comp;
  config: UnknownConfig;
  isExpanded: boolean;
  isDebugEnabled: boolean;
  layerSettings: LayerSettings;
  mirrorCanvases?: HTMLCanvasElement[];
}

interface LayerStore {
  layers: LayerData[];
  addLayer: (comp: Comp) => void;
  removeLayer: (id: string) => void;
  setIsLayerExpanded: (id: string, isExpanded: boolean) => void;
  setAllLayersExpanded: (isExpanded: boolean) => void;
  setDebugEnabled: (id: string, isDebugEnabled: boolean) => void;
  updateComps: (comp: Comp[]) => void;
  updateLayerSettings: (id: string, settings: LayerSettings) => void;
  updateLayerComp: (id: string, comp: Comp) => void;
  duplicateLayer: (id: string) => void;
  reorderLayers: (activeId: string, overId: string) => void;
  registerMirrorCanvas: (id: string, canvasRef: HTMLCanvasElement) => void;
  unregisterMirrorCanvas: (id: string, canvasRef: HTMLCanvasElement) => void;
}

const useLayerStore = create<LayerStore>()(
  persist(
    (set) => ({
      layers: [],
      addLayer: (comp) =>
        set((state) => ({
          layers: [
            ...state.layers,
            {
              id: generateLayerId(comp.name),
              comp,
              config: comp.config.clone(),
              isExpanded: true,
              isDebugEnabled: false,
              layerSettings: getDefaults(layerSettingsSchema) as LayerSettings,
            },
          ],
        })),
      removeLayer: (id) =>
        set((state) => ({
          layers: state.layers.filter((layer) => layer.id !== id),
        })),
      setIsLayerExpanded: (id, isExpanded) =>
        set((state) => ({
          layers: state.layers.map((layer) =>
            layer.id === id ? { ...layer, isExpanded } : layer,
          ),
        })),
      setAllLayersExpanded: (isExpanded) =>
        set((state) => ({
          layers: state.layers.map((layer) => ({ ...layer, isExpanded })),
        })),
      setDebugEnabled: (id, isDebugEnabled) =>
        set((state) => ({
          layers: state.layers.map((layer) =>
            layer.id === id ? { ...layer, isDebugEnabled } : layer,
          ),
        })),
      updateLayerComp: (id, comp) =>
        set((state) => ({
          layers: state.layers.map((layer) =>
            layer.id === id ? { ...layer, comp } : layer,
          ),
        })),
      updateComps: (comps) =>
        set((state) => {
          return {
            layers: state.layers.map((layer) => ({
              ...layer,
              comp:
                comps.find((comp) => comp.name === layer.comp.name) ??
                layer.comp,
            })),
          };
        }),
      updateLayerSettings: (id, settings) =>
        set((state) => ({
          layers: state.layers.map((layer) =>
            layer.id === id ? { ...layer, layerSettings: settings } : layer,
          ),
        })),
      duplicateLayer: (id) =>
        set((state) => {
          const layer = state.layers.find((layer) => layer.id === id);
          if (!layer) return state;

          return {
            layers: [
              ...state.layers,
              {
                ...layer,
                id: generateLayerId(layer.comp.name),
                config: layer.config.clone(),
                isExpanded: true,
                isDebugEnabled: false,
                layerSettings: { ...layer.layerSettings },
              },
            ],
          };
        }),
      reorderLayers: (activeId, overId) =>
        set((state) => {
          const oldIndex = state.layers.findIndex(
            (layer) => layer.id === activeId,
          );
          const newIndex = state.layers.findIndex(
            (layer) => layer.id === overId,
          );

          return {
            layers: arrayMove(state.layers, oldIndex, newIndex),
          };
        }),
      registerMirrorCanvas: (id, canvas) =>
        set((state) => ({
          layers: state.layers.map((layer) =>
            layer.id === id
              ? {
                  ...layer,
                  mirrorCanvases: [...(layer.mirrorCanvases ?? []), canvas],
                }
              : layer,
          ),
        })),
      unregisterMirrorCanvas: (id, canvas) =>
        set((state) => ({
          layers: state.layers.map((layer) =>
            layer.id === id
              ? {
                  ...layer,
                  mirrorCanvases: layer.mirrorCanvases?.filter(
                    (c) => c !== canvas,
                  ),
                }
              : layer,
          ),
        })),
    }),
    {
      name: 'layer-store',
      partialize: (state) => ({
        ...state,
        layers: state.layers.map(({ mirrorCanvases, ...rest }) => rest),
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as LayerStore;
        return {
          ...currentState,
          ...persisted,
          layers: persisted.layers.map((layer) => {
            const comp = CompDefinitionMap.get(layer.comp.name);
            if (!comp) return layer;
            return {
              ...layer,
              comp,
              config: comp.config.rehydrate(layer.config),
            };
          }),
        };
      },
    },
  ),
);

export default useLayerStore;
