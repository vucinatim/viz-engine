import { LayerData } from '@/lib/editor-layer-types';
import { create } from 'zustand';

interface EditorLayerProjectionStore {
  layers: LayerData[];
}

const useEditorLayerProjectionStore = create<EditorLayerProjectionStore>(() => ({
  layers: [],
}));

export const getProjectedLayers = () =>
  useEditorLayerProjectionStore.getState().layers;

export const getProjectedLayer = (layerId: string) =>
  useEditorLayerProjectionStore
    .getState()
    .layers.find((layer) => layer.id === layerId);

export type { LayerData } from '@/lib/editor-layer-types';

export default useEditorLayerProjectionStore;
