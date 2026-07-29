import { beforeEach, describe, expect, it } from 'vitest';

import { CompDefinitionMap } from '@/components/comps';
import { useNodeNetworkStore } from '@/components/node-network/node-network-store';
import { VType } from '@/components/config/types';
import useEditorGraphStore from '@/lib/stores/editor-graph-store';
import useCompStore from '@/lib/stores/comp-store';
import useEditorProjectStore from '@/lib/stores/editor-project-store';
import { useHistoryStore } from '@/lib/stores/history-store';
import { assignDeterministicIdsToConfig, getParameterIdsFromConfig } from '@/lib/comp-utils/config-utils';
import { vizSessionStore } from '@/lib/viz-session';
import type { VizProjectDocument } from '@viz-engine/contracts';
import { createTestProject } from './viz-session-test-utils';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

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
  const config = assignDeterministicIdsToConfig(layerId, comp.config.clone());
  const [parameterId] = getParameterIdsFromConfig(config);

  if (!parameterId) {
    throw new Error('Could not resolve parameter id for test component');
  }

  return {
    layerId,
    parameterId,
    project: createTestProject(comp, layerId),
  };
};

describe('History store', () => {
  beforeEach(() => {
    useCompStore.setState({
      comps: Array.from(CompDefinitionMap.values()),
    });
    useEditorGraphStore.getState().reset();
    useEditorProjectStore.getState().importWorkingProject(createTestProject());
    useNodeNetworkStore.setState({
      openNetwork: null,
      areNetworksMinimized: false,
      shouldForceShowOverlay: false,
    });
    useHistoryStore.setState({
      layerHistory: {
        past: [],
        present: {
          project: createTestProject(),
        },
        future: [],
      },
      nodeHistories: {},
      isNodeEditorFocused: false,
      isBypassingHistory: false,
      nodeDragBypass: {},
      debounceTimer: null,
    });
  });

  it('snapshots canonical working-project truth for layer history', () => {
    const { project, layerId } = buildProject();

    useEditorProjectStore.getState().importWorkingProject(project);
    useHistoryStore.getState().initializeLayerHistory();

    const updated = clone(project);
    updated.layers[0].settings = {
      ...updated.layers[0].settings,
      testMarker: 42,
    };

    useEditorProjectStore.getState().importWorkingProject(updated);
    useHistoryStore.getState().pushLayerHistory(true);
    useHistoryStore.getState().undoLayerEditor();

    const restored = useEditorProjectStore.getState().exportWorkingProject();
    expect(restored.layers[0].id).toBe(layerId);
    expect(restored.layers[0].settings?.testMarker).toBeUndefined();
    expect(
      vizSessionStore.getState().project.workingProject.layers[0].settings
        ?.testMarker,
    ).toBeUndefined();
    expect(useHistoryStore.getState().layerHistory.present.project.layers[0].id).toBe(
      layerId,
    );
  });

  it('restores graph enabled-state changes through canonical graph truth', () => {
    const { project, parameterId } = buildProject();

    useEditorProjectStore.getState().importWorkingProject(project);
    useEditorGraphStore
      .getState()
      .createNetworkForParameter(parameterId, VType.Number);
    useEditorGraphStore
      .getState()
      .setNetworkEnabled(parameterId, false, VType.Number);

    useHistoryStore.getState().initializeLayerHistory();

    useEditorGraphStore
      .getState()
      .setNetworkEnabled(parameterId, true, VType.Number);
    useHistoryStore.getState().pushLayerHistory(true);
    useHistoryStore.getState().undoLayerEditor();

    expect(
      useEditorGraphStore.getState().networks[parameterId]?.isEnabled,
    ).toBe(false);
  });

  it('uses node UI context instead of duplicated history-store node selection', () => {
    const { project, parameterId } = buildProject();

    useEditorProjectStore.getState().importWorkingProject(project);
    useEditorGraphStore
      .getState()
      .createNetworkForParameter(parameterId, VType.Number);

    const graphStore = useEditorGraphStore.getState();
    const initialNetwork = graphStore.networks[parameterId];
    if (!initialNetwork) {
      throw new Error('Expected node network to exist');
    }

    useHistoryStore.getState().initializeNodeHistory(parameterId);
    useNodeNetworkStore.setState({ openNetwork: parameterId });
    useHistoryStore.getState().setNodeEditorFocused(true);

    const updatedNodes = [
      ...initialNetwork.nodes,
      {
        id: 'custom-node',
        type: 'NodeRenderer',
        position: { x: 120, y: 80 },
        data: { definition: { label: 'Custom', inputs: [], outputs: [] } },
      } as any,
    ];

    graphStore.setNodesInNetwork(parameterId, updatedNodes);
    useHistoryStore
      .getState()
      .pushNodeHistory(parameterId, updatedNodes, initialNetwork.edges);

    useHistoryStore.getState().undo();

    expect(
      useEditorGraphStore.getState().networks[parameterId]?.nodes.some(
        (node) => node.id === 'custom-node',
      ),
    ).toBe(false);
  });
});
