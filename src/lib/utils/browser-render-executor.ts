import type {
  VizMediaProbe,
  VizRenderFrameVisualMetric,
  VizRenderOutputArtifact,
  VizRenderPerformanceFeedback,
  VizRenderRequest,
  VizRenderVisualFeedback,
} from '@viz-engine/contracts';
import type {
  VizRenderExecutionContext,
  VizRenderExecutor,
  VizRenderExecutorResult,
  VizRenderSource,
} from '@viz-engine/render';
import { vizThreeBrowserBackendIdentity } from '@viz-engine/renderer-three';
import { retainVizBrowserRenderSource } from './browser-render-source';
import { captureCanvasToBlob } from './canvas-encoding';

export const VIZ_BROWSER_WEBGL_RENDER_EXECUTOR_ID =
  vizThreeBrowserBackendIdentity.id;
export const VIZ_BROWSER_WEBGL_RENDER_EXECUTOR_VERSION =
  vizThreeBrowserBackendIdentity.version;

export interface VizBrowserFrameCaptureInput {
  request: VizRenderRequest;
  source: VizRenderSource;
  frame: number;
  sequenceIndex: number;
  firstFrame: boolean;
  signal: AbortSignal;
}

export interface CreateVizBrowserRenderExecutorOptions {
  openCaptureSession(
    context: VizRenderExecutionContext,
  ): Promise<VizBrowserFrameCaptureSession>;
  encodeVideo?: (input: {
    frames: Blob[];
    audioUrl: string | null;
    request: Extract<VizRenderRequest, { kind: 'clip' | 'video' }>;
    source: VizRenderSource;
    signal: AbortSignal;
    onProgress(progress: number): void;
  }) => Promise<{
    blob: Blob;
    probe: VizMediaProbe;
  }>;
  resolveAudioUrl?: (
    source: VizRenderSource,
    request: Extract<VizRenderRequest, { kind: 'clip' | 'video' }>,
  ) => string | null;
  createObjectUrl?: (blob: Blob) => string;
}

export interface VizBrowserFrameCaptureSession {
  captureFrame(input: VizBrowserFrameCaptureInput): Promise<HTMLCanvasElement>;
  dispose(): void;
}

type ExecutionOptions = Omit<
  CreateVizBrowserRenderExecutorOptions,
  'openCaptureSession'
> &
  VizBrowserFrameCaptureSession;

interface CapturedFrame {
  frame: number;
  canvas: HTMLCanvasElement;
  durationMilliseconds: number;
  metric: VizRenderFrameVisualMetric;
}

interface CapturedFrameFeedback {
  frame: number;
  durationMilliseconds: number;
  metric: VizRenderFrameVisualMetric;
}

const percentile95 = (values: readonly number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[
    Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  ]!;
};

const createPerformance = (
  durations: readonly number[],
): VizRenderPerformanceFeedback => {
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  return {
    evaluatedFrameCount: durations.length,
    renderedFrameCount: durations.length,
    totalRenderMilliseconds: total,
    averageRenderMilliseconds:
      durations.length === 0 ? 0 : total / durations.length,
    p95RenderMilliseconds: percentile95(durations),
    maximumRenderMilliseconds:
      durations.length === 0 ? 0 : Math.max(...durations),
  };
};

const sampleCanvasPixels = (canvas: HTMLCanvasElement): Uint8ClampedArray => {
  const sample = document.createElement('canvas');
  sample.width = 64;
  sample.height = 36;
  const context = sample.getContext('2d', {
    willReadFrequently: true,
  });
  if (!context) {
    throw new Error('Could not create visual-feedback context.');
  }
  context.drawImage(canvas, 0, 0, sample.width, sample.height);
  return context.getImageData(0, 0, sample.width, sample.height).data;
};

const createVisualMetric = (
  frame: number,
  pixels: Uint8ClampedArray,
  previousPixels: Uint8ClampedArray | undefined,
): VizRenderFrameVisualMetric => {
  let luminanceTotal = 0;
  let darkPixels = 0;
  let differenceTotal = 0;
  const pixelCount = pixels.length / 4;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0;
    const green = pixels[index + 1] ?? 0;
    const blue = pixels[index + 2] ?? 0;
    const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    luminanceTotal += luminance;
    if (luminance < 0.02) {
      darkPixels += 1;
    }
    if (previousPixels) {
      differenceTotal +=
        (Math.abs(red - (previousPixels[index] ?? 0)) +
          Math.abs(green - (previousPixels[index + 1] ?? 0)) +
          Math.abs(blue - (previousPixels[index + 2] ?? 0))) /
        (3 * 255);
    }
  }

  return {
    frame,
    averageLuminance: pixelCount === 0 ? 0 : luminanceTotal / pixelCount,
    darkPixelRatio: pixelCount === 0 ? 1 : darkPixels / pixelCount,
    ...(previousPixels === undefined
      ? {}
      : {
          contentDifferenceFromPrevious:
            pixelCount === 0 ? 0 : differenceTotal / pixelCount,
        }),
  };
};

const createVisualFeedback = (
  captured: readonly CapturedFrameFeedback[],
): VizRenderVisualFeedback => ({
  sampledFrames: captured.map((entry) => entry.metric),
  blankOrNearBlackFrames: captured
    .filter(
      ({ metric }) =>
        metric.averageLuminance < 0.01 && metric.darkPixelRatio > 0.995,
    )
    .map(({ frame }) => frame),
  frozenFramePairs: captured.flatMap((entry, index) => {
    if (
      index === 0 ||
      entry.metric.contentDifferenceFromPrevious === undefined ||
      entry.metric.contentDifferenceFromPrevious >= 0.000001
    ) {
      return [];
    }
    return [
      {
        previousFrame: captured[index - 1]!.frame,
        frame: entry.frame,
      },
    ];
  }),
});

const sha256 = async (blob: Blob): Promise<string> => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    await blob.arrayBuffer(),
  );
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
};

const mimeTypeFor = (format: VizRenderRequest['format']): string =>
  format === 'png'
    ? 'image/png'
    : format === 'webp'
      ? 'image/webp'
      : format === 'jpeg'
        ? 'image/jpeg'
        : format === 'mp4'
          ? 'video/mp4'
          : format === 'webm'
            ? 'video/webm'
            : 'image/svg+xml';

const qualityFor = (quality: VizRenderRequest['quality']): number =>
  quality === 'high' ? 0.96 : quality === 'standard' ? 0.9 : 0.78;

const createOutput = async ({
  request,
  blob,
  width,
  height,
  frameCount,
  createObjectUrl,
}: {
  request: VizRenderRequest;
  blob: Blob;
  width: number;
  height: number;
  frameCount: number;
  createObjectUrl(blob: Blob): string;
}): Promise<VizRenderOutputArtifact> => {
  const hash = await sha256(blob);
  const isImage = request.kind === 'still' || request.kind === 'contact-sheet';
  return {
    id: `render-output-${hash.slice(0, 20)}`,
    kind: 'render-output',
    role: isImage
      ? request.kind === 'still'
        ? 'still'
        : 'contact-sheet'
      : request.kind === 'clip'
        ? 'preview-clip'
        : 'final-video',
    label: request.outputLabel,
    format: request.format,
    mimeType: mimeTypeFor(request.format),
    uri: createObjectUrl(blob),
    contentIdentity: `sha256:${hash}`,
    byteLength: blob.size,
    width,
    height,
    frameCount,
    ...(!isImage
      ? {
          fps: request.fps,
          durationSeconds: frameCount / request.fps,
        }
      : {}),
  };
};

const captureFrames = async (
  frames: readonly number[],
  context: VizRenderExecutionContext,
  options: ExecutionOptions,
): Promise<CapturedFrame[]> => {
  const captured: CapturedFrame[] = [];
  let previousPixels: Uint8ClampedArray | undefined;

  for (let index = 0; index < frames.length; index += 1) {
    if (context.signal.aborted) {
      throw new Error('Render cancelled.');
    }
    const frame = frames[index]!;
    const startedAt = performance.now();
    const canvas = await options.captureFrame({
      request: context.request,
      source: context.source,
      frame,
      sequenceIndex: index,
      firstFrame: index === 0,
      signal: context.signal,
    });
    const durationMilliseconds = performance.now() - startedAt;
    const pixels = sampleCanvasPixels(canvas);
    captured.push({
      frame,
      canvas,
      durationMilliseconds,
      metric: createVisualMetric(frame, pixels, previousPixels),
    });
    previousPixels = pixels;
    context.onProgress({
      stage: 'rendering',
      completed: index + 1,
      total: frames.length,
      progress: (index + 1) / frames.length,
      message: `Captured frame ${frame}.`,
    });
    if ((index + 1) % 4 === 0 && index + 1 < frames.length) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    }
  }
  return captured;
};

const executeImageRender = async (
  context: VizRenderExecutionContext,
  options: ExecutionOptions,
): Promise<VizRenderExecutorResult> => {
  const { request } = context;
  if (request.kind !== 'still' && request.kind !== 'contact-sheet') {
    throw new Error(`Browser image executor does not support ${request.kind}.`);
  }
  if (request.format === 'svg') {
    throw new Error('Browser WebGL executor cannot encode SVG output.');
  }

  const frames = request.kind === 'still' ? [request.frame] : request.frames;
  const captured = await captureFrames(frames, context, options);
  const format = request.format;
  const quality = request.imageQuality ?? qualityFor(request.quality);
  let outputCanvas: HTMLCanvasElement;

  if (request.kind === 'still') {
    outputCanvas = captured[0]!.canvas;
  } else {
    const columns = Math.min(
      captured.length,
      request.columns ?? Math.ceil(Math.sqrt(captured.length)),
    );
    const rows = Math.ceil(captured.length / columns);
    const gap = request.gap ?? 8;
    const width = columns * request.viewport.width + (columns - 1) * gap;
    const height = rows * request.viewport.height + (rows - 1) * gap;
    if (width > 16_384 || height > 16_384) {
      throw new Error(
        `Contact sheet ${width}x${height} exceeds the 16384px browser canvas limit.`,
      );
    }
    outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const outputContext = outputCanvas.getContext('2d');
    if (!outputContext) {
      throw new Error('Could not create contact-sheet canvas.');
    }
    outputContext.fillStyle = request.viewport.backgroundColor ?? '#000000';
    outputContext.fillRect(0, 0, width, height);
    captured.forEach(({ canvas }, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      outputContext.drawImage(
        canvas,
        column * (request.viewport.width + gap),
        row * (request.viewport.height + gap),
        request.viewport.width,
        request.viewport.height,
      );
    });
  }

  const blob = await captureCanvasToBlob(outputCanvas, {
    format,
    quality,
  });
  const createObjectUrl =
    options.createObjectUrl ?? URL.createObjectURL.bind(URL);
  const output = await createOutput({
    request,
    blob,
    width: outputCanvas.width,
    height: outputCanvas.height,
    frameCount: captured.length,
    createObjectUrl,
  });

  return {
    outputs: [output],
    diagnostics: [],
    performance: createPerformance(
      captured.map((entry) => entry.durationMilliseconds),
    ),
    visualFeedback: createVisualFeedback(captured),
  };
};

const executeVideoRender = async (
  context: VizRenderExecutionContext,
  options: ExecutionOptions,
): Promise<VizRenderExecutorResult> => {
  const { request, source, signal, onProgress } = context;
  if (request.kind !== 'clip' && request.kind !== 'video') {
    throw new Error('Expected a clip or video request.');
  }
  if (!options.encodeVideo) {
    throw new Error('Browser video encoding is not available in this host.');
  }
  const frames = createVizBrowserVideoFrameSchedule(
    request.startFrame,
    request.frameCount,
    source.project.timeline.fps,
    request.fps,
  );
  const captured: CapturedFrameFeedback[] = [];
  const frameBlobs: Blob[] = [];
  let previousPixels: Uint8ClampedArray | undefined;
  for (let index = 0; index < frames.length; index += 1) {
    if (signal.aborted) {
      throw new Error('Render cancelled.');
    }
    const frame = frames[index]!;
    const startedAt = performance.now();
    const canvas = await options.captureFrame({
      request,
      source,
      frame,
      sequenceIndex: index,
      firstFrame: index === 0,
      signal,
    });
    const durationMilliseconds = performance.now() - startedAt;
    const pixels = sampleCanvasPixels(canvas);
    captured.push({
      frame,
      durationMilliseconds,
      metric: createVisualMetric(frame, pixels, previousPixels),
    });
    previousPixels = pixels;
    frameBlobs.push(
      await captureCanvasToBlob(canvas, {
        format: 'jpeg',
        quality: qualityFor(request.quality),
      }),
    );
    canvas.width = 0;
    canvas.height = 0;
    onProgress({
      stage: 'rendering',
      completed: index + 1,
      total: frames.length,
      progress: (index + 1) / frames.length,
      message: `Captured and prepared frame ${frame}.`,
    });
    if ((index + 1) % 4 === 0 && index + 1 < frames.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  const audioUrl = request.includeAudio
    ? (options.resolveAudioUrl?.(source, request) ?? null)
    : null;
  if (request.includeAudio && audioUrl === null) {
    throw new Error(
      'Video requested audio, but no canonical resolved audio asset is available.',
    );
  }
  const encodeStartedAt = performance.now();
  const encoded = await options.encodeVideo({
    frames: frameBlobs,
    audioUrl,
    request,
    source,
    signal,
    onProgress: (progress) => {
      onProgress({
        stage: 'encoding',
        completed: Math.round(progress * request.frameCount),
        total: request.frameCount,
        progress,
        message: `Encoding video ${Math.round(progress * 100)}%.`,
      });
    },
  });
  const encodeMilliseconds = performance.now() - encodeStartedAt;
  if (signal.aborted) {
    throw new Error('Render cancelled.');
  }
  const createObjectUrl =
    options.createObjectUrl ?? URL.createObjectURL.bind(URL);
  const output = await createOutput({
    request,
    blob: encoded.blob,
    width: request.viewport.width,
    height: request.viewport.height,
    frameCount: request.frameCount,
    createObjectUrl,
  });
  return {
    outputs: [output],
    diagnostics: [],
    performance: {
      ...createPerformance(captured.map((entry) => entry.durationMilliseconds)),
      encodeMilliseconds,
    },
    mediaProbe: encoded.probe,
    visualFeedback: createVisualFeedback(captured),
  };
};

export const createVizBrowserVideoFrameSchedule = (
  startFrame: number,
  outputFrameCount: number,
  sourceFps: number,
  outputFps: number,
): number[] =>
  Array.from(
    { length: outputFrameCount },
    (_, index) => startFrame + Math.round((index * sourceFps) / outputFps),
  );

export const createVizBrowserRenderExecutor = (
  options: CreateVizBrowserRenderExecutorOptions,
): VizRenderExecutor => ({
  id: VIZ_BROWSER_WEBGL_RENDER_EXECUTOR_ID,
  version: VIZ_BROWSER_WEBGL_RENDER_EXECUTOR_VERSION,
  rendererIdentity: 'viz-renderer-three.render-host.v1',
  supports: (request) =>
    ((request.kind === 'still' || request.kind === 'contact-sheet') &&
      request.format !== 'svg') ||
    ((request.kind === 'clip' || request.kind === 'video') &&
      options.encodeVideo !== undefined),
  execute: async (context) => {
    const retained = await retainVizBrowserRenderSource(
      context.source,
      context.signal,
    );
    let session: VizBrowserFrameCaptureSession | undefined;
    try {
      const executionContext = { ...context, source: retained.source };
      session = await options.openCaptureSession(executionContext);
      context.signal.throwIfAborted();
      const executionOptions = { ...options, ...session };
      return await (context.request.kind === 'still' ||
      context.request.kind === 'contact-sheet'
        ? executeImageRender(executionContext, executionOptions)
        : executeVideoRender(executionContext, executionOptions));
    } finally {
      session?.dispose();
      retained.dispose();
    }
  },
});
