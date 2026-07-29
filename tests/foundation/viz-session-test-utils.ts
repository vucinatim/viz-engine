import type { Comp } from '@/components/config/create-component';
import {
  createEmptyVizProjectDocument,
  createVizLayerFromComp,
} from '@/lib/viz-session/project-adapters';
import type { VizProjectDocument } from '@viz-engine/contracts';

export const createTestProject = (
  comp?: Comp,
  layerId = 'test-layer',
): VizProjectDocument => {
  const project = createEmptyVizProjectDocument({
    projectId: 'test-project',
    name: 'Test Project',
  });

  if (!comp) {
    return project;
  }

  const layer = createVizLayerFromComp(comp, layerId);
  return {
    ...project,
    layerOrder: [layer.id],
    layers: [layer],
  };
};
