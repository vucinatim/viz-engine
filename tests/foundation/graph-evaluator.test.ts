import type { VizNodeImplementation } from '@viz-engine/contracts';
import {
  exampleAudioTimelineArtifact,
  exampleMainReactivityGraph,
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from '@viz-engine/example-projects';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import {
  createVizNodeRegistry,
  createVizRuntimeSession,
  evaluateSingleVizGraph,
  evaluateVizGraphs,
} from '@viz-engine/runtime';
import { describe, expect, it } from 'vitest';

describe('Viz graph evaluation', () => {
  it('evaluates embedded graph outputs deterministically from project-scoped inputs', () => {
    const session = createVizRuntimeSession({
      project: exampleProjectDocument,
      mode: 'render',
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: 'graph-seed',
    });

    const result = evaluateSingleVizGraph({
      graph: exampleMainReactivityGraph,
      session,
      frame: 36,
      registry: createCoreNodeRegistry(),
    });

    expect(result.issues).toHaveLength(0);
    expect(typeof result.values.barsBass).toBe('number');
    expect(typeof result.values.barsLoudness).toBe('number');
    expect(typeof result.values.bloomIntensity).toBe('number');
    expect(result.values.barsBass).not.toBe(result.values.barsLoudness);
    expect(result.nodes['node-bars-bass-scale']?.inputs).toMatchObject({
      factor: 0.92,
    });
    expect(typeof result.nodes['node-bars-bass-scale']?.outputs.value).toBe(
      'number',
    );
  });

  it('evaluates transient graph values without poisoning canonical temporal checkpoints', () => {
    const session = createVizRuntimeSession({
      project: exampleProjectDocument,
      mode: 'live',
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: 'live-graph-values-seed',
    });
    const registry = createCoreNodeRegistry();
    const canonical = evaluateVizGraphs({
      session,
      frame: 36,
      registry,
    }).get(exampleMainReactivityGraph.id);
    const liveGraph = structuredClone(exampleMainReactivityGraph);
    const scale = liveGraph.nodes.find(
      (node) => node.id === 'node-bars-bass-scale',
    );
    scale!.inputs!.factor = { kind: 'literal', value: 1.84 };

    const transient = evaluateVizGraphs({
      session,
      frame: 36,
      registry,
      graphValues: { [liveGraph.id]: liveGraph },
    }).get(liveGraph.id);
    const canonicalAgain = evaluateVizGraphs({
      session,
      frame: 36,
      registry,
    }).get(exampleMainReactivityGraph.id);

    expect(transient?.nodes['node-bars-bass-scale']?.inputs.factor).toBe(1.84);
    expect(transient?.values.barsBass).not.toBe(canonical?.values.barsBass);
    expect(canonicalAgain).toEqual(canonical);
  });

  it('reports graph cycles explicitly instead of recursing forever', () => {
    const session = createVizRuntimeSession({
      project: {
        ...exampleProjectDocument,
        graphs: [
          {
            id: 'graph-cycle-test',
            name: 'Cycle Test',
            nodes: [
              {
                id: 'node-a',
                type: 'add',
                inputs: {
                  a: {
                    kind: 'node-output',
                    nodeId: 'node-b',
                    output: 'value',
                  },
                  b: {
                    kind: 'literal',
                    value: 1,
                  },
                },
              },
              {
                id: 'node-b',
                type: 'add',
                inputs: {
                  a: {
                    kind: 'node-output',
                    nodeId: 'node-a',
                    output: 'value',
                  },
                  b: {
                    kind: 'literal',
                    value: 1,
                  },
                },
              },
            ],
            outputs: [
              {
                key: 'value',
                nodeId: 'node-a',
                output: 'value',
              },
            ],
          },
        ],
      },
      mode: 'render',
      seed: 'graph-cycle-seed',
    });

    const [cycleGraph] = session.project.graphs ?? [];

    expect(cycleGraph).toBeDefined();

    const result = evaluateSingleVizGraph({
      graph: cycleGraph!,
      session,
      frame: 0,
      registry: createCoreNodeRegistry(),
    });

    expect(result.issues.some((issue) => issue.code === 'graph-cycle')).toBe(
      true,
    );
  });

  it('replays temporal nodes deterministically with fixed-step frame time', () => {
    const session = createVizRuntimeSession({
      project: {
        ...exampleProjectDocument,
        graphs: [
          {
            id: 'graph-temporal-decay-test',
            name: 'Temporal Decay Test',
            inputs: {
              fluxSource: {
                kind: 'artifact-feature',
                artifactId: exampleAudioTimelineArtifact.id,
                feature: 'spectral-flux',
              },
            },
            nodes: [
              {
                id: 'node-flux-input',
                type: 'graph-input',
                inputs: {
                  inputKey: {
                    kind: 'literal',
                    value: 'fluxSource',
                  },
                },
              },
              {
                id: 'node-flux-decay',
                type: 'decay',
                inputs: {
                  value: {
                    kind: 'node-output',
                    nodeId: 'node-flux-input',
                    output: 'value',
                  },
                  falloffPerSecond: {
                    kind: 'literal',
                    value: 0.35,
                  },
                },
              },
            ],
            outputs: [
              {
                key: 'decayedFlux',
                nodeId: 'node-flux-decay',
                output: 'value',
              },
            ],
          },
        ],
      },
      mode: 'render',
      resolvedArtifacts: [
        {
          ...exampleResolvedArtifacts[0]!,
          payload: {
            ...exampleAudioTimelineArtifact,
            sourceWindow: {
              startSample: 0,
              sampleCount: 5_880,
              startSeconds: 0,
              durationSeconds: 4 / 30,
            },
            frameAlignment: {
              fps: 30,
              frameCount: 4,
              alignment: 'frame-centered',
            },
            featureSeries: [
              {
                name: 'spectral-flux',
                unit: 'unit',
                normalization: 'artifact-peak',
                values: [1, 0, 0.1, 0],
              },
            ],
          },
        },
      ],
      seed: 'graph-temporal-seed',
    });

    const [temporalGraph] = session.project.graphs ?? [];
    expect(temporalGraph).toBeDefined();

    const frameZero = evaluateSingleVizGraph({
      graph: temporalGraph!,
      session,
      frame: 0,
      registry: createCoreNodeRegistry(),
    });
    const frameOne = evaluateSingleVizGraph({
      graph: temporalGraph!,
      session,
      frame: 1,
      registry: createCoreNodeRegistry(),
    });
    const frameTwo = evaluateSingleVizGraph({
      graph: temporalGraph!,
      session,
      frame: 2,
      registry: createCoreNodeRegistry(),
    });

    expect(frameZero.issues).toHaveLength(0);
    expect(frameOne.issues).toHaveLength(0);
    expect(frameTwo.issues).toHaveLength(0);
    expect(frameZero.values.decayedFlux).toBe(1);
    expect(frameOne.values.decayedFlux).toBeCloseTo(0.9883333333, 6);
    expect(frameTwo.values.decayedFlux).toBeCloseTo(0.9766666667, 6);
  });

  it('reuses temporal graph checkpoints on repeated evaluation within one runtime session', () => {
    let stepCalls = 0;

    const countingDecayNode: VizNodeImplementation = {
      type: 'counting-decay',
      name: 'Counting Decay',
      category: 'temporal',
      outputs: [
        {
          key: 'value',
          label: 'Value',
        },
      ],
      createInitialState: () => 0,
      step: ({ inputs, previousState, deltaTimeSeconds }) => {
        stepCalls += 1;
        const incoming = typeof inputs.value === 'number' ? inputs.value : 0;
        const previous = typeof previousState === 'number' ? previousState : 0;
        const falloff =
          typeof inputs.falloffPerSecond === 'number'
            ? inputs.falloffPerSecond
            : 0;
        const nextValue = Math.max(
          incoming,
          Math.max(0, previous - falloff * deltaTimeSeconds),
        );

        return {
          state: nextValue,
          outputs: {
            value: nextValue,
          },
        };
      },
    };

    const session = createVizRuntimeSession({
      project: {
        ...exampleProjectDocument,
        graphs: [
          {
            id: 'graph-temporal-checkpoint-test',
            name: 'Temporal Checkpoint Test',
            inputs: {
              fluxSource: {
                kind: 'artifact-feature',
                artifactId: exampleAudioTimelineArtifact.id,
                feature: 'spectral-flux',
              },
            },
            nodes: [
              {
                id: 'node-flux-input',
                type: 'graph-input',
                inputs: {
                  inputKey: {
                    kind: 'literal',
                    value: 'fluxSource',
                  },
                },
              },
              {
                id: 'node-decay',
                type: 'counting-decay',
                inputs: {
                  value: {
                    kind: 'node-output',
                    nodeId: 'node-flux-input',
                    output: 'value',
                  },
                  falloffPerSecond: {
                    kind: 'literal',
                    value: 0.35,
                  },
                },
              },
            ],
            outputs: [
              {
                key: 'value',
                nodeId: 'node-decay',
                output: 'value',
              },
            ],
          },
        ],
      },
      mode: 'render',
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: 'graph-temporal-checkpoint-seed',
      graphCheckpointIntervalFrames: 15,
    });

    const registry = createVizNodeRegistry([
      ...createCoreNodeRegistry().list(),
      countingDecayNode,
    ]);
    const [temporalGraph] = session.project.graphs ?? [];

    expect(temporalGraph).toBeDefined();

    evaluateSingleVizGraph({
      graph: temporalGraph!,
      session,
      frame: 60,
      registry,
    });

    expect(stepCalls).toBe(61);
    expect(
      session
        .listGraphCheckpoints('graph-temporal-checkpoint-test')
        .map((checkpoint) => checkpoint.frame),
    ).toEqual([0, 15, 30, 45, 60]);

    evaluateSingleVizGraph({
      graph: temporalGraph!,
      session,
      frame: 90,
      registry,
    });

    expect(stepCalls).toBe(91);
    expect(
      session
        .listGraphCheckpoints('graph-temporal-checkpoint-test')
        .map((checkpoint) => checkpoint.frame),
    ).toEqual([0, 15, 30, 45, 60, 75, 90]);
  });
});
