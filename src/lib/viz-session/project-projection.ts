import type { Comp } from '@/components/config/create-component';
import {
  assignDeterministicIdsToConfig,
  getParameterIdsFromConfig,
} from '@/lib/comp-utils/config-utils';
import useCompStore from '@/lib/stores/comp-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import useEditorStore from '@/lib/stores/editor-store';
import type { VizLayer, VizProjectDocument } from '@viz-engine/contracts';

import {
  createProjectedLayer,
  findEditorCompForLayer,
} from './project-adapters';

export const resolveEditorComp = (
  layer: Pick<VizLayer, 'componentId' | 'name'>,
): Comp | null => findEditorCompForLayer(layer, useCompStore.getState().comps);

export const resolveEditorOptionByPath = (
  comp: Comp,
  layerId: string,
  path: string,
) => {
  const config = assignDeterministicIdsToConfig(layerId, comp.config.clone());
  const segments = path.split('.');
  let current: Record<string, any> = config.options;

  for (let index = 0; index < segments.length; index += 1) {
    const key = segments[index];
    const option = current[key];
    if (!option) {
      return null;
    }

    if (
      'options' in option &&
      option.options &&
      typeof option.options === 'object'
    ) {
      current = option.options;
      continue;
    }

    if (
      'type' in option &&
      'getDefaultValue' in option &&
      index === segments.length - 1
    ) {
      return option;
    }

    return null;
  }

  return null;
};

export const getEditorParameterIds = (layer: VizLayer): string[] => {
  const comp = resolveEditorComp(layer);
  if (!comp) {
    return [];
  }
  const config = assignDeterministicIdsToConfig(layer.id, comp.config.clone());
  return getParameterIdsFromConfig(config);
};

export const syncEditorProjection = (project: VizProjectDocument): void => {
  const editorStore = useEditorStore.getState();
  const layersById = new Map(project.layers.map((layer) => [layer.id, layer]));
  const orderedLayers = [
    ...project.layerOrder
      .map((layerId) => layersById.get(layerId))
      .filter((layer): layer is VizLayer => layer !== undefined),
    ...project.layers.filter((layer) => !project.layerOrder.includes(layer.id)),
  ];

  const projectedLayerIds = orderedLayers.flatMap((layer) => {
    const comp = resolveEditorComp(layer);
    if (!comp) {
      return [];
    }
    createProjectedLayer({
      layer,
      comp,
      uiState: editorStore.layerUi[layer.id],
    });
    return [layer.id];
  });

  useEditorRuntimePreviewAttachmentStore
    .getState()
    .pruneLayerAttachments(projectedLayerIds);
  editorStore.pruneLayerUi(project.layers.map((layer) => layer.id));
};
