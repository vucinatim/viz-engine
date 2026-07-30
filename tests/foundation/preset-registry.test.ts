import type { NodeHandleType } from '@/components/config/node-types';
import {
  getPresetsForType,
  instantiateCanonicalPreset,
} from '@/components/node-network/presets';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const handleTypes: NodeHandleType[] = [
  'number',
  'string',
  'boolean',
  'color',
  'file',
  'vector3',
  'Uint8Array',
  'FrequencyAnalysis',
  'object',
  'math-op',
];

describe('canonical preset registry', () => {
  it('instantiates every unique built-in preset', () => {
    const presets = handleTypes.flatMap(getPresetsForType);

    expect(presets).toHaveLength(26);
    expect(new Set(presets.map((preset) => preset.id)).size).toBe(26);
    expect(
      createHash('sha256').update(JSON.stringify(presets)).digest('hex'),
    ).toBe('3beb8d3838d9c6b11e96ce390dcbfd3ba073e1800c228a9a10486d3a73686866');

    for (const preset of presets) {
      const graph = instantiateCanonicalPreset(
        preset,
        `test-${preset.id}`,
        preset.outputType,
      );
      expect(graph.nodes).toHaveLength(preset.nodes.length + 1);
      expect(
        graph.nodes
          .flatMap((node) => Object.values(node.inputs ?? {}))
          .filter((input) => input.kind === 'node-output'),
      ).toHaveLength(preset.edges.length - 1);
      expect(graph.outputs).toHaveLength(1);
    }
  });
});
