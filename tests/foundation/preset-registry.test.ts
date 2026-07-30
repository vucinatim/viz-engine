import type { NodeHandleType } from '@/components/config/node-types';
import {
  getPresetsForType,
  instantiateCanonicalPreset,
} from '@/components/node-network/presets';
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
