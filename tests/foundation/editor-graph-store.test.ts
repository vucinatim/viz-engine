import { beforeEach, describe, expect, it } from 'vitest';

import { VType } from '@/components/config/types';
import {
  getNodeNetwork,
  nodeNetworkStoreMerge,
  nodeNetworkStorePartialize,
  setNodeNetworkEnabled,
  useNodeNetworkStore,
} from '@/components/node-network/node-network-store';
import useEditorGraphStore from '@/lib/stores/editor-graph-store';
import useEditorProjectStore from '@/lib/stores/editor-project-store';
import { vizSessionStore } from '@/lib/viz-session';
import { createTestProject } from './viz-session-test-utils';
import { validateProjectDocument } from '@viz-engine/runtime';
import {
  createSignalCathedralProject,
  SIGNAL_CATHEDRAL_GRAPH_ID,
} from '@viz-engine/production-signal-cathedral';
import editorControl from '@/lib/editor-control';

describe('Editor graph store', () => {
  beforeEach(() => {
    useEditorProjectStore.getState().importWorkingProject(createTestProject());
    useEditorGraphStore.getState().reset();
    useNodeNetworkStore.setState({
      openNetwork: null,
      areNetworksMinimized: false,
      shouldForceShowOverlay: false,
    });
  });

  it('owns canonical graph truth while the node editor store mirrors it', () => {
    const parameterId = 'layer-1:settings.amount';

    useEditorGraphStore
      .getState()
      .createNetworkForParameter(parameterId, VType.Number);

    expect(
      useEditorGraphStore.getState().networks[parameterId]?.nodes.length,
    ).toBe(2);
    expect(
      vizSessionStore
        .getState()
        .project.workingProject.graphs?.find(
          (graph) => graph.id === parameterId,
        )?.nodes.length,
    ).toBe(2);
    expect(getNodeNetwork(parameterId)).toBeDefined();

    useNodeNetworkStore.getState().setOpenNetwork(parameterId);
    useEditorGraphStore.getState().removeNetworkForParameter(parameterId);

    expect(getNodeNetwork(parameterId)).toBeUndefined();
    expect(useNodeNetworkStore.getState().openNetwork).toBeNull();
  });

  it('keeps node-editor animation toggles as a delegate over canonical graphs', () => {
    const parameterId = 'layer-2:settings.scale';

    setNodeNetworkEnabled(parameterId, true, VType.Number);

    expect(useEditorGraphStore.getState().networks[parameterId]).toBeDefined();
    expect(useNodeNetworkStore.getState().openNetwork).toBe(parameterId);
    expect(useNodeNetworkStore.getState().shouldForceShowOverlay).toBe(true);
  });

  it('persists node-editor UI state separately from canonical graph truth', () => {
    const parameterId = 'layer-2:settings.scale';

    useEditorGraphStore
      .getState()
      .createNetworkForParameter(parameterId, VType.Number);
    useNodeNetworkStore.getState().setOpenNetwork(parameterId);
    useNodeNetworkStore.getState().setNetworksMinimized(true);
    useNodeNetworkStore.getState().setShouldForceShowOverlay(true);

    const persisted = nodeNetworkStorePartialize(useNodeNetworkStore.getState());
    useEditorGraphStore.getState().reset();
    useNodeNetworkStore.setState({
      openNetwork: null,
      areNetworksMinimized: false,
      shouldForceShowOverlay: false,
    });

    const merged = nodeNetworkStoreMerge(
      persisted,
      useNodeNetworkStore.getState(),
    );

    expect(merged.openNetwork).toBe(parameterId);
    expect(merged.areNetworksMinimized).toBe(true);
    expect(merged.shouldForceShowOverlay).toBe(false);
    expect((merged as any).networks).toBeUndefined();
  });

  it('opens shared portable graphs without mutation and detaches one parameter safely', () => {
    const project = createSignalCathedralProject();
    const parameterId =
      'layer-signal-cathedral:reactivity:structurePulse';

    useEditorProjectStore.getState().importWorkingProject(project);
    const revisionBeforeOpen =
      vizSessionStore.getState().project.revision;

    editorControl.nodeEditor.openNetwork(parameterId);

    const network =
      useEditorGraphStore.getState().networks[
        SIGNAL_CATHEDRAL_GRAPH_ID
      ];
    expect(useNodeNetworkStore.getState().openNetwork).toBe(
      SIGNAL_CATHEDRAL_GRAPH_ID,
    );
    expect(vizSessionStore.getState().project.revision).toBe(
      revisionBeforeOpen,
    );
    expect(network?.nodes).toHaveLength(23);
    expect(
      network?.nodes.find((node) => node.id === 'scale-bass')?.data
        .definition,
    ).toMatchObject({
      label: 'Multiply',
      inputs: [
        { id: 'value', type: 'number' },
        { id: 'factor', type: 'number' },
      ],
      outputs: [{ id: 'value', type: 'number' }],
    });
    expect(
      network?.nodes.filter((node) => node.data.graphOutputKey),
    ).toHaveLength(5);

    editorControl.nodeEditor.setAnimationEnabled(
      parameterId,
      false,
      VType.Number,
    );

    const detachedProject =
      useEditorProjectStore.getState().exportWorkingProject();
    expect(
      detachedProject.layers[0]?.inputs?.[
        'reactivity:structurePulse'
      ],
    ).toBeUndefined();
    expect(
      detachedProject.layers[0]?.inputs?.['reactivity:coreEnergy'],
    ).toMatchObject({
      kind: 'graph-output',
      graphId: SIGNAL_CATHEDRAL_GRAPH_ID,
      output: 'coreEnergy',
    });
    expect(
      detachedProject.graphs?.find(
        (graph) => graph.id === SIGNAL_CATHEDRAL_GRAPH_ID,
      ),
    ).toMatchObject({
      nodes: { length: 18 },
      outputs: { length: 5 },
    });

    editorControl.history.undo();
    expect(
      useEditorProjectStore.getState().exportWorkingProject().layers[0]
        ?.inputs?.['reactivity:structurePulse'],
    ).toMatchObject({
      kind: 'graph-output',
      graphId: SIGNAL_CATHEDRAL_GRAPH_ID,
      output: 'structurePulse',
    });
  });

  it('roundtrips shared portable graph edits without losing canonical inputs or outputs', () => {
    const project = createSignalCathedralProject();
    useEditorProjectStore.getState().importWorkingProject(project);

    useEditorGraphStore.getState().updateNodeInputValue(
      SIGNAL_CATHEDRAL_GRAPH_ID,
      'scale-bass',
      'factor',
      1.5,
    );

    const graph = useEditorProjectStore
      .getState()
      .exportWorkingProject()
      .graphs?.find(
        (candidate) => candidate.id === SIGNAL_CATHEDRAL_GRAPH_ID,
      );

    expect(graph?.inputs).toEqual(project.graphs?.[0]?.inputs);
    expect(graph?.outputs).toEqual(project.graphs?.[0]?.outputs);
    expect(graph?.nodes).toHaveLength(18);
    expect(
      graph?.nodes.find((node) => node.id === 'scale-bass'),
    ).toMatchObject({
      type: 'multiply',
      inputs: {
        factor: {
          kind: 'literal',
          value: 1.5,
        },
      },
    });
    expect(JSON.stringify(graph)).not.toContain(
      '__viz_graph_output__',
    );
    expect(validateProjectDocument(
      useEditorProjectStore.getState().exportWorkingProject(),
    )).toMatchObject({
      ok: true,
      issues: [],
    });
  });

  it('roundtrips persisted graph definitions back into executable node definitions', () => {
    const parameterId = 'layer-3:settings.opacity';

    useEditorGraphStore
      .getState()
      .createNetworkForParameter(parameterId, VType.Number);

    const persistedProject =
      useEditorProjectStore.getState().exportWorkingProject();
    useEditorGraphStore.getState().reset();
    useEditorProjectStore.getState().importWorkingProject(persistedProject);

    expect(useEditorGraphStore.getState().networks[parameterId]).toBeDefined();
    expect(
      useEditorGraphStore.getState().networks[parameterId].nodes.find(
        (node) => node.data.definition.label === 'Output',
      )?.data.definition.inputs[0]?.type,
    ).toBe('number');
  });

  it('keeps package-native graphs canonical when the legacy node UI edits its projection', () => {
    const project = createTestProject();
    project.graphs = [
      {
        id: 'runtime-native-graph',
        name: 'Runtime Native Graph',
        nodes: [
          {
            id: 'runtime-node',
            type: 'runtime.native.node',
          },
        ],
        outputs: [
          {
            key: 'value',
            nodeId: 'runtime-node',
            output: 'value',
          },
        ],
      },
    ];
    useEditorProjectStore.getState().importWorkingProject(project);

    useEditorGraphStore
      .getState()
      .createNetworkForParameter('editor-graph', VType.Number);

    const canonicalProject =
      useEditorProjectStore.getState().exportWorkingProject();

    expect(canonicalProject.graphs?.map((graph) => graph.id)).toEqual([
      'runtime-native-graph',
      'editor-graph',
    ]);
    expect(validateProjectDocument(canonicalProject)).toMatchObject({
      ok: true,
      issues: [],
    });
    expect(JSON.stringify(canonicalProject)).not.toContain('computeSignal');
  });

  it('preserves package-native graphs during bulk editor-network replacement', () => {
    const nativeGraph = {
      id: 'runtime-native-graph',
      name: 'Runtime Native Graph',
      nodes: [
        {
          id: 'runtime-node',
          type: 'runtime.native.node',
          inputs: {
            amount: {
              kind: 'literal' as const,
              value: 0.75,
            },
          },
        },
      ],
      outputs: [
        {
          key: 'value',
          nodeId: 'runtime-node',
          output: 'value',
        },
      ],
    };
    const project = createTestProject();
    project.graphs = [nativeGraph];
    useEditorProjectStore.getState().importWorkingProject(project);
    useEditorGraphStore
      .getState()
      .createNetworkForParameter('editor-graph', VType.Number);

    useEditorGraphStore.getState().replaceNetworks({});

    expect(
      useEditorProjectStore.getState().exportWorkingProject().graphs,
    ).toEqual([nativeGraph]);
  });
});
