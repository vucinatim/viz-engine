import {
  applyVizProjectAction,
  applyVizProjectActions,
} from '@viz-engine/actions';
import { createCoreComponentRegistry } from '@viz-engine/components-core';
import {
  exampleAudioTimelineArtifact,
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from '@viz-engine/example-projects';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import {
  createVizFramePlan,
  createVizRenderPlan,
  createVizRuntimeSession,
  validateProjectDocument,
} from '@viz-engine/runtime';
import { describe, expect, it } from 'vitest';

describe('Viz action surface', () => {
  it('builds a valid graph-driven mutation sequence over the canonical project document', () => {
    const result = applyVizProjectActions(exampleProjectDocument, [
      {
        type: 'graph.create',
        payload: {
          graphId: 'graph-action-test',
          name: 'Action Test Graph',
        },
      },
      {
        type: 'graph.input.set',
        payload: {
          graphId: 'graph-action-test',
          inputKey: 'flux',
          source: {
            kind: 'artifact-feature',
            artifactId: exampleAudioTimelineArtifact.id,
            feature: 'spectral-flux',
          },
        },
      },
      {
        type: 'graph.node.add',
        payload: {
          graphId: 'graph-action-test',
          nodeId: 'node-flux-input',
          nodeType: 'graph-input',
          initialInputs: {
            inputKey: {
              kind: 'literal',
              value: 'flux',
            },
          },
        },
      },
      {
        type: 'graph.node.add',
        payload: {
          graphId: 'graph-action-test',
          nodeId: 'node-flux-scale',
          nodeType: 'multiply',
          initialInputs: {
            value: {
              kind: 'node-output',
              nodeId: 'node-flux-input',
              output: 'value',
            },
            factor: {
              kind: 'literal',
              value: 0.5,
            },
          },
        },
      },
      {
        type: 'graph.output.set',
        payload: {
          graphId: 'graph-action-test',
          output: {
            key: 'scaledFlux',
            nodeId: 'node-flux-scale',
            output: 'value',
          },
        },
      },
      {
        type: 'layer.input.set',
        payload: {
          layerId: 'layer-bloom',
          inputKey: 'intensity',
          valueSource: {
            kind: 'graph-output',
            graphId: 'graph-action-test',
            output: 'scaledFlux',
          },
        },
      },
    ]);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);

    const validation = validateProjectDocument(result.project);
    expect(validation.ok).toBe(true);

    const session = createVizRuntimeSession({
      project: result.project,
      mode: 'render',
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: 'action-graph-seed',
    });

    const framePlan = createVizFramePlan({
      session,
      frame: 24,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
    });

    expect(framePlan.issues).toHaveLength(0);
    const bloomLayer = framePlan.layers.find(
      (layer) => layer.layerId === 'layer-bloom',
    );
    expect(bloomLayer?.resolvedInputs.intensity.sourceKind).toBe(
      'graph-output',
    );
    expect(typeof bloomLayer?.resolvedInputs.intensity.value).toBe('number');
  });

  it('creates, reorders, and renders a new layer through actions', () => {
    const result = applyVizProjectActions(exampleProjectDocument, [
      {
        type: 'layer.create',
        payload: {
          layerId: 'layer-action-accent',
          index: 1,
          layer: {
            name: 'Action Accent',
            componentId: 'solid-color',
            enabled: true,
            opacity: 0.18,
            blendMode: 'screen',
            rendererFamily: 'three',
            settings: {
              color: '#113a53',
            },
            inputs: {
              glow: {
                kind: 'literal',
                value: 0.24,
              },
            },
          },
        },
      },
      {
        type: 'layer.move',
        payload: {
          layerId: 'layer-action-accent',
          index: 2,
        },
      },
      {
        type: 'layer.settings.set',
        payload: {
          layerId: 'layer-action-accent',
          path: 'meta.debug.label',
          value: 'inserted-by-action',
        },
      },
    ]);

    expect(result.ok).toBe(true);
    expect(result.project.layerOrder[2]).toBe('layer-action-accent');
    expect(
      (
        result.project.layers.find(
          (layer) => layer.id === 'layer-action-accent',
        )?.settings as {
          meta?: { debug?: { label?: string } };
        }
      )?.meta?.debug?.label,
    ).toBe('inserted-by-action');

    const renderPlan = createVizRenderPlan({
      session: createVizRuntimeSession({
        project: result.project,
        mode: 'render',
        resolvedAssets: exampleResolvedAssets,
        resolvedArtifacts: exampleResolvedArtifacts,
        seed: 'action-layer-seed',
      }),
      frame: 12,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
    });

    expect(renderPlan.issues).toHaveLength(0);
    expect(
      renderPlan.layers.some(
        (layer) => layer.layerId === 'layer-action-accent',
      ),
    ).toBe(true);
  });

  it('authors graph layout, output ports, and connections without replacing the graph', () => {
    const created = applyVizProjectActions(exampleProjectDocument, [
      {
        type: 'graph.create',
        payload: { graphId: 'direct-authoring', name: 'Direct Authoring' },
      },
      {
        type: 'graph.node.add',
        payload: {
          graphId: 'direct-authoring',
          nodeId: 'gain',
          nodeType: 'multiply',
          position: { x: 120, y: 40 },
        },
      },
      {
        type: 'graph.output.set',
        payload: {
          graphId: 'direct-authoring',
          output: {
            key: 'value',
            valueType: 'number',
            position: { x: 480, y: 40 },
          },
        },
      },
      {
        type: 'graph.node.input.set',
        payload: {
          graphId: 'direct-authoring',
          nodeId: 'gain',
          inputKey: 'factor',
          binding: { kind: 'literal', value: 0.5 },
        },
      },
      {
        type: 'graph.output.set',
        payload: {
          graphId: 'direct-authoring',
          output: {
            key: 'value',
            nodeId: 'gain',
            output: 'value',
            valueType: 'number',
            position: { x: 480, y: 40 },
          },
        },
      },
      {
        type: 'graph.node.position.set',
        payload: {
          graphId: 'direct-authoring',
          nodeId: 'gain',
          position: { x: 180, y: 80 },
        },
      },
      {
        type: 'graph.output.position.set',
        payload: {
          graphId: 'direct-authoring',
          outputKey: 'value',
          position: { x: 520, y: 80 },
        },
      },
      {
        type: 'graph.enabled.set',
        payload: { graphId: 'direct-authoring', enabled: false },
      },
    ]);

    expect(created.ok).toBe(true);
    const graph = created.project.graphs?.find(
      (candidate) => candidate.id === 'direct-authoring',
    );
    expect(graph).toMatchObject({
      enabled: false,
      nodes: [
        {
          id: 'gain',
          position: { x: 180, y: 80 },
          inputs: {
            factor: { kind: 'literal', value: 0.5 },
          },
        },
      ],
      outputs: [
        {
          key: 'value',
          nodeId: 'gain',
          output: 'value',
          valueType: 'number',
          position: { x: 520, y: 80 },
        },
      ],
    });

    const removed = applyVizProjectActions(created.project, [
      {
        type: 'graph.node.remove',
        payload: { graphId: 'direct-authoring', nodeId: 'gain' },
      },
    ]);
    expect(removed.ok).toBe(true);
    expect(
      removed.project.graphs?.find(
        (candidate) => candidate.id === 'direct-authoring',
      )?.outputs,
    ).toEqual([
      {
        key: 'value',
        valueType: 'number',
        position: { x: 520, y: 80 },
      },
    ]);
    expect(validateProjectDocument(removed.project).ok).toBe(true);
  });

  it('returns structured errors for invalid mutations without breaking the current document', () => {
    const result = applyVizProjectAction(exampleProjectDocument, {
      type: 'layer.remove',
      payload: {
        layerId: 'layer-does-not-exist',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('missing-layer');
    expect(result.project).toBe(exampleProjectDocument);
  });

  it('replaces and removes editor documents atomically without touching sibling graphs', () => {
    const graph = exampleProjectDocument.graphs?.[0];
    expect(graph).toBeDefined();

    const replacement = {
      ...graph!,
      name: 'Edited Graph',
      nodes: graph!.nodes.slice(0, 1),
      outputs: [],
    };
    const replaced = applyVizProjectActions(exampleProjectDocument, [
      {
        type: 'graph.replace',
        payload: {
          graphId: graph!.id,
          graph: replacement,
        },
      },
      {
        type: 'timeline.set',
        payload: {
          timeline: {
            ...exampleProjectDocument.timeline,
            durationInFrames: 480,
          },
        },
      },
    ]);

    expect(replaced.ok).toBe(true);
    expect(
      replaced.project.graphs?.find((entry) => entry.id === graph!.id),
    ).toEqual(replacement);
    expect(replaced.project.timeline.durationInFrames).toBe(480);

    const removed = applyVizProjectAction(replaced.project, {
      type: 'graph.remove',
      payload: { graphId: graph!.id },
    });
    expect(removed.ok).toBe(true);
    expect(removed.project.graphs).not.toContainEqual(
      expect.objectContaining({ id: graph!.id }),
    );
    expect(
      removed.project.layers.flatMap((layer) =>
        Object.values(layer.inputs ?? {}),
      ),
    ).not.toContainEqual(
      expect.objectContaining({
        kind: 'graph-output',
        graphId: graph!.id,
      }),
    );
  });
});
