import { beforeEach, describe, expect, it } from 'vitest';

import useEditorProjectStore from '@/lib/stores/editor-project-store';
import { createVizGraphFragment, vizSessionActions } from '@/lib/viz-session';
import { createTestProject } from './viz-session-test-utils';

describe('Canonical graph fragments', () => {
  beforeEach(() => {
    const project = createTestProject();
    project.graphs = [
      {
        id: 'fragment-graph',
        name: 'Fragment Graph',
        nodes: [
          {
            id: 'input',
            type: 'Input',
            position: { x: 0, y: 0 },
          },
          {
            id: 'source',
            type: 'Normalize',
            position: { x: 200, y: 0 },
            inputs: {
              value: {
                kind: 'node-output',
                nodeId: 'input',
                output: 'audioSignal',
              },
            },
          },
          {
            id: 'sink',
            type: 'Math',
            position: { x: 400, y: 0 },
            inputs: {
              a: {
                kind: 'node-output',
                nodeId: 'source',
                output: 'result',
              },
              b: { kind: 'literal', value: 2 },
            },
          },
        ],
        outputs: [
          {
            key: 'value',
            nodeId: 'sink',
            output: 'result',
            valueType: 'number',
            position: { x: 600, y: 0 },
          },
        ],
      },
    ];
    useEditorProjectStore.getState().importWorkingProject(project);
  });

  it('copies and pastes a canonical fragment with remapped internal and boundary connections', () => {
    const graph = useEditorProjectStore.getState().exportWorkingProject()
      .graphs?.[0];
    if (!graph) {
      throw new Error('Expected graph fixture');
    }

    const fragment = createVizGraphFragment(graph, ['source', 'sink']);
    expect(fragment).toMatchObject({
      nodes: [{ id: 'source' }, { id: 'sink' }],
      inputConnections: [
        {
          targetNodeId: 'source',
          inputKey: 'value',
          sourceOutput: 'audioSignal',
        },
      ],
      outputConnections: [
        {
          outputKey: 'value',
          sourceNodeId: 'sink',
          sourceOutput: 'result',
        },
      ],
    });

    const pastedIds = vizSessionActions.graph.pasteFragment(
      graph.id,
      fragment,
      { x: 500, y: 300 },
    );
    expect(pastedIds).toEqual([
      'fragment-graph-node-copy-1',
      'fragment-graph-node-copy-2',
    ]);

    const pastedGraph = useEditorProjectStore.getState().exportWorkingProject()
      .graphs?.[0];
    expect(
      pastedGraph?.nodes.find(
        (node) => node.id === 'fragment-graph-node-copy-1',
      ),
    ).toMatchObject({
      position: { x: 400, y: 300 },
      inputs: {
        value: {
          kind: 'node-output',
          nodeId: 'input',
          output: 'audioSignal',
        },
      },
    });
    expect(
      pastedGraph?.nodes.find(
        (node) => node.id === 'fragment-graph-node-copy-2',
      ),
    ).toMatchObject({
      position: { x: 600, y: 300 },
      inputs: {
        a: {
          kind: 'node-output',
          nodeId: 'fragment-graph-node-copy-1',
          output: 'result',
        },
        b: { kind: 'literal', value: 2 },
      },
    });
    expect(pastedGraph?.outputs[0]).toMatchObject({
      nodeId: 'fragment-graph-node-copy-2',
      output: 'result',
      valueType: 'number',
      position: { x: 600, y: 0 },
    });
    expect(JSON.stringify(pastedGraph)).not.toContain('NodeNetwork');
  });
});
