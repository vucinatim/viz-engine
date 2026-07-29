import type { NodeNetwork } from '@/components/node-network/graph-types';
import type { VizProjectDocument } from '@viz-engine/contracts';

import { projectGraphsToNodeNetworks } from './project-adapters';
import type { VizSessionState } from './types';

let cachedGraphProject: VizProjectDocument | null = null;
let cachedProjectedNetworks: Record<string, NodeNetwork> = {};

export const selectProjectedNodeNetworks = (
  state: VizSessionState,
): Record<string, NodeNetwork> => {
  const project = state.project.workingProject;

  if (project !== cachedGraphProject) {
    cachedGraphProject = project;
    cachedProjectedNetworks = projectGraphsToNodeNetworks(project);
  }

  return cachedProjectedNetworks;
};

export const getProjectedNodeNetworks = (
  state: VizSessionState,
): Record<string, NodeNetwork> => selectProjectedNodeNetworks(state);

export const resetVizSessionSelectorCaches = (): void => {
  cachedGraphProject = null;
  cachedProjectedNetworks = {};
};
