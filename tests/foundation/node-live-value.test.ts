import { formatNodeLiveValue } from '@/components/node-network/live-value';
import { describe, expect, it } from 'vitest';

describe('node live-value presentation', () => {
  it('formats numeric inputs without assuming runtime values match presentation metadata', () => {
    expect(formatNodeLiveValue(0.456, 'number')).toBe('0.46');
    expect(formatNodeLiveValue('#00ff66', 'number')).toBe('#00ff66');
    expect(formatNodeLiveValue(Number.NaN, 'number')).toBe('NaN');
  });

  it('keeps structured signal values compact', () => {
    expect(formatNodeLiveValue(new Uint8Array([1, 2]), 'Uint8Array')).toBe(
      '[Data]',
    );
    expect(formatNodeLiveValue({}, 'FrequencyAnalysis')).toBe('[Freq]');
  });
});
