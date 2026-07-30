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

  return orderedLayers.flatMap((layer) => {
    const comp = findEditorCompForLayer(layer, comps);
    return comp
      ? [
          createProjectedLayer({
            layer,
            comp,
            uiState: layerUi[layer.id],
          }),
        ]
      : [];
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
