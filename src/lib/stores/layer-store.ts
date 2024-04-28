import {
  Comp,
  ConfigSchema,
  ConfigValuesRef,
} from "@/components/comps/layer-renderer";
import { LayerSettings } from "@/components/comps/layer-settings";
import { createRef, RefObject } from "react";
import { create } from "zustand";

export interface LayerData {
  id: string;
  comp: Comp;
  valuesRef: RefObject<ConfigSchema>;
  layerSettings: LayerSettings;
}

interface LayerStore {
  layers: LayerData[];
  addLayer: (comp: Comp) => void;
  removeLayer: (id: string) => void;
  updateLayerSettings: (id: string, settings: LayerSettings) => void;
}

const useLayerStore = create<LayerStore>((set) => ({
  layers: [],
  addLayer: (comp) =>
    set((state) => ({
      layers: [
        ...state.layers,
        {
          id: `layer-${comp.name}-${new Date().getTime()}`,
          comp,
          valuesRef: createRef<ConfigSchema>(),
          layerSettings: {
            visible: true,
            opacity: 1,
            blendingMode: "normal",
            background: "rgba(0, 0, 0, 0)",
          },
        },
      ],
    })),
  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((comp) => comp.id !== id),
    })),
  updateLayerSettings: (id, settings) =>
    set((state) => ({
      layers: state.layers.map((comp) =>
        comp.id === id ? { ...comp, layerSettings: settings } : comp
      ),
    })),
}));

export default useLayerStore;
