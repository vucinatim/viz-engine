import { CompDefinitionMap } from '@/components/comps';
import { Comp, UnknownConfig } from '@/components/config/create-component';
import {
  LayerSettings,
  layerSettingsSchema,
} from '@/components/editor/layer-settings';
import useNodeNetworkStore from '@/components/node-network/node-network-store';
import { arrayMove } from '@dnd-kit/sortable';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  assignDeterministicIdsToConfig,
  getParameterIdsFromConfig,
} from '../comp-utils/config-utils';
import { generateLayerId } from '../id-utils';
import { createIdbJsonStorage } from '../idb-json-storage';
import { getDefaults } from '../schema-utils';
import useLayerValuesStore from './layer-values-store';

export const layerStorePartialize = (state: LayerStore) => ({
  ...state,
  layers: state.layers.map(({ config, mirrorCanvases, ...rest }) => ({
    ...rest,
    comp: { name: rest.comp.name },
  })),
});

export const layerStoreMerge = (
  persistedState: any,
  currentState: LayerStore,
) => {
  const persisted = persistedState as LayerStore;
  const currentLayersMap = new Map(
    currentState.layers.map((layer) => [layer.id, layer]),
  );

  const mergedLayers = persisted.layers.map((persistedLayer) => {
    const currentLayer = currentLayersMap.get(persistedLayer.id);
    const comp = CompDefinitionMap.get(persistedLayer.comp.name);
    if (!comp) return persistedLayer; // Should not happen in valid project file

    const rehydratedLayer = {
      ...persistedLayer,
      comp,
      config: assignDeterministicIdsToConfig(
        persistedLayer.id,
        comp.config.clone(),
      ),
      // Preserve runtime properties from the current state
      mirrorCanvases: currentLayer ? currentLayer.mirrorCanvases : [],
    };

    return rehydratedLayer;
  });

  return {
    ...currentState,
    ...persisted,
    layers: mergedLayers,
  };
};

export interface LayerData {
  id: string;
  comp: Comp;
  config: UnknownConfig;
  state: unknown;
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
      addLayer: (comp) => {
        const newLayerId = generateLayerId(comp.name);
        useLayerValuesStore
          .getState()
          .initLayerValues(newLayerId, comp.defaultValues);

        set((state) => ({
          layers: [
            ...state.layers,
            {
              id: newLayerId,
              comp,
              config: assignDeterministicIdsToConfig(
                newLayerId,
                comp.config.clone(),
              ),
              state: comp.createState ? comp.createState() : undefined,
              isExpanded: true,
              isDebugEnabled: false,
              layerSettings: getDefaults(layerSettingsSchema) as LayerSettings,
            },
          ],
        }));
      },
      removeLayer: (id) =>
        set((state) => {
          const layerToRemove = state.layers.find((l) => l.id === id);
          if (layerToRemove) {
            const paramIds = getParameterIdsFromConfig(layerToRemove.config);
            paramIds.forEach((paramId) => {
              useNodeNetworkStore.getState().removeNetworkForParameter(paramId);
            });
          }

          useLayerValuesStore.getState().removeLayerValues(id);
          return {
            layers: state.layers.filter((layer) => layer.id !== id),
          };
        }),
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

          const newLayerId = generateLayerId(layer.comp.name);
          const layerValues =
            useLayerValuesStore.getState().values[layer.id] ??
            layer.comp.defaultValues;
          useLayerValuesStore
            .getState()
            .initLayerValues(newLayerId, layerValues);

          return {
            layers: [
              ...state.layers,
              {
                ...layer,
                id: newLayerId,
                config: assignDeterministicIdsToConfig(
                  newLayerId,
                  layer.config.clone(),
                ),
                state: layer.comp.createState
                  ? layer.comp.createState()
                  : undefined,
                isExpanded: true,
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
      storage: createJSONStorage(() =>
        createIdbJsonStorage({
          dbName: 'viz-engine',
          storeName: 'layer-store',
          throttleMs: 100,
        }),
      ),
      partialize: layerStorePartialize,
      merge: layerStoreMerge,
    },
  ),
);

export default useLayerStore;
