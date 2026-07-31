import { NodeDefinitionMap } from '@/components/node-network/animation-nodes';
import {
  validateGraphConnection,
  type GraphConnectionValidation,
} from '@/components/node-network/connection-validator';
import type { GraphNode } from '@/components/node-network/graph-types';
import type { Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

const createNode = (id: string, label: string): GraphNode => {
  const definition = NodeDefinitionMap.get(label);
  if (!definition) {
    throw new Error(`Missing test node definition "${label}".`);
  }
  return {
    id,
    type: 'NodeRenderer',
    position: { x: 0, y: 0 },
    data: { definition, inputValues: {}, state: {} },
  };
};

const expectInvalidCode = (
  result: GraphConnectionValidation,
  code: Exclude<GraphConnectionValidation, { valid: true }>['code'],
) => {
  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.code).toBe(code);
    expect(result.message.length).toBeGreaterThan(0);
  }
};

describe('graph connection validation', () => {
  const math = createNode('math', 'Math');
  const normalize = createNode('normalize', 'Normalize');
  const hsl = createNode('hsl', 'HSL Color');

  it('accepts compatible typed connections', () => {
    expect(
      validateGraphConnection(
        {
          source: math.id,
          sourceHandle: 'result',
          target: normalize.id,
          targetHandle: 'value',
        },
        [math, normalize],
      ),
    ).toEqual({ valid: true });
  });

  it('returns understandable feedback for incompatible ports', () => {
    const result = validateGraphConnection(
      {
        source: hsl.id,
        sourceHandle: 'color',
        target: math.id,
        targetHandle: 'a',
      },
      [hsl, math],
    );

    expectInvalidCode(result, 'incompatible-types');
    if (!result.valid) {
      expect(result.message).toContain('Color');
      expect(result.message).toContain('Number');
    }
  });

  it('rejects self-connections and longer graph cycles', () => {
    expectInvalidCode(
      validateGraphConnection(
        {
          source: math.id,
          sourceHandle: 'result',
          target: math.id,
          targetHandle: 'a',
        },
        [math],
      ),
      'graph-cycle',
    );

    const edges: Edge[] = [
      {
        id: 'math-to-normalize',
        source: math.id,
        sourceHandle: 'result',
        target: normalize.id,
        targetHandle: 'value',
      },
    ];
    expectInvalidCode(
      validateGraphConnection(
        {
          source: normalize.id,
          sourceHandle: 'result',
          target: math.id,
          targetHandle: 'a',
        },
        [math, normalize],
        edges,
      ),
      'graph-cycle',
    );
  });
});
