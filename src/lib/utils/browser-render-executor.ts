import type {
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
import {
  createVizBrowserRenderAudio,
  type VizBrowserRenderAudio,
} from './browser-render-audio';
import { hashVizRenderBlob } from './browser-render-output';
import { retainVizBrowserRenderSource } from './browser-render-source';
import { captureCanvasToBlob } from './canvas-encoding';
import type { VizStreamingVideoEncoder } from './video-encoder';

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

export interface VizBrowserRenderContext extends VizRenderExecutionContext {
  audio: VizBrowserRenderAudio;
}

export interface CreateVizBrowserRenderExecutorOptions {
  openCaptureSession(
    context: VizBrowserRenderContext,
  ): Promise<VizBrowserFrameCaptureSession>;
  openVideoEncoder?: (
    context: VizBrowserRenderContext,
  ) => Promise<VizStreamingVideoEncoder>;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
}

export interface VizBrowserFrameCaptureSession {
  /** Borrowed canvas: valid until next capture or disposal; caller must not resize it. */
  captureFrame(input: VizBrowserFrameCaptureInput): Promise<HTMLCanvasElement>;
  dispose(): void;
}

type ExecutionOptions = CreateVizBrowserRenderExecutorOptions &
  VizBrowserFrameCaptureSession;

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
    maximumRenderMilliseconds: durations.reduce(
      (maximum, duration) => Math.max(maximum, duration),
      0,
    ),
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
  signal,
}: {
  request: VizRenderRequest;
  blob: Blob;
  width: number;
  height: number;
  frameCount: number;
  createObjectUrl(blob: Blob): string;
  signal: AbortSignal;
}): Promise<VizRenderOutputArtifact> => {
  const hash = await hashVizRenderBlob(blob, signal);
  signal.throwIfAborted();
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

const captureFrame = async (
  context: VizRenderExecutionContext,
  options: ExecutionOptions,
  frame: number,
  sequenceIndex: number,
  previousPixels: Uint8ClampedArray | undefined,
) => {
  context.signal.throwIfAborted();
  const started = performance.now();
  const canvas = await options.captureFrame({
    request: context.request,
    source: context.source,
    frame,
    sequenceIndex,
    firstFrame: sequenceIndex === 0,
    signal: context.signal,
  });
  context.signal.throwIfAborted();
  const durationMilliseconds = performance.now() - started;
  const analysisStarted = performance.now();
  const pixels = sampleCanvasPixels(canvas);
  const feedback = {
    frame,
    durationMilliseconds,
    metric: createVisualMetric(frame, pixels, previousPixels),
  };
  return {
    canvas,
    pixels,
    feedback,
    analysisMilliseconds: performance.now() - analysisStarted,
  };
};

const executeImageRender = async (
  context: VizRenderExecutionContext,
  options: ExecutionOptions,
): Promise<VizRenderExecutorResult> => {
  const { request, signal } = context;
  if (request.kind !== 'still' && request.kind !== 'contact-sheet')
    throw new Error('Expected an image request.');
  if (request.format === 'svg')
    throw new Error('Browser WebGL executor cannot encode SVG output.');
  const frames = request.kind === 'still' ? [request.frame] : request.frames;
  const columns =
    request.kind === 'still'
      ? 1
      : Math.min(
          frames.length,
          request.columns ?? Math.ceil(Math.sqrt(frames.length)),
        );
  const gap = request.kind === 'still' ? 0 : (request.gap ?? 8);
  const width = columns * request.viewport.width + (columns - 1) * gap;
  const rows = Math.ceil(frames.length / columns);
  const height = rows * request.viewport.height + (rows - 1) * gap;
  if (width > 16_384 || height > 16_384)
    throw new Error(
      `Contact sheet ${width}x${height} exceeds the 16384px browser canvas limit.`,
    );
  // Composite each borrowed frame before the next render overwrites it.
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) throw new Error('Could not create image output canvas.');
  const captured: CapturedFrameFeedback[] = [];
  let previousPixels: Uint8ClampedArray | undefined;
  let analysisMilliseconds = 0;
  try {
    if (request.kind === 'contact-sheet') {
      outputContext.fillStyle = request.viewport.backgroundColor ?? '#000000';
      outputContext.fillRect(0, 0, width, height);
    }
    for (let index = 0; index < frames.length; index++) {
      const result = await captureFrame(
        context,
        options,
        frames[index]!,
        index,
        previousPixels,
      );
      captured.push(result.feedback);
      previousPixels = result.pixels;
      analysisMilliseconds += result.analysisMilliseconds;
      outputContext.drawImage(
        result.canvas,
        (index % columns) * (request.viewport.width + gap),
        Math.floor(index / columns) * (request.viewport.height + gap),
        request.viewport.width,
        request.viewport.height,
      );
      context.onProgress({
        stage: 'rendering',
        completed: index + 1,
        total: frames.length,
        progress: (0.9 * (index + 1)) / frames.length,
        message: `Rendered frame ${frames[index]}.`,
      });
    }
    signal.throwIfAborted();
    const blob = await captureCanvasToBlob(outputCanvas, {
      format: request.format,
      quality: request.imageQuality ?? qualityFor(request.quality),
    });
    const output = await createOutput({
      request,
      blob,
      width,
      height,
      frameCount: frames.length,
      signal,
      createObjectUrl: options.createObjectUrl ?? URL.createObjectURL.bind(URL),
    });
    return {
      outputs: [output],
      diagnostics: [],
      performance: {
        ...createPerformance(
          captured.map((entry) => entry.durationMilliseconds),
        ),
        analysisMilliseconds,
        retainedOutputBytes: blob.size,
      },
      visualFeedback: createVisualFeedback(captured),
    };
  } finally {
    outputCanvas.width = 0;
    outputCanvas.height = 0;
  }
};

export const vizBrowserVideoSourceFrame = (
  startFrame: number,
  index: number,
  sourceFps: number,
  outputFps: number,
): number => startFrame + Math.round((index * sourceFps) / outputFps);

const executeVideoRender = async (
  context: VizRenderExecutionContext,
  options: ExecutionOptions,
  encoder: VizStreamingVideoEncoder,
): Promise<VizRenderExecutorResult> => {
  const { request, source, signal, onProgress } = context;
  if (request.kind !== 'clip' && request.kind !== 'video')
    throw new Error('Expected a video request.');
  const captured: CapturedFrameFeedback[] = [];
  let previousPixels: Uint8ClampedArray | undefined;
  let analysisMilliseconds = 0;
  let encodeMilliseconds = 0;
  for (let index = 0; index < request.frameCount; index++) {
    const frame = vizBrowserVideoSourceFrame(
      request.startFrame,
      index,
      source.project.timeline.fps,
      request.fps,
    );
    const result = await captureFrame(
      context,
      options,
      frame,
      index,
      previousPixels,
    );
    captured.push(result.feedback);
    previousPixels = result.pixels;
    analysisMilliseconds += result.analysisMilliseconds;
    const encodeStarted = performance.now();
    await encoder.addFrame(result.canvas, index);
    encodeMilliseconds += performance.now() - encodeStarted;
    signal.throwIfAborted();
    onProgress({
      stage: 'encoding',
      completed: index + 1,
      total: request.frameCount,
      progress: (0.9 * (index + 1)) / request.frameCount,
      message: `Rendered and submitted frame ${index + 1} of ${request.frameCount}.`,
    });
  }
  onProgress({
    stage: 'encoding',
    completed: request.frameCount,
    total: request.frameCount,
    progress: 0.9,
    message: 'Finalizing media and validating output…',
  });
  const finalizationStarted = performance.now();
  const encoded = await encoder.finalize();
  signal.throwIfAborted();
  const output = await createOutput({
    request,
    blob: encoded.blob,
    width: request.viewport.width,
    height: request.viewport.height,
    frameCount: request.frameCount,
    signal,
    createObjectUrl: options.createObjectUrl ?? URL.createObjectURL.bind(URL),
  });
  const outputFinalizationMilliseconds =
    performance.now() - finalizationStarted;
  return {
    outputs: [output],
    diagnostics: encoded.diagnostics,
    performance: {
      ...createPerformance(captured.map((entry) => entry.durationMilliseconds)),
      analysisMilliseconds,
      encodeMilliseconds,
      outputFinalizationMilliseconds,
      retainedOutputBytes: encoded.blob.size,
    },
    mediaProbe: encoded.probe,
    visualFeedback: createVisualFeedback(captured),
  };
};

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
      options.openVideoEncoder !== undefined),
  execute: async (context) => {
    const started = performance.now();
    const retained = await retainVizBrowserRenderSource(
      context.source,
      context.signal,
    );
    const audio = createVizBrowserRenderAudio({
      ...context,
      source: retained.source,
    });
    let session: VizBrowserFrameCaptureSession | undefined;
    let encoder: VizStreamingVideoEncoder | undefined;
    let result: VizRenderExecutorResult | undefined;
    let failure: unknown;
    const outputUrls: string[] = [];
    try {
      const executionContext = { ...context, source: retained.source, audio };
      const video =
        context.request.kind === 'clip' || context.request.kind === 'video';
      if (video) {
        if (!options.openVideoEncoder)
          throw new Error(
            'Browser video encoding is not available in this host.',
          );
        encoder = await options.openVideoEncoder(executionContext);
      }
      context.signal.throwIfAborted();
      session = await options.openCaptureSession(executionContext);
      context.signal.throwIfAborted();
      const setupMilliseconds = performance.now() - started;
      const executionOptions = {
        ...options,
        ...session,
        createObjectUrl: (blob: Blob) => {
          const url = (
            options.createObjectUrl ?? URL.createObjectURL.bind(URL)
          )(blob);
          outputUrls.push(url);
          return url;
        },
      };
      result = await (encoder
        ? executeVideoRender(executionContext, executionOptions, encoder)
        : executeImageRender(executionContext, executionOptions));
      result.performance.setupMilliseconds = setupMilliseconds;
      result.performance.decodedAudioBytes = audio.decodedBytes();
    } catch (error) {
      failure = error;
    }
    const cleanup = await Promise.allSettled([
      Promise.resolve().then(() => encoder?.dispose()),
      Promise.resolve().then(() => session?.dispose()),
      Promise.resolve().then(() => audio.dispose()),
      Promise.resolve().then(() => retained.dispose()),
    ]);
    const cleanupFailure = cleanup.find((entry) => entry.status === 'rejected');
    failure ??= context.signal.aborted
      ? context.signal.reason
      : cleanupFailure?.status === 'rejected'
        ? cleanupFailure.reason
        : undefined;
    if (failure !== undefined || !result) {
      for (const uri of outputUrls)
        (options.revokeObjectUrl ?? URL.revokeObjectURL.bind(URL))(uri);
      throw failure ?? new Error('Render execution did not produce a result.');
    }
    let outputsReleased = false;
    result.releaseOutputs = () => {
      if (outputsReleased) return;
      outputsReleased = true;
      for (const uri of outputUrls)
        (options.revokeObjectUrl ?? URL.revokeObjectURL.bind(URL))(uri);
    };
    return result;
  },
});
