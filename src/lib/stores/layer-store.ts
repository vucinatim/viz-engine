import { Comp, ConfigSchema } from "@/components/editor/layer-renderer";
import {
  LayerSettings,
  layerSettingsSchema,
} from "@/components/editor/layer-settings";
import { create } from "zustand";
import { getDefaults } from "../schema-utils";
import { RefObject } from "react";

export interface LayerData {
  id: string;
  comp: Comp;
  valuesRef: {
    current: ConfigSchema;
  };
  layerSettings: LayerSettings;
  mirrorCanvases?: RefObject<HTMLCanvasElement>[];
}

interface LayerStore {
  layers: LayerData[];
  addLayer: (comp: Comp) => void;
  removeLayer: (id: string) => void;
  updateComps: (comp: Comp[]) => void;
  updateLayerSettings: (id: string, settings: LayerSettings) => void;
  registerMirrorCanvas: (
    id: string,
    canvasRef: RefObject<HTMLCanvasElement>
  ) => void;
  unregisterMirrorCanvas: (
    id: string,
    canvasRef: RefObject<HTMLCanvasElement>
  ) => void;
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
          layerSettings: getDefaults(layerSettingsSchema) as LayerSettings,
        },
      ],
    })),
  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((layer) => layer.id !== id),
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
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, layerSettings: settings } : layer
      ),
    })),
  registerMirrorCanvas: (id, ctx) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id
          ? {
              ...layer,
              mirrorCanvases: [...(layer.mirrorCanvases ?? []), ctx],
            }
          : layer
      ),
    })),
  unregisterMirrorCanvas: (id, ctx) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id
          ? {
              ...layer,
              mirrorCanvases: layer.mirrorCanvases?.filter(
                (canvas) => canvas !== ctx
              ),
            }
          : layer
      ),
    })),
}));

export default useLayerStore;
