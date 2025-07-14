import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type LayerValues = Record<string, any>; // A simple object of config values
type LayerValuesStoreState = Record<string, LayerValues>; // A map from layerId to its values

interface LayerValuesStore {
  values: LayerValuesStoreState;
  initLayerValues: (layerId: string, initialValues: LayerValues) => void;
  updateLayerValue: (
    layerId: string,
    path: (string | number)[],
    value: any,
  ) => void;
  setLayerValues: (layerId: string, values: LayerValues) => void;
  removeLayerValues: (layerId: string) => void;
  setAllValues: (allValues: LayerValuesStoreState) => void;
}

const useLayerValuesStore = create<LayerValuesStore>()(
  persist(
    (set) => ({
      values: {},
      initLayerValues: (layerId, initialValues) =>
        set((state) => ({
          values: {
            ...state.values,
            [layerId]: initialValues,
          },
        })),
      updateLayerValue: (layerId, path, value) =>
        set((state) => {
          const newValues = JSON.parse(JSON.stringify(state.values));
          if (!newValues[layerId]) return state;

          let current = newValues[layerId];
          for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
          }
          current[path[path.length - 1]] = value;

          return {
            values: newValues,
          };
        }),
      setLayerValues: (layerId, values) =>
        set((state) => ({
          values: {
            ...state.values,
            [layerId]: values,
          },
        })),
      removeLayerValues: (layerId) =>
        set((state) => {
          const newValues = { ...state.values };
          delete newValues[layerId];
          return { values: newValues };
        }),
      setAllValues: (allValues) => set({ values: allValues }),
    }),
    {
      name: 'layer-values-store',
    },
  ),
);

export default useLayerValuesStore;
