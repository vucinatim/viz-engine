import { CompDefinitionMap } from '@/components/comps';
import { ConfigParam, GroupConfigOption } from '@/components/config/config';
import { Comp, UnknownConfig } from '@/components/config/create-component';
import { safeVTypeToNodeHandleType } from '@/components/config/node-types';
import {
  LayerSettings,
  layerSettingsSchema,
} from '@/components/editor/layer-settings';
import useNodeNetworkStore from '@/components/node-network/node-network-store';
import {
  getPresetById,
  instantiatePreset,
} from '@/components/node-network/presets';
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
  layers: state.layers.map(
    ({ config, mirrorCanvases, state: componentState, ...rest }) => ({
      ...rest,
      comp: { name: rest.comp.name },
    }),
  ),
  // Exclude layerRenderFunctions from persistence (runtime-only Map)
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
      // Preserve runtime properties from the current state or initialize
      mirrorCanvases: currentLayer ? currentLayer.mirrorCanvases : [],
      state: comp.initialState || {},
    };

    return rehydratedLayer;
  });

  return {
    ...currentState,
    ...persisted,
    layers: mergedLayers,
    // Always initialize layerRenderFunctions as a fresh Map (never persisted)
    layerRenderFunctions: new Map(),
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

// Manual render function type for export
export type LayerRenderFunction = (time: number, dt: number) => void;

interface LayerStore {
  layers: LayerData[];
  // Non-persisted map of layer render functions for export
  layerRenderFunctions: Map<string, LayerRenderFunction>;
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
  // Register/unregister manual render functions for export
  registerLayerRenderFunction: (id: string, fn: LayerRenderFunction) => void;
  unregisterLayerRenderFunction: (id: string) => void;
  // Render all layers with explicit time and dt (used by export)
  renderAllLayers: (time: number, dt: number) => void;
}

const useLayerStore = create<LayerStore>()(
  persist(
    (set, get) => ({
      layers: [],
      layerRenderFunctions: new Map(),
      registerLayerRenderFunction: (id, fn) => {
        get().layerRenderFunctions.set(id, fn);
      },
      unregisterLayerRenderFunction: (id) => {
        get().layerRenderFunctions.delete(id);
      },
      renderAllLayers: (time, dt) => {
        const { layerRenderFunctions } = get();
        layerRenderFunctions.forEach((renderFn) => {
          renderFn(time, dt);
        });
      },
      addLayer: (comp) => {
        const newLayerId = generateLayerId(comp.name);
        useLayerValuesStore
          .getState()
          .initLayerValues(newLayerId, comp.defaultValues);

        // Prepare config with deterministic IDs so we can resolve parameter IDs
        const layerConfigWithIds = assignDeterministicIdsToConfig(
          newLayerId,
          comp.config.clone(),
        );

        // Helper to resolve an option by a dot-separated path (e.g., "appearance.height" or "size")
        const resolveOptionByPath = (path: string): ConfigParam<any> | null => {
          const segments = path.split('.');
          let current: any = layerConfigWithIds.options;
          for (let i = 0; i < segments.length; i++) {
            const key = segments[i];
            if (!current || !current[key]) return null;
            const option = current[key];
            const isLast = i === segments.length - 1;
            if (option instanceof GroupConfigOption) {
              current = option.options;
              continue;
            }
            if (isLast && option instanceof ConfigParam) {
              return option as ConfigParam<any>;
            }
            return null;
          }
          return null;
        };

        // Initialize default node networks, if defined on the component
        if (comp.defaultNetworks) {
          for (const [path, presetOrId] of Object.entries(
            comp.defaultNetworks,
          )) {
            const option = resolveOptionByPath(path);
            if (!option) continue;
            const parameterId = option.id;
            const outputType = safeVTypeToNodeHandleType(option.type);

            // Resolve preset: if string, look it up; otherwise use the object directly
            const preset =
              typeof presetOrId === 'string'
                ? getPresetById(presetOrId)
                : presetOrId;

            if (!preset) {
              console.warn(
                `Preset not found for parameter "${path}":`,
                presetOrId,
              );
              continue;
            }

            const { nodes, edges } = instantiatePreset(
              preset,
              parameterId,
              outputType,
            );
            useNodeNetworkStore.getState().setNetwork(parameterId, {
              name: parameterId,
              isEnabled: true,
              isMinimized: false,
              nodes,
              edges,
            });
          }
        }

        set((state) => ({
          layers: [
            ...state.layers,
            {
              id: newLayerId,
              comp,
              config: layerConfigWithIds,
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

          // Get old and new parameter IDs
          const oldParameterIds = getParameterIdsFromConfig(layer.config);
          const newConfig = assignDeterministicIdsToConfig(
            newLayerId,
            layer.config.clone(),
          );
          const newParameterIds = getParameterIdsFromConfig(newConfig);

          // Duplicate node networks for each parameter
          const networkStore = useNodeNetworkStore.getState();
          oldParameterIds.forEach((oldId, index) => {
            const newId = newParameterIds[index];
            if (networkStore.networks[oldId]) {
              networkStore.duplicateNetwork(oldId, newId);
            }
          });

          return {
            layers: [
              ...state.layers,
              {
                ...layer,
                id: newLayerId,
                config: newConfig,
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
