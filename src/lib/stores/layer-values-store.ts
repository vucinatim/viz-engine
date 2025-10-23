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
          const currentLayerValues = state.values[layerId];
          if (!currentLayerValues) return state;

          // Helper to deeply clone and update a nested value immutably
          const updateNested = (
            obj: any,
            path: (string | number)[],
            value: any,
          ): any => {
            if (path.length === 0) return value;

            const [key, ...rest] = path;
            const currentValue = obj[key];

            // If we're at the end of the path, set the value
            if (rest.length === 0) {
              return { ...obj, [key]: value };
            }

            // Otherwise, recursively update nested object
            const nestedObj =
              currentValue && typeof currentValue === 'object'
                ? currentValue
                : {};

            return {
              ...obj,
              [key]: updateNested(nestedObj, rest, value),
            };
          };

          // Only update the specific layer's values object, not all layers
          const newLayerValues = updateNested(currentLayerValues, path, value);

          return {
            values: {
              ...state.values,
              [layerId]: newLayerValues,
            },
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
