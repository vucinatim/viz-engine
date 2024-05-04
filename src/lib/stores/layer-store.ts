import { Comp, ConfigSchema } from "@/components/editor/layer-renderer";
import {
  LayerSettings,
  layerSettingsSchema,
} from "@/components/editor/layer-settings";
import { create } from "zustand";
import { getDefaults } from "../schema-utils";
import { RefObject } from "react";
import { arrayMove } from "@dnd-kit/sortable";

export interface LayerData {
  id: string;
  comp: Comp;
  valuesRef: {
    current: ConfigSchema;
  };
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

const useLayerStore = create<LayerStore>((set) => ({
  layers: [],
  addLayer: (comp) =>
    set((state) => ({
      layers: [
        ...state.layers,
        {
          id: `layer-${comp.name}-${new Date().getTime()}`,
          comp,
          isExpanded: true,
          isDebugEnabled: false,
          valuesRef: { current: getDefaults(comp.config) as ConfigSchema },
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
        layer.id === id ? { ...layer, isExpanded } : layer
      ),
    })),
  setAllLayersExpanded: (isExpanded) =>
    set((state) => ({
      layers: state.layers.map((layer) => ({ ...layer, isExpanded })),
    })),
  setDebugEnabled: (id, isDebugEnabled) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, isDebugEnabled } : layer
      ),
    })),
  updateLayerComp: (id, comp) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, comp } : layer
      ),
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
  duplicateLayer: (id) =>
    set((state) => {
      const layer = state.layers.find((layer) => layer.id === id);
      if (!layer) return state;

      return {
        layers: [
          ...state.layers,
          {
            ...layer,
            id: `layer-${layer.comp.name}-${new Date().getTime()}`,
            isExpanded: true,
            isDebugEnabled: false,
            valuesRef: {
              // Deep clone the valuesRef
              current: JSON.parse(JSON.stringify(layer.valuesRef.current)),
            },
            layerSettings: { ...layer.layerSettings },
          },
        ],
      };
    }),
  reorderLayers: (activeId, overId) =>
    set((state) => {
      const oldIndex = state.layers.findIndex((layer) => layer.id === activeId);
      const newIndex = state.layers.findIndex((layer) => layer.id === overId);

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
          : layer
      ),
    })),
  unregisterMirrorCanvas: (id, canvas) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id
          ? {
              ...layer,
              mirrorCanvases: layer.mirrorCanvases?.filter(
                (canvas) => canvas !== canvas
              ),
            }
          : layer
      ),
    })),
}));

export default useLayerStore;
