import { Comp, ConfigSchema } from "@/components/editor/layer-renderer";
import { LayerSettings } from "@/components/editor/layer-settings";
import { create } from "zustand";
import { getDefaults } from "../schema-utils";

export interface LayerData {
  id: string;
  comp: Comp;
  valuesRef: {
    current: ConfigSchema;
  };
  layerSettings: LayerSettings;
}

interface LayerStore {
  layers: LayerData[];
  addLayer: (comp: Comp) => void;
  removeLayer: (id: string) => void;
  updateComps: (comp: Comp[]) => void;
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
          valuesRef: { current: getDefaults(comp.config) as ConfigSchema },
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
  updateComps: (comps) =>
    set((state) => {
      console.log("The new comps", comps);
      return {
        layers: state.layers.map((layer) => ({
          ...layer,
          comp:
            comps.find((comp) => comp.name === layer.comp.name) ?? layer.comp,
        })),
      };
    }),
  updateLayerSettings: (id, settings) =>
    set((state) => ({
      layers: state.layers.map((comp) =>
        comp.id === id ? { ...comp, layerSettings: settings } : comp
      ),
    })),
}));

export default useLayerStore;
