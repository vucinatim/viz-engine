import { beforeEach, describe, expect, it } from 'vitest';

import {
  getNodeNetwork,
  nodeNetworkStoreMerge,
  nodeNetworkStorePartialize,
  setNodeNetworkEnabled,
  useNodeNetworkStore,
} from '@/components/node-network/node-network-store';
import editorControl from '@/lib/editor-control';
import {
  getVizSessionState,
  selectProjectedNodeNetworks,
  vizSessionActions,
  vizSessionStore,
} from '@/lib/viz-session';
import {
  SIGNAL_CATHEDRAL_GRAPH_ID,
  createSignalCathedralProject,
} from '@viz-engine/production-signal-cathedral';
import { validateProjectDocument } from '@viz-engine/runtime';
import { createTestProject } from './viz-session-test-utils';

describe('VizSession graph authoring', () => {
  beforeEach(() => {
    vizSessionActions.project.importWorkingProject(createTestProject());
    vizSessionActions.graph.reset();
    useNodeNetworkStore.setState({
      openNetwork: null,
      areNetworksMinimized: false,
      shouldForceShowOverlay: false,
    });
  });

  it('owns canonical graph truth while the node editor store mirrors it', () => {
    const parameterId = 'layer-1:settings.amount';

    vizSessionActions.graph.createNetworkForParameter(parameterId, 'number');

    expect(
      selectProjectedNodeNetworks(getVizSessionState())[parameterId]?.nodes
        .length,
    ).toBe(2);
    expect(
      vizSessionStore
        .getState()
        .project.workingProject.graphs?.find(
          (graph) => graph.id === parameterId,
        )?.nodes.length,
    ).toBe(1);
    expect(
      vizSessionStore
        .getState()
        .project.workingProject.graphs?.find(
          (graph) => graph.id === parameterId,
        )?.outputs,
    ).toEqual([
      {
        key: 'value',
        valueType: 'number',
        position: { x: 300, y: 0 },
      },
    ]);
    expect(getNodeNetwork(parameterId)).toBeDefined();

    useNodeNetworkStore.getState().setOpenNetwork(parameterId);
    vizSessionActions.graph.removeNetworkForParameter(parameterId);

    expect(getNodeNetwork(parameterId)).toBeUndefined();
    expect(useNodeNetworkStore.getState().openNetwork).toBeNull();
  });

  it('keeps node-editor animation toggles as a delegate over canonical graphs', () => {
    const parameterId = 'layer-2:settings.scale';

    setNodeNetworkEnabled(parameterId, true, 'number');

    expect(
      selectProjectedNodeNetworks(getVizSessionState())[parameterId],
    ).toBeDefined();
    expect(useNodeNetworkStore.getState().openNetwork).toBe(parameterId);
    expect(useNodeNetworkStore.getState().shouldForceShowOverlay).toBe(true);
  });

  it('persists node-editor UI state separately from canonical graph truth', () => {
    const parameterId = 'layer-2:settings.scale';

    vizSessionActions.graph.createNetworkForParameter(parameterId, 'number');
    useNodeNetworkStore.getState().setOpenNetwork(parameterId);
    useNodeNetworkStore.getState().setNetworksMinimized(true);
    useNodeNetworkStore.getState().setShouldForceShowOverlay(true);

    const persisted = nodeNetworkStorePartialize(
      useNodeNetworkStore.getState(),
    );
    vizSessionActions.graph.reset();
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
    const parameterId = 'layer-signal-cathedral:reactivity:structurePulse';

    vizSessionActions.project.importWorkingProject(project);
    const revisionBeforeOpen = vizSessionStore.getState().project.revision;

    editorControl.nodeEditor.openNetwork(parameterId);

    const network =
      selectProjectedNodeNetworks(getVizSessionState())[
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
      network?.nodes.find((node) => node.id === 'scale-bass')?.data.definition,
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

    editorControl.nodeEditor.setAnimationEnabled(parameterId, false, 'number');

    const detachedProject = vizSessionActions.project.exportWorkingProject();
    expect(
      detachedProject.layers[0]?.inputs?.['reactivity:structurePulse'],
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
      vizSessionActions.project.exportWorkingProject().layers[0]?.inputs?.[
        'reactivity:structurePulse'
      ],
    ).toMatchObject({
      kind: 'graph-output',
      graphId: SIGNAL_CATHEDRAL_GRAPH_ID,
      output: 'structurePulse',
    });
  });

  it('roundtrips shared portable graph edits without losing canonical inputs or outputs', () => {
    const project = createSignalCathedralProject();
    vizSessionActions.project.importWorkingProject(project);

    vizSessionActions.graph.updateNodeInputValue(
      SIGNAL_CATHEDRAL_GRAPH_ID,
      'scale-bass',
      'factor',
      1.5,
    );

    const graph = vizSessionActions.project
      .exportWorkingProject()
      .graphs?.find((candidate) => candidate.id === SIGNAL_CATHEDRAL_GRAPH_ID);

    expect(graph?.inputs).toEqual(project.graphs?.[0]?.inputs);
    expect(graph?.outputs).toEqual(project.graphs?.[0]?.outputs);
    expect(graph?.nodes).toHaveLength(18);
    expect(graph?.nodes.find((node) => node.id === 'scale-bass')).toMatchObject(
      {
        type: 'multiply',
        inputs: {
          factor: {
            kind: 'literal',
            value: 1.5,
          },
        },
      },
    );
    expect(JSON.stringify(graph)).not.toContain('__viz_graph_output__');
    expect(
      validateProjectDocument(vizSessionActions.project.exportWorkingProject()),
    ).toMatchObject({
      ok: true,
      issues: [],
    });
  });

  it('keeps graph input gestures external until one synchronized commit', () => {
    const project = createSignalCathedralProject();
    vizSessionActions.project.importWorkingProject(project);
    const stateBefore = vizSessionStore.getState();
    const revisionBefore = stateBefore.project.revision;

    vizSessionActions.graph.beginInputGesture(SIGNAL_CATHEDRAL_GRAPH_ID);
    vizSessionActions.graph.updateLiveInputValue(
      SIGNAL_CATHEDRAL_GRAPH_ID,
      'scale-bass',
      'factor',
      1.25,
    );
    vizSessionActions.graph.updateLiveInputValue(
      SIGNAL_CATHEDRAL_GRAPH_ID,
      'scale-loudness',
      'factor',
      0.75,
    );

    expect(vizSessionStore.getState()).toBe(stateBefore);
    expect(vizSessionStore.getState().project.revision).toBe(revisionBefore);
    expect(
      vizSessionStore
        .getState()
        .project.workingProject.graphs?.[0]?.nodes.find(
          (node) => node.id === 'scale-bass',
        )?.inputs?.factor,
    ).toEqual({ kind: 'literal', value: 1.24 });

    vizSessionActions.graph.commitInputGesture(SIGNAL_CATHEDRAL_GRAPH_ID);

    expect(vizSessionStore.getState().project.revision).toBe(
      revisionBefore + 1,
    );
    const committedGraph =
      vizSessionStore.getState().project.workingProject.graphs?.[0];
    expect(
      committedGraph?.nodes.find((node) => node.id === 'scale-bass')?.inputs
        ?.factor,
    ).toEqual({ kind: 'literal', value: 1.25 });
    expect(
      committedGraph?.nodes.find((node) => node.id === 'scale-loudness')?.inputs
        ?.factor,
    ).toEqual({ kind: 'literal', value: 0.75 });
  });

  it('roundtrips persisted graph definitions back into executable node definitions', () => {
    const parameterId = 'layer-3:settings.opacity';

    vizSessionActions.graph.createNetworkForParameter(parameterId, 'number');

    const persistedProject = vizSessionActions.project.exportWorkingProject();
    vizSessionActions.graph.reset();
    vizSessionActions.project.importWorkingProject(persistedProject);

    expect(
      selectProjectedNodeNetworks(getVizSessionState())[parameterId],
    ).toBeDefined();
    expect(
      selectProjectedNodeNetworks(getVizSessionState())[parameterId].nodes.find(
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
    vizSessionActions.project.importWorkingProject(project);

    vizSessionActions.graph.createNetworkForParameter('editor-graph', 'number');

    const canonicalProject = vizSessionActions.project.exportWorkingProject();

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

  it('removes one editor-authored graph without touching package-native graphs', () => {
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
    vizSessionActions.project.importWorkingProject(project);
    vizSessionActions.graph.createNetworkForParameter('editor-graph', 'number');

    vizSessionActions.graph.removeNetworkForParameter('editor-graph');

    expect(vizSessionActions.project.exportWorkingProject().graphs).toEqual([
      nativeGraph,
    ]);
  });
});
