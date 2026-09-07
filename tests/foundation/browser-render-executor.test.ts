import { createVizBrowserVideoFrameSchedule } from '@/lib/utils/browser-render-executor';
import { describe, expect, it, vi } from 'vitest';

describe('browser render frame scheduling', () => {
  it.each([
    {
      sourceFps: 60,
      outputFps: 30,
      expected: [120, 122, 124, 126],
    },
    {
      sourceFps: 60,
      outputFps: 60,
      expected: [120, 121, 122, 123],
    },
    {
      sourceFps: 60,
      outputFps: 120,
      expected: [120, 121, 121, 122],
    },
  ])(
    'samples a $sourceFps FPS timeline at $outputFps FPS',
    ({ sourceFps, outputFps, expected }) => {
      expect(
        createVizBrowserVideoFrameSchedule(
          120,
          expected.length,
          sourceFps,
          outputFps,
        ),
      ).toEqual(expected);
    },
  );
});

describe('browser render execution lifetime', () => {
  it('disposes the capture session when a frame fails', async () => {
    const { createVizBrowserRenderExecutor } =
      await import('@/lib/utils/browser-render-executor');
    const { createTestProject } = await import('./viz-session-test-utils');
    const dispose = vi.fn();
    const executor = createVizBrowserRenderExecutor({
      openCaptureSession: async () => ({
        captureFrame: async () => {
          throw new Error('resource failure');
        },
        dispose,
      }),
    });
    const project = createTestProject();
    await expect(
      executor.execute({
        request: {
          schemaVersion: 1,
          kind: 'still',
          source: { projectId: project.projectId },
          executorId: executor.id,
          intent: 'preview',
          outputLabel: 'lifecycle',
          quality: 'draft',
          frame: 0,
          format: 'png',
          viewport: { width: 320, height: 180 },
        },
        source: {
          project,
          resolvedAssets: [],
          resolvedArtifacts: [],
          contentIdentity: 'test',
        },
        signal: new AbortController().signal,
        onProgress() {},
      }),
    ).rejects.toThrow('resource failure');
    expect(dispose).toHaveBeenCalledOnce();
  });
});
