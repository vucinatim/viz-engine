import { beforeEach, describe, expect, it } from 'vitest';

import { CompDefinitionMap } from '@/components/comps';
import { listComponentParameterIds } from '@/components/config/config';
import { useNodeNetworkStore } from '@/components/node-network/node-network-store';
import useCompStore from '@/lib/stores/comp-store';
import {
  getVizSessionState,
  selectProjectedNodeNetworks,
  vizSessionActions,
  vizSessionStore,
} from '@/lib/viz-session';
import type { VizProjectDocument } from '@viz-engine/contracts';
import { createTestProject } from './viz-session-test-utils';

if (!(globalThis as any).window) {
  (globalThis as any).window = globalThis;
}

const buildProject = (): {
  project: VizProjectDocument;
  layerId: string;
  parameterId: string;
} => {
  const comp = CompDefinitionMap.get('Simple Cube');
  if (!comp) {
    throw new Error('Simple Cube component definition not found');
  }

  const layerId = 'layer-history-test';
  const [parameterId] = listComponentParameterIds(
    layerId,
    comp.authoring.settings,
  );

  if (!parameterId) {
    throw new Error('Could not resolve parameter id for test component');
  }

  return {
    layerId,
    parameterId,
    project: createTestProject(comp, layerId),
  };
};

describe('VizSession history', () => {
  beforeEach(() => {
    useCompStore.setState({
      comps: Array.from(CompDefinitionMap.values()),
    });
    vizSessionActions.graph.reset();
    vizSessionActions.project.importWorkingProject(createTestProject());
    useNodeNetworkStore.setState({
      openNetwork: null,
      areNetworksMinimized: false,
      shouldForceShowOverlay: false,
    });
    vizSessionActions.history.reset();
  });

  it('snapshots canonical working-project truth for layer history', () => {
    const { project, layerId } = buildProject();

    vizSessionActions.project.importWorkingProject(project);
    vizSessionActions.project.updateLayerValue(layerId, ['testMarker'], 42);
    vizSessionActions.history.undo();

    const restored = vizSessionActions.project.exportWorkingProject();
    expect(restored.layers[0].id).toBe(layerId);
    expect(restored.layers[0].settings?.testMarker).toBeUndefined();
    expect(
      vizSessionStore.getState().project.workingProject.layers[0].settings
        ?.testMarker,
    ).toBeUndefined();
    expect(vizSessionActions.history.canRedo()).toBe(true);
  });

  it('restores graph enabled-state changes through canonical graph truth', () => {
    const { project, parameterId } = buildProject();

    vizSessionActions.project.importWorkingProject(project);
    vizSessionActions.graph.createNetworkForParameter(parameterId, 'number');
    vizSessionActions.graph.setNetworkEnabled(parameterId, false, 'number');

    vizSessionActions.graph.setNetworkEnabled(parameterId, true, 'number');
    vizSessionActions.history.undo();

    expect(
      selectProjectedNodeNetworks(getVizSessionState())[parameterId]?.isEnabled,
    ).toBe(false);
  });

  it('uses node UI context without duplicated history selection', () => {
    const { project, parameterId } = buildProject();

    vizSessionActions.project.importWorkingProject(project);
    vizSessionActions.graph.createNetworkForParameter(parameterId, 'number');

    const initialNetwork =
      selectProjectedNodeNetworks(getVizSessionState())[parameterId];
    if (!initialNetwork) {
      throw new Error('Expected node network to exist');
    }

    useNodeNetworkStore.setState({ openNetwork: parameterId });
    vizSessionActions.history.setNodeEditorFocused(true);

    const updatedNodes = [
      ...initialNetwork.nodes,
      {
        id: 'custom-node',
        type: 'NodeRenderer',
        position: { x: 120, y: 80 },
        data: { definition: { label: 'Custom', inputs: [], outputs: [] } },
      } as any,
    ];

    vizSessionActions.graph.setNodesInNetwork(parameterId, updatedNodes);
    vizSessionActions.history.undo();

    expect(
      selectProjectedNodeNetworks(getVizSessionState())[
        parameterId
      ]?.nodes.some((node) => node.id === 'custom-node'),
    ).toBe(false);
  });
});
