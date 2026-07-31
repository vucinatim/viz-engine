import { exampleProjectDocument } from '@viz-engine/example-projects';
import { validateProjectDocument } from '@viz-engine/runtime';
import { describe, expect, it } from 'vitest';

describe('Viz project document validation', () => {
  it('accepts the canonical example project document', () => {
    const result = validateProjectDocument(exampleProjectDocument);

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('requires external asset references to retain their portable URI', () => {
    const result = validateProjectDocument({
      ...exampleProjectDocument,
      assetRefs: [
        ...(exampleProjectDocument.assetRefs ?? []),
        {
          id: 'external-model',
          kind: 'model',
          source: 'external',
          label: 'External model',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: false,
      issues: [
        {
          code: 'missing-field',
          path: 'assetRefs.external-model.externalUri',
        },
      ],
    });
  });

  it('rejects malformed graph containers without throwing during validation', () => {
    const project = structuredClone(exampleProjectDocument) as unknown as {
      graphs: unknown[];
    };
    project.graphs = [
      {
        id: 'malformed-graph',
        name: 'Malformed Graph',
        nodes: { not: 'an array' },
        outputs: 'also-not-an-array',
      },
    ];

    expect(() => validateProjectDocument(project)).not.toThrow();
    expect(validateProjectDocument(project)).toMatchObject({ ok: false });
    expect(validateProjectDocument(project).issues).toEqual(
      expect.arrayContaining([
        {
          code: 'invalid-type',
          path: 'graphs.malformed-graph.nodes',
          message: expect.any(String),
        },
        {
          code: 'invalid-type',
          path: 'graphs.malformed-graph.outputs',
          message: expect.any(String),
        },
      ]),
    );
  });

  it('rejects missing graph references and cycles before session import', () => {
    const createGraphProject = (nodeInputs: Record<string, unknown>) => ({
      ...structuredClone(exampleProjectDocument),
      graphs: [
        {
          id: 'invalid-graph',
          name: 'Invalid Graph',
          nodes: [
            {
              id: 'node-a',
              type: 'Math',
              inputs: nodeInputs,
            },
            {
              id: 'node-b',
              type: 'Math',
              inputs: {
                a: {
                  kind: 'node-output',
                  nodeId: 'node-a',
                  output: 'result',
                },
              },
            },
          ],
          outputs: [],
        },
      ],
    });

    expect(
      validateProjectDocument(
        createGraphProject({
          a: {
            kind: 'node-output',
            nodeId: 'missing-node',
            output: 'result',
          },
        }),
      ).issues,
    ).toContainEqual(
      expect.objectContaining({
        code: 'missing-reference',
        path: 'graphs.invalid-graph.nodes.node-a.inputs.a',
        message: expect.stringContaining('missing upstream node'),
      }),
    );

    expect(
      validateProjectDocument(
        createGraphProject({
          a: {
            kind: 'node-output',
            nodeId: 'node-b',
            output: 'result',
          },
        }),
      ).issues,
    ).toContainEqual(
      expect.objectContaining({
        code: 'invalid-value',
        path: 'graphs.invalid-graph.nodes',
        message: 'Graph "invalid-graph" contains a cycle.',
      }),
    );
  });

  it('rejects malformed graph inputs and missing graph outputs at the document boundary', () => {
    const project = structuredClone(exampleProjectDocument) as unknown as {
      graphs: Array<Record<string, unknown>>;
      layers: Array<Record<string, unknown>>;
    };
    project.graphs = [
      {
        id: 'source-graph',
        name: 'Source Graph',
        inputs: {
          malformed: null,
          unsupported: { kind: 'graph-output', graphId: 'other' },
        },
        nodes: [],
        outputs: [{ key: 'available' }],
      },
    ];
    project.layers = project.layers.map((layer) => ({
      ...layer,
      graphId: undefined,
      inputs: undefined,
    }));
    project.layers[0] = {
      ...project.layers[0],
      inputs: {
        signal: {
          kind: 'graph-output',
          graphId: 'source-graph',
          output: 'missing',
        },
      },
    };

    expect(validateProjectDocument(project).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-type',
          path: 'graphs.source-graph.inputs.malformed',
        }),
        expect.objectContaining({
          code: 'invalid-value',
          path: 'graphs.source-graph.inputs.unsupported',
        }),
        expect.objectContaining({
          code: 'missing-reference',
          path: `layers.${String(project.layers[0]?.id)}.inputs.signal`,
          message: expect.stringContaining('missing output "missing"'),
        }),
      ]),
    );
  });
});
