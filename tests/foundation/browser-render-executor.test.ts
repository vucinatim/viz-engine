import { vizBrowserVideoSourceFrame } from '@/lib/utils/browser-render-executor';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestProject } from './viz-session-test-utils';

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
        expected.map((_, index) =>
          vizBrowserVideoSourceFrame(120, index, sourceFps, outputFps),
        ),
      ).toEqual(expected);
    },
  );
});

const drawingContext = () => ({
  fillRect() {},
  drawImage() {},
  getImageData: () => ({ data: new Uint8ClampedArray(64 * 36 * 4) }),
});
beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => ({ width: 0, height: 0, getContext: drawingContext }),
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('browser render execution lifetime', () => {
  it('disposes the capture session when a frame fails', async () => {
    const { createVizBrowserRenderExecutor } =
      await import('@/lib/utils/browser-render-executor');
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

describe('incremental frame handoff', () => {
  it('cannot advance a borrowed frame while the encoder is blocked, then submits every frame in order', async () => {
    const { createVizBrowserRenderExecutor } =
      await import('@/lib/utils/browser-render-executor');
    const project = createTestProject();
    const canvas = { width: 320, height: 180 } as HTMLCanvasElement;
    let unblock!: () => void;
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const captures: number[] = [];
    const submitted: number[] = [];
    const dispose = vi.fn();
    const close = vi.fn(async () => {});
    const executor = createVizBrowserRenderExecutor({
      openCaptureSession: async () => ({
        captureFrame: async ({ frame }) => {
          captures.push(frame);
          return canvas;
        },
        dispose,
      }),
      openVideoEncoder: async () => ({
        addFrame: async (frame, index) => {
          expect(frame).toBe(canvas);
          submitted.push(index);
          if (index === 0) await blocked;
        },
        finalize: async () => ({
          blob: new Blob(['encoded']),
          diagnostics: [],
          probe: { container: 'webm', byteLength: 7, streams: [] },
        }),
        dispose: close,
      }),
      createObjectUrl: () => 'blob:result',
    });
    const execution = executor.execute({
      request: {
        schemaVersion: 1,
        kind: 'clip',
        source: { projectId: project.projectId },
        executorId: executor.id,
        intent: 'preview',
        outputLabel: 'pressure',
        quality: 'draft',
        format: 'webm',
        startFrame: 120,
        frameCount: 3,
        fps: 30,
        includeAudio: false,
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
    });
    await vi.waitFor(() => expect(submitted).toEqual([0]));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(captures).toHaveLength(1);
    unblock();
    const result = await execution;
    expect(submitted).toEqual([0, 1, 2]);
    expect(captures).toEqual([120, 122, 124]);
    expect([canvas.width, canvas.height]).toEqual([320, 180]);
    expect(dispose).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(result.performance.retainedOutputBytes).toBe(7);
    expect(result.performance.encodeMilliseconds).toBeGreaterThanOrEqual(20);
  });

  it('rejects a rate-specific capability failure before opening capture', async () => {
    const { createVizBrowserRenderExecutor } =
      await import('@/lib/utils/browser-render-executor');
    const project = createTestProject();
    const { openVizStreamingVideoEncoder } =
      await import('@/lib/utils/video-encoder');
    const isConfigSupported = vi.fn(async (config: VideoEncoderConfig) => ({
      supported: config.framerate === undefined,
      config,
    }));
    vi.stubGlobal('VideoEncoder', { isConfigSupported });
    const openCaptureSession = vi.fn();
    const executor = createVizBrowserRenderExecutor({
      openCaptureSession,
      openVideoEncoder: ({ request, source, signal, audio }) =>
        openVizStreamingVideoEncoder({
          request: request as Extract<
            typeof request,
            { kind: 'video' | 'clip' }
          >,
          sourceFps: source.project.timeline.fps,
          signal,
          audio,
        }),
    });
    await expect(
      executor.execute({
        request: {
          schemaVersion: 1,
          kind: 'video',
          source: { projectId: project.projectId },
          executorId: executor.id,
          intent: 'final',
          outputLabel: 'unsupported',
          quality: 'high',
          format: 'mp4',
          startFrame: 0,
          frameCount: 3,
          fps: 60,
          includeAudio: false,
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
    ).rejects.toThrow('at 60 fps');
    expect(isConfigSupported).toHaveBeenCalled();
    expect(
      isConfigSupported.mock.calls.every(([config]) => config.framerate === 60),
    ).toBe(true);
    expect(openCaptureSession).not.toHaveBeenCalled();
  });
});

describe('unpublished output cleanup', () => {
  it('revokes output and attempts every owner cleanup even when encoder and capture disposal fail', async () => {
    const { createVizBrowserRenderExecutor } =
      await import('@/lib/utils/browser-render-executor');
    const project = createTestProject();
    const revoked = vi.fn();
    const captureDispose = vi.fn(() => {
      throw new Error('capture close failed');
    });
    const executor = createVizBrowserRenderExecutor({
      createObjectUrl: () => 'blob:unpublished',
      revokeObjectUrl: revoked,
      openCaptureSession: async () => ({
        captureFrame: async () =>
          ({ width: 320, height: 180 }) as HTMLCanvasElement,
        dispose: captureDispose,
      }),
      openVideoEncoder: async () => ({
        addFrame: async () => {},
        finalize: async () => ({
          blob: new Blob(['media']),
          probe: { container: 'webm', streams: [], byteLength: 5 },
          diagnostics: [],
        }),
        dispose: async () => {
          throw new Error('encoder close failed');
        },
      }),
    });
    await expect(
      executor.execute({
        request: {
          schemaVersion: 1,
          kind: 'clip',
          source: { projectId: project.projectId },
          executorId: executor.id,
          intent: 'preview',
          outputLabel: 'cleanup',
          quality: 'draft',
          format: 'webm',
          startFrame: 0,
          frameCount: 1,
          fps: 30,
          includeAudio: false,
          viewport: { width: 320, height: 180 },
        },
        source: {
          project,
          resolvedAssets: [],
          resolvedArtifacts: [],
          contentIdentity: 'cleanup',
        },
        signal: new AbortController().signal,
        onProgress() {},
      }),
    ).rejects.toThrow('encoder close failed');
    expect(captureDispose).toHaveBeenCalledOnce();
    expect(revoked).toHaveBeenCalledExactlyOnceWith('blob:unpublished');
  });
});
