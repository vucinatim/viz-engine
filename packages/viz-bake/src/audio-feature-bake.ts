import {
  encodeVizUint8Base64,
  type VizAudioFeatureProfile,
  type VizAudioFeatureSeries,
  type VizAudioFeatureTimelineArtifact,
  type VizProjectDocument,
  type VizResolvedArtifact,
} from "@viz-engine/contracts";
import {
  analyzeStandardAudioFrames,
  analyzeStandardAudioFramesAsync,
  StandardAudioFrameAnalysisCancelledError,
  type AudioSignal,
  type StandardAudioFrameAnalysisResult,
  type StandardAudioFrameAnalysisOptions,
} from "@viz-engine/rhythm-core";

export const VIZ_AUDIO_FEATURE_BAKE_VERSION =
  "viz-bake.audio-feature-timeline.v1" as const;

export interface VizBakeRequest {
  kind: "audio-feature-timeline";
  sourceAssetId: string;
  profile: VizAudioFeatureProfile;
  fps: number;
}

export interface VizBakePlan {
  projectId: string;
  requests: VizBakeRequest[];
}

export interface VizAudioPcmSource {
  sampleRate: number;
  channels: readonly Float32Array[];
}

export interface VizAudioFeatureBakeRequest extends VizBakeRequest {
  sourceContentIdentity: string;
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
    | "invalid-request"
    | "unsupported-profile"
    | "invalid-pcm"
    | "cancelled"
    | "execution-failed";
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
      status: "succeeded";
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
      status: "cancelled" | "failed";
      executionIdentity?: string;
      issues: VizBakeExecutionIssue[];
    };

export interface ExecuteVizAudioFeatureBakeOptions {
  shouldCancel?: () => boolean;
  onProgress?: (progress: VizAudioFeatureBakeProgress) => void;
}

export interface ExecuteVizAudioFeatureBakeAsyncOptions
  extends ExecuteVizAudioFeatureBakeOptions {
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
    request.kind !== "audio-feature-timeline" ||
    typeof request.sourceAssetId !== "string" ||
    request.sourceAssetId.trim().length === 0 ||
    typeof request.sourceContentIdentity !== "string" ||
    request.sourceContentIdentity.trim().length === 0 ||
    !isPositiveFinite(request.fps)
  ) {
    issues.push({
      code: "invalid-request",
      message:
        "Audio bake request requires kind, source asset/content identity, and positive FPS.",
    });
  }
  if (request.profile !== "standard") {
    issues.push({
      code: "unsupported-profile",
      message:
        `Audio feature profile "${request.profile}" is not implemented by the standard V1 bake pipeline.`,
    });
  }
  if (
    !isPositiveFinite(pcm.sampleRate) ||
    (pcm.channels.length !== 1 && pcm.channels.length !== 2) ||
    pcm.channels.some(
      (channel) =>
        !(channel instanceof Float32Array) ||
        channel.length !== pcm.channels[0]?.length,
    )
  ) {
    issues.push({
      code: "invalid-pcm",
      message:
        "PCM input requires a positive sample rate and one or two equally sized Float32Array channels.",
    });
  }
  if (
    pcm.channels.some((channel) =>
      channel.some((sample) => !Number.isFinite(sample)),
    )
  ) {
    issues.push({
      code: "invalid-pcm",
      message: "PCM input channels may contain only finite samples.",
    });
  }
  const fftSize = request.fftSize ?? 2048;
  if (
    !Number.isInteger(fftSize) ||
    fftSize < 32 ||
    (fftSize & (fftSize - 1)) !== 0
  ) {
    issues.push({
      code: "invalid-request",
      message:
        "Audio bake fftSize must be a power-of-two integer of at least 32.",
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
      code: "invalid-request",
      message:
        "Audio bake minDecibels must be finite and lower than maxDecibels.",
    });
  }
  for (const [label, value] of [
    ["artifactId", request.artifactId],
    ["artifactLabel", request.artifactLabel],
    ["artifactUri", request.artifactUri],
  ] as const) {
    if (value !== undefined && value.trim().length === 0) {
      issues.push({
        code: "invalid-request",
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
      code: "invalid-request",
      message: "Audio bake source-window startSeconds must be finite and non-negative.",
    });
  }
  if (
    request.sourceWindow?.durationSeconds !== undefined &&
    (!Number.isFinite(request.sourceWindow.durationSeconds) ||
      request.sourceWindow.durationSeconds < 0)
  ) {
    issues.push({
      code: "invalid-request",
      message: "Audio bake source-window durationSeconds must be finite and non-negative.",
    });
  }

  return issues;
};

const fnv1a = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const createExecutionDescriptor = (
  request: VizAudioFeatureBakeRequest,
  pcm: VizAudioPcmSource,
) => ({
  bakeVersion: VIZ_AUDIO_FEATURE_BAKE_VERSION,
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
  sourceWindow: {
    startSeconds: request.sourceWindow?.startSeconds ?? 0,
    durationSeconds: request.sourceWindow?.durationSeconds ?? null,
  },
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
  >["featureSeries"][number],
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
  const totalSamples = pcm.channels[0]!.length;
  const startSample = Math.min(
    totalSamples,
    Math.floor(
      (request.sourceWindow?.startSeconds ?? 0) * pcm.sampleRate,
    ),
  );
  const requestedSampleCount =
    request.sourceWindow?.durationSeconds === undefined
      ? totalSamples - startSample
      : Math.floor(
          request.sourceWindow.durationSeconds * pcm.sampleRate,
        );
  const sampleCount = Math.min(
    totalSamples - startSample,
    requestedSampleCount,
  );
  return {
    sampleRate: pcm.sampleRate,
    fps: request.fps,
    startSample,
    sampleCount,
    ...(request.fftSize === undefined
      ? {}
      : { fftSize: request.fftSize }),
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
        progress:
          totalFrames === 0 ? 1 : completedFrames / totalFrames,
      });
    },
  };
};

const createExecutionIdentity = (
  request: VizAudioFeatureBakeRequest,
  pcm: VizAudioPcmSource,
): string =>
  `${VIZ_AUDIO_FEATURE_BAKE_VERSION}:${fnv1a(
    JSON.stringify(createExecutionDescriptor(request, pcm)),
  )}`;

const createSuccessfulResult = (
  request: VizAudioFeatureBakeRequest,
  executionIdentity: string,
  analysis: StandardAudioFrameAnalysisResult,
): VizAudioFeatureBakeResult => {
  const artifactId =
    request.artifactId ??
    `artifact-audio-features-${fnv1a(executionIdentity)}`;
  const artifact: VizAudioFeatureTimelineArtifact = {
    schemaVersion: 1,
    id: artifactId,
    kind: "audio-feature-timeline",
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
      alignment: "frame-centered",
    },
    analysis: {
      pipeline: `${VIZ_AUDIO_FEATURE_BAKE_VERSION}+${analysis.analysisVersion}`,
      sourceContentIdentity: request.sourceContentIdentity,
      sampleRate: analysis.sampleRate,
      channelCount: analysis.channelCount,
      fftSize: analysis.fftSize,
      window: "hann",
      minDecibels: analysis.minDecibels,
      maxDecibels: analysis.maxDecibels,
    },
    featureSeries: analysis.featureSeries.map(toArtifactSeries),
    packedFrames: {
      frequency: {
        encoding: "uint8-base64",
        frameCount: analysis.frameCount,
        valuesPerFrame: analysis.spectrumBinCount,
        data: encodeVizUint8Base64(analysis.frequencyData),
      },
      timeDomain: {
        encoding: "uint8-base64",
        frameCount: analysis.frameCount,
        valuesPerFrame: analysis.waveformSampleCount,
        data: encodeVizUint8Base64(analysis.timeDomainData),
      },
    },
    metadata: {
      executionIdentity,
      bakeVersion: VIZ_AUDIO_FEATURE_BAKE_VERSION,
    },
  };
  const resolvedArtifact: VizResolvedArtifact = {
    id: artifact.id,
    kind: artifact.kind,
    uri:
      request.artifactUri ??
      `memory://artifacts/${artifact.id}.json`,
    payload: artifact,
    metadata: {
      executionIdentity,
      profile: artifact.profile,
      sourceAssetId: artifact.sourceAssetId,
    },
  };

  return {
    ok: true,
    status: "succeeded",
    executionIdentity,
    artifact,
    resolvedArtifact,
    issues: [],
    metrics: {
      frameCount: analysis.frameCount,
      featureCount: artifact.featureSeries.length,
      packedByteLength:
        analysis.frequencyData.byteLength +
        analysis.timeDomainData.byteLength,
    },
  };
};

const createExecutionFailure = (
  executionIdentity: string,
  error: unknown,
): VizAudioFeatureBakeResult => {
  if (error instanceof StandardAudioFrameAnalysisCancelledError) {
    return {
      ok: false,
      status: "cancelled",
      executionIdentity,
      issues: [{ code: "cancelled", message: error.message }],
    };
  }
  return {
    ok: false,
    status: "failed",
    executionIdentity,
    issues: [
      {
        code: "execution-failed",
        message:
          error instanceof Error
            ? error.message
            : "Audio feature bake failed.",
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
    : { ok: false, status: "failed", issues };
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
  const executionIdentity = createExecutionIdentity(request, pcm);
  try {
    const analysis = analyzeStandardAudioFrames(
      toAudioSignal(pcm),
      createAnalysisOptions(request, pcm, options),
    );
    return createSuccessfulResult(
      request,
      executionIdentity,
      analysis,
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
  const executionIdentity = createExecutionIdentity(request, pcm);
  try {
    const analysis = await analyzeStandardAudioFramesAsync(
      toAudioSignal(pcm),
      {
        ...createAnalysisOptions(request, pcm, options),
        ...(options.yieldEveryFrames === undefined
          ? {}
          : { yieldEveryFrames: options.yieldEveryFrames }),
        ...(options.yieldToHost === undefined
          ? {}
          : { yieldToHost: options.yieldToHost }),
      },
    );
    return createSuccessfulResult(
      request,
      executionIdentity,
      analysis,
    );
  } catch (error) {
    return createExecutionFailure(executionIdentity, error);
  }
};

export const createBakePlan = (project: VizProjectDocument): VizBakePlan => {
  const audioAssets = (project.assetRefs ?? []).filter(
    (asset) => asset.kind === "audio",
  );

  return {
    projectId: project.projectId,
    requests: audioAssets.map((asset) => ({
      kind: "audio-feature-timeline",
      sourceAssetId: asset.id,
      profile: "standard",
      fps: project.timeline.fps,
    })),
  };
};
