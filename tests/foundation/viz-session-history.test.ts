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

  it('applies complete presets and resets settings plus graphs as one history operation', () => {
    const { project, layerId } = buildProject();
    const parameterId = `${layerId}:size`;

    vizSessionActions.project.importWorkingProject(project);
    vizSessionActions.project.updateLayerValue(layerId, ['size'], 4.2);
    vizSessionActions.graph.createNetworkForParameter(parameterId, 'number');

    vizSessionActions.project.applyLayerPreset(layerId, {
      name: 'Partial preset proof',
      values: { size: 2.4 },
    });
    expect(
      vizSessionActions.project.exportWorkingProject().layers[0]?.settings,
    ).toEqual({
      color: '#FF00FF',
      size: 2.4,
      rotationSpeedX: 1,
      rotationSpeedY: 1,
    });

    vizSessionActions.project.updateLayerValue(layerId, ['color'], '#123456');
    vizSessionActions.project.resetLayer(layerId);
    const reset = vizSessionActions.project.exportWorkingProject();
    expect(reset.layers[0]?.settings).toEqual({
      color: '#FF00FF',
      size: 1.5,
      rotationSpeedX: 1,
      rotationSpeedY: 1,
    });
    expect(reset.graphs).toEqual([]);
    expect(reset.layers[0]?.inputs).toEqual({});

    vizSessionActions.history.undo();
    const restored = vizSessionActions.project.exportWorkingProject();
    expect(restored.layers[0]?.settings).toMatchObject({
      color: '#123456',
      size: 2.4,
    });
    expect(restored.graphs?.map((graph) => graph.id)).toContain(parameterId);
    expect(restored.layers[0]?.inputs?.size).toMatchObject({
      kind: 'graph-output',
      graphId: parameterId,
    });

    vizSessionActions.history.redo();
    expect(vizSessionActions.project.exportWorkingProject().graphs).toEqual([]);
  });

  it('restores complete create, duplicate, reorder, and remove commands', () => {
    const comp = CompDefinitionMap.get('Simple Cube');
    if (!comp) {
      throw new Error('Simple Cube component definition not found');
    }

    vizSessionActions.project.importWorkingProject(createTestProject());
    vizSessionActions.project.addLayer(comp);
    const [createdId] =
      vizSessionActions.project.exportWorkingProject().layerOrder;
    expect(createdId).toBeDefined();

    vizSessionActions.project.duplicateLayer(createdId!);
    const duplicatedProject = vizSessionActions.project.exportWorkingProject();
    const duplicateId = duplicatedProject.layerOrder.find(
      (layerId) => layerId !== createdId,
    );
    expect(duplicateId).toBeDefined();

    vizSessionActions.project.reorderLayers(duplicateId!, createdId!);
    expect(vizSessionActions.project.exportWorkingProject().layerOrder).toEqual(
      [duplicateId, createdId],
    );
    vizSessionActions.history.undo();
    expect(vizSessionActions.project.exportWorkingProject().layerOrder).toEqual(
      [createdId, duplicateId],
    );

    vizSessionActions.project.removeLayer(duplicateId!);
    expect(vizSessionActions.project.exportWorkingProject().layerOrder).toEqual(
      [createdId],
    );
    vizSessionActions.history.undo();
    expect(vizSessionActions.project.exportWorkingProject().layerOrder).toEqual(
      [createdId, duplicateId],
    );
  });

  it('creates a layer and all default graphs in one canonical revision', () => {
    const comp = CompDefinitionMap.get('Stage Scene');
    if (!comp) {
      throw new Error('Stage Scene component definition not found');
    }

    vizSessionActions.project.importWorkingProject(createTestProject());
    const beforeRevision = vizSessionStore.getState().project.revision;

    vizSessionActions.project.addLayer(comp);

    const created = vizSessionActions.project.exportWorkingProject();
    expect(vizSessionStore.getState().project.revision).toBe(
      beforeRevision + 1,
    );
    expect(created.layers).toHaveLength(1);
    expect(created.graphs).toHaveLength(
      Object.keys(comp.defaultNetworks ?? {}).length,
    );
    expect(
      Object.values(created.layers[0]?.inputs ?? {}).filter(
        (input) => input.kind === 'graph-output',
      ),
    ).toHaveLength(Object.keys(comp.defaultNetworks ?? {}).length);

    vizSessionActions.history.undo();
    expect(vizSessionActions.project.exportWorkingProject()).toMatchObject({
      layers: [],
      layerOrder: [],
      graphs: [],
    });

    vizSessionActions.history.redo();
    expect(vizSessionActions.project.exportWorkingProject()).toMatchObject({
      layers: [{ id: created.layers[0]?.id }],
      graphs: created.graphs,
    });
  });
});
