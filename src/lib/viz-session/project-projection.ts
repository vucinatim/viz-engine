import { listComponentParameterIds } from '@/components/config/config';
import type { Comp } from '@/components/config/create-component';
import useCompStore from '@/lib/stores/comp-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import useEditorStore from '@/lib/stores/editor-store';
import type { VizLayer, VizProjectDocument } from '@viz-engine/contracts';

import { findEditorCompForLayer } from './project-adapters';

export const resolveEditorComp = (
  layer: Pick<VizLayer, 'componentId' | 'name'>,
): Comp | null => findEditorCompForLayer(layer, useCompStore.getState().comps);

export const getEditorParameterIds = (layer: VizLayer): string[] => {
  const comp = resolveEditorComp(layer);
  if (!comp) {
    return [];
  }
  return listComponentParameterIds(layer.id, comp.authoring.settings);
};

export const syncEditorProjection = (project: VizProjectDocument): void => {
  const editorStore = useEditorStore.getState();
  const projectedLayerIds = project.layers
    .filter((layer) => resolveEditorComp(layer) !== null)
    .map((layer) => layer.id);

  useEditorRuntimePreviewAttachmentStore
    .getState()
    .pruneLayerEntries(projectedLayerIds);
  editorStore.pruneLayerUi(project.layers.map((layer) => layer.id));
};
