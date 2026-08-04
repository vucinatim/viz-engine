import {
  VIZ_PROJECT_SCHEMA_VERSION,
  createVizComponentRegistry,
  type VizComponentImplementation,
  type VizNodeImplementation,
  type VizProjectDocument,
  type VizRenderThreeProgramNode,
} from '@viz-engine/contracts';
import {
  createVizNodeRegistry,
  createVizRenderPlan,
  createVizRuntimeSession,
  evaluateSingleVizGraph,
} from '@viz-engine/runtime';
import { describe, expect, it } from 'vitest';

const historyComponent: VizComponentImplementation = {
  id: 'history-component',
  name: 'History Component',
  rendererFamily: 'three',
  implementationVersion: '1',
  temporal: {
    step: ({ settings }, previousState) => [
      ...(Array.isArray(previousState) ? previousState : []),
      settings.value,
    ],
  },
  render: ({ layer, temporalState }) =>
    ({
      kind: 'three-program',
      id: layer.id,
      programId: 'test/history',
      parameters: {
        history: Array.isArray(temporalState) ? temporalState : [],
      },
    }) satisfies VizRenderThreeProgramNode,
};

const frameNode: VizNodeImplementation = {
  type: 'test-frame-value',
  name: 'Frame Value',
  category: 'pure',
  outputs: [{ key: 'value', label: 'Value' }],
  evaluate: ({ frameContext }) => ({ value: frameContext.frame }),
};

const project: VizProjectDocument = {
  schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
  projectId: 'temporal-runtime-test',
  name: 'Temporal Runtime Test',
  timeline: { fps: 60, durationInFrames: 120 },
  viewport: { width: 320, height: 180 },
  layerOrder: ['layer'],
  layers: [
    {
      id: 'layer',
      name: 'History',
      componentId: historyComponent.id,
      enabled: true,
      opacity: 1,
      blendMode: 'normal',
      settings: { value: -1 },
      inputs: {
        value: {
          kind: 'graph-output',
          graphId: 'frame-graph',
          output: 'value',
        },
      },
    },
  ],
  graphs: [
    {
      id: 'frame-graph',
      name: 'Frame Graph',
      nodes: [{ id: 'frame', type: frameNode.type }],
      outputs: [{ key: 'value', nodeId: 'frame', output: 'value' }],
    },
  ],
};

const componentRegistry = createVizComponentRegistry([historyComponent], {
  strict: true,
});
const nodeRegistry = createVizNodeRegistry([frameNode]);

const readHistory = (plan: ReturnType<typeof createVizRenderPlan>) => {
  const node = plan.layers[0]?.node;
  if (!node || node.kind !== 'three-program') {
    throw new Error('Expected a temporal Three program node.');
  }
  return node.parameters.history;
};

describe('Temporal component runtime', () => {
  it('produces identical cold, sequential, repeated, and backward-seek output', () => {
    const coldPlan = createVizRenderPlan({
      session: createVizRuntimeSession({ project, mode: 'render' }),
      frame: 3,
      registry: componentRegistry,
      nodeRegistry,
    });
    const session = createVizRuntimeSession({ project, mode: 'render' });
    let sequentialPlan = createVizRenderPlan({
      session,
      frame: 0,
      registry: componentRegistry,
      nodeRegistry,
    });
    for (let frame = 1; frame <= 3; frame += 1) {
      sequentialPlan = createVizRenderPlan({
        session,
        frame,
        registry: componentRegistry,
        nodeRegistry,
      });
    }

    expect(readHistory(coldPlan)).toEqual([0, 1, 2, 3]);
    expect(sequentialPlan).toEqual(coldPlan);
    expect(
      createVizRenderPlan({
        session,
        frame: 3,
        registry: componentRegistry,
        nodeRegistry,
      }),
    ).toEqual(sequentialPlan);
    expect(
      readHistory(
        createVizRenderPlan({
          session,
          frame: 1,
          registry: componentRegistry,
          nodeRegistry,
        }),
      ),
    ).toEqual([0, 1]);
  });

  it('keeps sparse component checkpoints within the configured bound', () => {
    const session = createVizRuntimeSession({
      project,
      mode: 'live',
      componentCheckpointIntervalFrames: 1,
      maxComponentCheckpointsPerLayer: 2,
    });
    for (let frame = 0; frame <= 3; frame += 1) {
      createVizRenderPlan({
        session,
        frame,
        registry: componentRegistry,
        nodeRegistry,
      });
    }
    expect(
      session
        .listComponentCheckpoints('layer')
        .map((checkpoint) => checkpoint.frame),
    ).toEqual([2, 3]);
  });

  it('uses frame-specific graph inputs while replaying temporal nodes', () => {
    const sumNode: VizNodeImplementation = {
      type: 'sum-graph-input',
      name: 'Sum Graph Input',
      category: 'temporal',
      outputs: [{ key: 'value', label: 'Value' }],
      step: ({ graphInputs, previousState }) => {
        const previous = typeof previousState === 'number' ? previousState : 0;
        const input = graphInputs.signal?.value;
        const state = previous + (typeof input === 'number' ? input : 0);
        return { state, outputs: { value: state } };
      },
    };
    const graph = {
      id: 'input-history-graph',
      name: 'Input History Graph',
      nodes: [{ id: 'sum', type: sumNode.type }],
      outputs: [{ key: 'value', nodeId: 'sum', output: 'value' }],
    };
    const inputFrames: number[] = [];
    const result = evaluateSingleVizGraph({
      graph,
      session: createVizRuntimeSession({
        project: { ...project, layers: [], layerOrder: [], graphs: [graph] },
        mode: 'render',
      }),
      frame: 3,
      registry: createVizNodeRegistry([sumNode]),
      inputValueProvider: (frame) => {
        inputFrames.push(frame);
        return { signal: frame + 1 };
      },
    });

    expect(inputFrames).toEqual([0, 1, 2, 3]);
    expect(result.values.value).toBe(10);
  });
});
