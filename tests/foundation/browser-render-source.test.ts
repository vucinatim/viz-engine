import { retainVizBrowserRenderSource } from '@/lib/utils/browser-render-source';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestProject } from './viz-session-test-utils';

const source = () => ({
  project: createTestProject(),
  resolvedArtifacts: [],
  contentIdentity: 'frozen-input',
  resolvedAssets: [
    {
      id: 'audio',
      kind: 'audio' as const,
      source: 'local' as const,
      uri: 'blob:editor-audio',
    },
    {
      id: 'image',
      kind: 'image' as const,
      source: 'local' as const,
      uri: 'blob:editor-image',
    },
  ],
});
afterEach(() => vi.unstubAllGlobals());
describe('browser render asset ownership', () => {
  it('retains separate asset URLs through export and releases them exactly once', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['asset']))),
    );
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:render-audio')
      .mockReturnValueOnce('blob:render-image');
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    try {
      const original = source();
      const retained = await retainVizBrowserRenderSource(
        original,
        new AbortController().signal,
      );
      expect(retained.source.resolvedAssets.map((asset) => asset.uri)).toEqual([
        'blob:render-audio',
        'blob:render-image',
      ]);
      expect(original.resolvedAssets[0]!.uri).toBe('blob:editor-audio');
      expect(retained.source.contentIdentity).toBe(original.contentIdentity);
      expect(revoke).not.toHaveBeenCalled();
      retained.dispose();
      retained.dispose();
      expect(revoke.mock.calls).toEqual([
        ['blob:render-audio'],
        ['blob:render-image'],
      ]);
    } finally {
      create.mockRestore();
      revoke.mockRestore();
    }
  });
  it('settles concurrent loads and releases successful assets if another load fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (uri: string) => {
        if (uri.endsWith('image')) throw new Error('lost source');
        await Promise.resolve();
        return new Response(new Blob(['audio']));
      }),
    );
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:retained');
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    try {
      await expect(
        retainVizBrowserRenderSource(source(), new AbortController().signal),
      ).rejects.toThrow('lost source');
      expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:retained');
    } finally {
      create.mockRestore();
      revoke.mockRestore();
    }
  });
});
