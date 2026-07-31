import type { LayerData } from '@/lib/editor-layer-types';
import useCompStore from '@/lib/stores/comp-store';
import useEditorStore from '@/lib/stores/editor-store';
import {
  createProjectedLayer,
  findEditorCompForLayer,
} from '@/lib/viz-session/project-adapters';
import { vizSessionStore } from '@/lib/viz-session/store';
import { useMemo } from 'react';
import { useStore } from 'zustand';

interface ProjectedLayerCacheEntry {
  layer: Parameters<typeof createProjectedLayer>[0]['layer'];
  comp: Parameters<typeof createProjectedLayer>[0]['comp'];
  uiState: Parameters<typeof createProjectedLayer>[0]['uiState'];
  projected: LayerData;
}

const projectedLayerCache = new Map<string, ProjectedLayerCacheEntry>();

const projectLayers = (
  project: ReturnType<
    typeof vizSessionStore.getState
  >['project']['workingProject'],
  comps: ReturnType<typeof useCompStore.getState>['comps'],
  layerUi: ReturnType<typeof useEditorStore.getState>['layerUi'],
): LayerData[] => {
  const layersById = new Map(project.layers.map((layer) => [layer.id, layer]));
  const orderedLayers = [
    ...project.layerOrder
      .map((layerId) => layersById.get(layerId))
      .filter(
        (layer): layer is NonNullable<typeof layer> => layer !== undefined,
      ),
    ...project.layers.filter((layer) => !project.layerOrder.includes(layer.id)),
  ];

  const activeLayerIds = new Set(orderedLayers.map((layer) => layer.id));
  for (const layerId of projectedLayerCache.keys()) {
    if (!activeLayerIds.has(layerId)) {
      projectedLayerCache.delete(layerId);
    }
  }

  return orderedLayers.flatMap((layer) => {
    const comp = findEditorCompForLayer(layer, comps);
    if (!comp) {
      projectedLayerCache.delete(layer.id);
      return [];
    }
    const uiState = layerUi[layer.id];
    const cached = projectedLayerCache.get(layer.id);
    if (
      cached?.layer === layer &&
      cached.comp === comp &&
      cached.uiState === uiState
    ) {
      return [cached.projected];
    }
    const projected = createProjectedLayer({ layer, comp, uiState });
    projectedLayerCache.set(layer.id, {
      layer,
      comp,
      uiState,
      projected,
    });
    return [projected];
  });
};

export const getProjectedLayers = () =>
  projectLayers(
    vizSessionStore.getState().project.workingProject,
    useCompStore.getState().comps,
    useEditorStore.getState().layerUi,
  );

export const useProjectedLayers = () => {
  const project = useStore(
    vizSessionStore,
    (state) => state.project.workingProject,
  );
  const comps = useCompStore((state) => state.comps);
  const layerUi = useEditorStore((state) => state.layerUi);
  return useMemo(
    () => projectLayers(project, comps, layerUi),
    [project, comps, layerUi],
  );
};

export type { LayerData } from '@/lib/editor-layer-types';
