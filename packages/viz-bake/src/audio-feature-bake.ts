import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import {
  encodeVizUint8Base64,
  type VizAudioFeatureProfile,
  type VizAudioFeatureSeries,
  type VizAudioFeatureTimelineArtifact,
  type VizProjectDocument,
  type VizResolvedArtifact,
} from '@viz-engine/contracts';
import {
  StandardAudioFrameAnalysisCancelledError,
  analyzeStandardAudioFrames,
  analyzeStandardAudioFramesAsync,
  type AudioSignal,
  type StandardAudioFrameAnalysisOptions,
  type StandardAudioFrameAnalysisResult,
} from '@viz-engine/rhythm-core';
import {
  VizAudioPcmError,
  createVizAudioPcmIdentity,
  createVizAudioPcmIdentityAsync,
  validateVizAudioPcmShape,
  validateVizAudioSampleWindow,
  type VizAudioPcmSource,
} from './audio-pcm.js';

export const VIZ_AUDIO_FEATURE_BAKE_VERSION =
  'viz-bake.audio-feature-timeline.v2' as const;

export interface VizBakeRequest {
  kind: 'audio-feature-timeline';
  sourceAssetId: string;
  profile: VizAudioFeatureProfile;
  fps: number;
}

export interface VizBakePlan {
  projectId: string;
  requests: VizBakeRequest[];
}

export interface VizAudioFeatureBakeRequest extends VizBakeRequest {
  sourceContentIdentity: string;
  decoderIdentity?: string;
  artifactId?: string;
  artifactLabel?: string;
  artifactUri?: string;
  fftSize?: number;
  minDecibels?: number;
  maxDecibels?: number;
  sourceWindow?: {
    startSeconds?: number;
    durationSeconds?: number;
  };
}

export interface VizBakeExecutionIssue {
  code:
    | 'invalid-request'
    | 'unsupported-profile'
    | 'invalid-pcm'
    | 'cancelled'
    | 'execution-failed';
  message: string;
}

export interface VizAudioFeatureBakeProgress {
  completedFrames: number;
  totalFrames: number;
  progress: number;
}

export type VizAudioFeatureBakeResult =
  | {
      ok: true;
      status: 'succeeded';
      executionIdentity: string;
      artifact: VizAudioFeatureTimelineArtifact;
      resolvedArtifact: VizResolvedArtifact;
      issues: [];
      metrics: {
        frameCount: number;
        featureCount: number;
        packedByteLength: number;
      };
    }
  | {
      ok: false;
      status: 'cancelled' | 'failed';
      executionIdentity?: string;
      issues: VizBakeExecutionIssue[];
    };

export interface ExecuteVizAudioFeatureBakeOptions {
  shouldCancel?: () => boolean;
  onProgress?: (progress: VizAudioFeatureBakeProgress) => void;
}

export interface ExecuteVizAudioFeatureBakeAsyncOptions extends ExecuteVizAudioFeatureBakeOptions {
  yieldEveryFrames?: number;
  yieldToHost?: () => Promise<void>;
}

const isPositiveFinite = (value: number): boolean =>
  Number.isFinite(value) && value > 0;

const validateExecutionInput = (
  request: VizAudioFeatureBakeRequest,
  pcm: VizAudioPcmSource,
): VizBakeExecutionIssue[] => {
  const issues: VizBakeExecutionIssue[] = [];

  if (
    request.kind !== 'audio-feature-timeline' ||
    typeof request.sourceAssetId !== 'string' ||
    request.sourceAssetId.trim().length === 0 ||
    typeof request.sourceContentIdentity !== 'string' ||
    request.sourceContentIdentity.trim().length === 0 ||
    !isPositiveFinite(request.fps)
  ) {
    issues.push({
      code: 'invalid-request',
      message:
        'Audio bake request requires kind, source asset/content identity, and positive FPS.',
    });
  }
  if (request.profile !== 'standard') {
    issues.push({
      code: 'unsupported-profile',
      message: `Audio feature profile "${request.profile}" is not implemented by the standard audio bake pipeline.`,
    });
  }
  try {
    validateVizAudioPcmShape(pcm);
  } catch (error) {
    issues.push({
      code: 'invalid-pcm',
      message: error instanceof Error ? error.message : 'Invalid PCM.',
    });
  }
  const fftSize = request.fftSize ?? 2048;
  if (
    !Number.isInteger(fftSize) ||
    fftSize < 32 ||
    (fftSize & (fftSize - 1)) !== 0
  ) {
    issues.push({
      code: 'invalid-request',
      message:
        'Audio bake fftSize must be a power-of-two integer of at least 32.',
    });
  }
  const minDecibels = request.minDecibels ?? -90;
  const maxDecibels = request.maxDecibels ?? -10;
  if (
    !Number.isFinite(minDecibels) ||
    !Number.isFinite(maxDecibels) ||
    minDecibels >= maxDecibels
  ) {
    issues.push({
      code: 'invalid-request',
      message:
        'Audio bake minDecibels must be finite and lower than maxDecibels.',
    });
  }
  for (const [label, value] of [
    ['decoderIdentity', request.decoderIdentity],
    ['artifactId', request.artifactId],
    ['artifactLabel', request.artifactLabel],
    ['artifactUri', request.artifactUri],
  ] as const) {
    if (value !== undefined && value.trim().length === 0) {
      issues.push({
        code: 'invalid-request',
        message: `Audio bake ${label} must be non-empty when provided.`,
      });
    }
  }
  if (
    request.sourceWindow?.startSeconds !== undefined &&
    (!Number.isFinite(request.sourceWindow.startSeconds) ||
      request.sourceWindow.startSeconds < 0)
  ) {
    issues.push({
      code: 'invalid-request',
      message:
        'Audio bake source-window startSeconds must be finite and non-negative.',
    });
  }
  if (
    request.sourceWindow?.durationSeconds !== undefined &&
    (!Number.isFinite(request.sourceWindow.durationSeconds) ||
      request.sourceWindow.durationSeconds < 0)
  ) {
    issues.push({
      code: 'invalid-request',
      message:
        'Audio bake source-window durationSeconds must be finite and non-negative.',
    });
  }

  if (issues.length === 0) {
    try {
      resolveBakeSampleWindow(request, pcm);
    } catch (error) {
      issues.push({
        code: 'invalid-request',
        message:
          error instanceof Error
            ? error.message
            : 'Invalid source sample window.',
      });
    }
  }
  return issues;
};

const resolveBakeSampleWindow = (
  request: VizAudioFeatureBakeRequest,
  pcm: VizAudioPcmSource,
) => {
  const startSample = Math.floor(
    (request.sourceWindow?.startSeconds ?? 0) * pcm.sampleRate,
  );
  const endSampleExclusive =
    request.sourceWindow?.durationSeconds === undefined
      ? pcm.channels[0]!.length
      : startSample +
        Math.floor(request.sourceWindow.durationSeconds * pcm.sampleRate);
  const window = { startSample, endSampleExclusive };
  validateVizAudioSampleWindow(pcm, window);
  return window;
};

const createExecutionDescriptor = (
  request: VizAudioFeatureBakeRequest,
  pcm: VizAudioPcmSource,
  pcmIdentity: ReturnType<typeof createVizAudioPcmIdentity>,
) => ({
  bakeVersion: VIZ_AUDIO_FEATURE_BAKE_VERSION,
  decodedPcm: pcmIdentity,
  decoderIdentity: request.decoderIdentity ?? 'caller-provided-pcm',
  sourceAssetId: request.sourceAssetId,
  sourceContentIdentity: request.sourceContentIdentity,
  profile: request.profile,
  fps: request.fps,
  sampleRate: pcm.sampleRate,
  channelCount: pcm.channels.length,
  sampleCount: pcm.channels[0]?.length ?? 0,
  fftSize: request.fftSize ?? 2048,
  spectrumBinCount: (request.fftSize ?? 2048) / 2,
  waveformSampleCount: request.fftSize ?? 2048,
  minDecibels: request.minDecibels ?? -90,
  maxDecibels: request.maxDecibels ?? -10,
  sourceWindow: resolveBakeSampleWindow(request, pcm),
});

const getMinMax = (values: Float32Array): { min: number; max: number } => {
  if (values.length === 0) {
    return { min: 0, max: 0 };
  }
  let min = values[0]!;
  let max = values[0]!;
  for (let index = 1; index < values.length; index += 1) {
    min = Math.min(min, values[index]!);
    max = Math.max(max, values[index]!);
  }
  return { min, max };
};

const toArtifactSeries = (
  series: ReturnType<
    typeof analyzeStandardAudioFrames
  >['featureSeries'][number],
): VizAudioFeatureSeries => {
  const range = getMinMax(series.values);
  return {
    name: series.name,
    unit: series.unit,
    normalization: series.normalization,
    values: Array.from(series.values),
    min: range.min,
    max: range.max,
  };
};

const toAudioSignal = (pcm: VizAudioPcmSource): AudioSignal => {
  if (pcm.channels.length === 1) {
    return pcm.channels[0]!;
  }
  return [pcm.channels[0]!, pcm.channels[1]!];
};

const createAnalysisOptions = (
  request: VizAudioFeatureBakeRequest,
  pcm: VizAudioPcmSource,
  options: ExecuteVizAudioFeatureBakeOptions = {},
): StandardAudioFrameAnalysisOptions => {
  const { startSample, endSampleExclusive } = resolveBakeSampleWindow(
    request,
    pcm,
  );
  const sampleCount = endSampleExclusive - startSample;
  return {
    sampleRate: pcm.sampleRate,
    fps: request.fps,
    startSample,
    sampleCount,
    ...(request.fftSize === undefined ? {} : { fftSize: request.fftSize }),
    ...(request.minDecibels === undefined
      ? {}
      : { minDecibels: request.minDecibels }),
    ...(request.maxDecibels === undefined
      ? {}
      : { maxDecibels: request.maxDecibels }),
    ...(options.shouldCancel === undefined
      ? {}
      : { shouldCancel: options.shouldCancel }),
    onProgress: (completedFrames, totalFrames) => {
      options.onProgress?.({
        completedFrames,
        totalFrames,
        progress: totalFrames === 0 ? 1 : completedFrames / totalFrames,
      });
    },
  };
};

const createExecutionIdentity = (
  descriptor: ReturnType<typeof createExecutionDescriptor>,
): string =>
  `${VIZ_AUDIO_FEATURE_BAKE_VERSION}:sha256:${bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(descriptor))))}`;

const createSuccessfulResult = (
  request: VizAudioFeatureBakeRequest,
  executionIdentity: string,
  analysis: StandardAudioFrameAnalysisResult,
  descriptor: ReturnType<typeof createExecutionDescriptor>,
): VizAudioFeatureBakeResult => {
  const artifactId =
    request.artifactId ??
    `artifact-audio-features-${executionIdentity.split(':').at(-1)}`;
  const artifact: VizAudioFeatureTimelineArtifact = {
    schemaVersion: 1,
    id: artifactId,
    kind: 'audio-feature-timeline',
    label:
      request.artifactLabel ??
      `${request.sourceAssetId} Standard Audio Features`,
    sourceAssetId: request.sourceAssetId,
    profile: request.profile,
    sourceWindow: {
      startSample: analysis.startSample,
      sampleCount: analysis.sampleCount,
      startSeconds: analysis.startSample / analysis.sampleRate,
      durationSeconds: analysis.sampleCount / analysis.sampleRate,
    },
    frameAlignment: {
      fps: analysis.fps,
      frameCount: analysis.frameCount,
      alignment: 'frame-centered',
    },
    analysis: {
      pipeline: `${VIZ_AUDIO_FEATURE_BAKE_VERSION}+${analysis.analysisVersion}`,
      sourceContentIdentity: request.sourceContentIdentity,
      sampleRate: analysis.sampleRate,
      channelCount: analysis.channelCount,
      fftSize: analysis.fftSize,
      window: 'hann',
      minDecibels: analysis.minDecibels,
      maxDecibels: analysis.maxDecibels,
    },
    featureSeries: analysis.featureSeries.map(toArtifactSeries),
    packedFrames: {
      frequency: {
        encoding: 'uint8-base64',
        frameCount: analysis.frameCount,
        valuesPerFrame: analysis.spectrumBinCount,
        data: encodeVizUint8Base64(analysis.frequencyData),
      },
      timeDomain: {
        encoding: 'uint8-base64',
        frameCount: analysis.frameCount,
        valuesPerFrame: analysis.waveformSampleCount,
        data: encodeVizUint8Base64(analysis.timeDomainData),
      },
    },
    metadata: {
      executionIdentity,
      bakeVersion: VIZ_AUDIO_FEATURE_BAKE_VERSION,
      executionDescriptor: descriptor,
    },
  };
  const resolvedArtifact: VizResolvedArtifact = {
    id: artifact.id,
    kind: artifact.kind,
    uri: request.artifactUri ?? `memory://artifacts/${artifact.id}.json`,
    payload: artifact,
    metadata: {
      executionIdentity,
      profile: artifact.profile,
      sourceAssetId: artifact.sourceAssetId,
    },
  };

  return {
    ok: true,
    status: 'succeeded',
    executionIdentity,
    artifact,
    resolvedArtifact,
    issues: [],
    metrics: {
      frameCount: analysis.frameCount,
      featureCount: artifact.featureSeries.length,
      packedByteLength:
        analysis.frequencyData.byteLength + analysis.timeDomainData.byteLength,
    },
  };
};

const createExecutionFailure = (
  executionIdentity: string | undefined,
  error: unknown,
): VizAudioFeatureBakeResult => {
  if (
    error instanceof StandardAudioFrameAnalysisCancelledError ||
    (error instanceof VizAudioPcmError && error.code === 'cancelled')
  ) {
    return {
      ok: false,
      status: 'cancelled',
      ...(executionIdentity ? { executionIdentity } : {}),
      issues: [{ code: 'cancelled', message: error.message }],
    };
  }
  return {
    ok: false,
    status: 'failed',
    ...(executionIdentity ? { executionIdentity } : {}),
    issues: [
      {
        code:
          error instanceof VizAudioPcmError && error.code === 'invalid-pcm'
            ? 'invalid-pcm'
            : 'execution-failed',
        message:
          error instanceof Error ? error.message : 'Audio feature bake failed.',
      },
    ],
  };
};

const validateBake = (
  request: VizAudioFeatureBakeRequest,
  pcm: VizAudioPcmSource,
): VizAudioFeatureBakeResult | undefined => {
  const issues = validateExecutionInput(request, pcm);
  return issues.length === 0
    ? undefined
    : { ok: false, status: 'failed', issues };
};

export const executeVizAudioFeatureBake = (
  request: VizAudioFeatureBakeRequest,
  pcm: VizAudioPcmSource,
  options: ExecuteVizAudioFeatureBakeOptions = {},
): VizAudioFeatureBakeResult => {
  const validationFailure = validateBake(request, pcm);
  if (validationFailure) {
    return validationFailure;
  }
  let executionIdentity: string | undefined;
  try {
    const descriptor = createExecutionDescriptor(
      request,
      pcm,
      createVizAudioPcmIdentity(pcm, options.shouldCancel),
    );
    executionIdentity = createExecutionIdentity(descriptor);
    const analysis = analyzeStandardAudioFrames(
      toAudioSignal(pcm),
      createAnalysisOptions(request, pcm, options),
    );
    if (options.shouldCancel?.())
      throw new VizAudioPcmError('cancelled', 'Audio bake was cancelled.');
    return createSuccessfulResult(
      request,
      executionIdentity,
      analysis,
      descriptor,
    );
  } catch (error) {
    return createExecutionFailure(executionIdentity, error);
  }
};

export const executeVizAudioFeatureBakeAsync = async (
  request: VizAudioFeatureBakeRequest,
  pcm: VizAudioPcmSource,
  options: ExecuteVizAudioFeatureBakeAsyncOptions = {},
): Promise<VizAudioFeatureBakeResult> => {
  const validationFailure = validateBake(request, pcm);
  if (validationFailure) {
    return validationFailure;
  }
  let executionIdentity: string | undefined;
  try {
    const descriptor = createExecutionDescriptor(
      request,
      pcm,
      await createVizAudioPcmIdentityAsync(pcm, {
        ...(options.shouldCancel ? { shouldCancel: options.shouldCancel } : {}),
        ...(options.yieldToHost ? { yieldToHost: options.yieldToHost } : {}),
      }),
    );
    executionIdentity = createExecutionIdentity(descriptor);
    const analysis = await analyzeStandardAudioFramesAsync(toAudioSignal(pcm), {
      ...createAnalysisOptions(request, pcm, options),
      ...(options.yieldEveryFrames === undefined
        ? {}
        : { yieldEveryFrames: options.yieldEveryFrames }),
      ...(options.yieldToHost === undefined
        ? {}
        : { yieldToHost: options.yieldToHost }),
    });
    if (options.shouldCancel?.())
      throw new VizAudioPcmError('cancelled', 'Audio bake was cancelled.');
    return createSuccessfulResult(
      request,
      executionIdentity,
      analysis,
      descriptor,
    );
  } catch (error) {
    return createExecutionFailure(executionIdentity, error);
  }
};

export const createBakePlan = (project: VizProjectDocument): VizBakePlan => {
  const audioAssets = (project.assetRefs ?? []).filter(
    (asset) => asset.kind === 'audio',
  );

  return {
    projectId: project.projectId,
    requests: audioAssets.map((asset) => ({
      kind: 'audio-feature-timeline',
      sourceAssetId: asset.id,
      profile: 'standard',
      fps: project.timeline.fps,
    })),
  };
};
