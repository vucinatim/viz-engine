import {
  decodeVizUint8Base64,
  type VizAudioFeatureSeries,
  type VizAudioFeatureTimelineArtifact,
  type VizPackedAudioFrameSeries,
  type VizProjectDocument,
  type VizResolvedArtifact,
  type VizRuntimeAudioFrameSnapshot,
} from '@viz-engine/contracts';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const artifactValidationCache = new WeakMap<object, boolean>();

const isAudioFeatureSeries = (
  value: unknown,
): value is VizAudioFeatureSeries => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<VizAudioFeatureSeries>;
  return (
    isNonEmptyString(candidate.name) &&
    Array.isArray(candidate.values) &&
    candidate.values.every(isFiniteNumber) &&
    (candidate.unit === undefined ||
      ['linear-amplitude', 'unit', 'hertz', 'custom'].includes(
        candidate.unit,
      )) &&
    (candidate.normalization === undefined ||
      ['none', 'decibel-unit', 'artifact-peak', 'custom'].includes(
        candidate.normalization,
      )) &&
    (candidate.min === undefined || isFiniteNumber(candidate.min)) &&
    (candidate.max === undefined || isFiniteNumber(candidate.max))
  );
};

const isPackedFrameSeries = (
  value: unknown,
  expectedFrameCount: number,
): value is VizPackedAudioFrameSeries => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<VizPackedAudioFrameSeries>;
  const valuesPerFrame = candidate.valuesPerFrame;
  if (
    candidate.frameCount !== expectedFrameCount ||
    typeof valuesPerFrame !== 'number' ||
    !Number.isInteger(valuesPerFrame) ||
    valuesPerFrame <= 0
  ) {
    return false;
  }
  const expectedLength = expectedFrameCount * valuesPerFrame;
  if (
    candidate.encoding === 'uint8-array' &&
    candidate.data instanceof Uint8Array
  ) {
    return candidate.data.length === expectedLength;
  }
  if (
    candidate.encoding === 'uint8-base64' &&
    typeof candidate.data === 'string'
  ) {
    try {
      return decodeVizUint8Base64(candidate.data).length === expectedLength;
    } catch {
      return false;
    }
  }
  return false;
};

const isAudioAnalysisIdentity = (
  value: unknown,
): value is NonNullable<VizAudioFeatureTimelineArtifact['analysis']> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<
    NonNullable<VizAudioFeatureTimelineArtifact['analysis']>
  >;
  return (
    isNonEmptyString(candidate.pipeline) &&
    isNonEmptyString(candidate.sourceContentIdentity) &&
    isFiniteNumber(candidate.sampleRate) &&
    candidate.sampleRate > 0 &&
    Number.isInteger(candidate.channelCount) &&
    (candidate.channelCount === 1 || candidate.channelCount === 2) &&
    Number.isInteger(candidate.fftSize) &&
    (candidate.fftSize ?? 0) >= 32 &&
    ((candidate.fftSize ?? 0) & ((candidate.fftSize ?? 0) - 1)) === 0 &&
    candidate.window === 'hann' &&
    isFiniteNumber(candidate.minDecibels) &&
    isFiniteNumber(candidate.maxDecibels) &&
    candidate.minDecibels < candidate.maxDecibels
  );
};

export const isVizAudioFeatureTimelineArtifact = (
  value: unknown,
): value is VizAudioFeatureTimelineArtifact => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const cached = artifactValidationCache.get(value);
  if (cached !== undefined) {
    return cached;
  }

  const candidate = value as Partial<VizAudioFeatureTimelineArtifact>;
  const frameAlignment = candidate.frameAlignment;
  const sourceWindow = candidate.sourceWindow;
  const frameCount =
    typeof frameAlignment === 'object' &&
    frameAlignment !== null &&
    'frameCount' in frameAlignment
      ? (frameAlignment as { frameCount?: unknown }).frameCount
      : undefined;
  const packedFrames = candidate.packedFrames;

  const isValid =
    candidate.schemaVersion === 1 &&
    candidate.kind === 'audio-feature-timeline' &&
    (candidate.profile === 'standard' ||
      candidate.profile === 'extended' ||
      candidate.profile === 'specialized') &&
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.label) &&
    isNonEmptyString(candidate.sourceAssetId) &&
    typeof frameAlignment === 'object' &&
    frameAlignment !== null &&
    isFiniteNumber(frameAlignment.fps) &&
    frameAlignment.fps > 0 &&
    Number.isInteger(frameAlignment.frameCount) &&
    frameAlignment.frameCount >= 0 &&
    frameAlignment.alignment === 'frame-centered' &&
    typeof sourceWindow === 'object' &&
    sourceWindow !== null &&
    Number.isInteger(sourceWindow.startSample) &&
    sourceWindow.startSample >= 0 &&
    Number.isInteger(sourceWindow.sampleCount) &&
    sourceWindow.sampleCount >= 0 &&
    isFiniteNumber(sourceWindow.startSeconds) &&
    sourceWindow.startSeconds >= 0 &&
    isFiniteNumber(sourceWindow.durationSeconds) &&
    sourceWindow.durationSeconds >= 0 &&
    Array.isArray(candidate.featureSeries) &&
    candidate.featureSeries.every(
      (series) =>
        isAudioFeatureSeries(series) && series.values.length === frameCount,
    ) &&
    (candidate.analysis === undefined ||
      isAudioAnalysisIdentity(candidate.analysis)) &&
    (packedFrames === undefined ||
      (candidate.analysis !== undefined &&
        isPackedFrameSeries(packedFrames.frequency, frameCount as number) &&
        isPackedFrameSeries(packedFrames.timeDomain, frameCount as number) &&
        (candidate.profile !== 'standard' ||
          (packedFrames.frequency.valuesPerFrame ===
            candidate.analysis.fftSize / 2 &&
            packedFrames.timeDomain.valuesPerFrame ===
              candidate.analysis.fftSize))));
  artifactValidationCache.set(value, isValid);
  return isValid;
};

const resolvedArtifactTimelineCache = new WeakMap<
  object,
  VizAudioFeatureTimelineArtifact | null
>();

export const getAudioFeatureTimelineArtifact = (
  artifact: VizResolvedArtifact | undefined,
): VizAudioFeatureTimelineArtifact | undefined => {
  if (!artifact) {
    return undefined;
  }
  const cached = resolvedArtifactTimelineCache.get(artifact);
  if (cached !== undefined) {
    return cached ?? undefined;
  }

  if (isVizAudioFeatureTimelineArtifact(artifact.payload)) {
    resolvedArtifactTimelineCache.set(artifact, artifact.payload);
    return artifact.payload;
  }

  if (isVizAudioFeatureTimelineArtifact(artifact)) {
    resolvedArtifactTimelineCache.set(artifact, artifact);
    return artifact;
  }

  resolvedArtifactTimelineCache.set(artifact, null);
  return undefined;
};

const mapRuntimeFrameToArtifactFrame = (
  artifact: VizAudioFeatureTimelineArtifact,
  frame: number,
  runtimeFps: number,
): number => {
  const frameCount = artifact.frameAlignment.frameCount;
  if (frameCount <= 0) {
    return 0;
  }
  const mapped = Math.floor(
    ((Math.max(0, frame) + 0.5) * artifact.frameAlignment.fps) / runtimeFps,
  );
  return Math.max(0, Math.min(mapped, frameCount - 1));
};

export const sampleAudioFeatureValue = (
  artifact: VizAudioFeatureTimelineArtifact,
  feature: string,
  frame: number,
  runtimeFps = artifact.frameAlignment.fps,
): number | undefined => {
  const featureSeries = artifact.featureSeries.find(
    (series) => series.name === feature,
  );

  if (!featureSeries || !Number.isFinite(runtimeFps) || runtimeFps <= 0) {
    return undefined;
  }

  const artifactFrame = mapRuntimeFrameToArtifactFrame(
    artifact,
    frame,
    runtimeFps,
  );
  return featureSeries.values[artifactFrame];
};

interface DecodedPackedFrames {
  frequency: Uint8Array;
  timeDomain: Uint8Array;
}

const decodedFrameCache = new WeakMap<
  VizAudioFeatureTimelineArtifact,
  DecodedPackedFrames
>();

const getDecodedFrames = (
  artifact: VizAudioFeatureTimelineArtifact,
): DecodedPackedFrames | undefined => {
  if (!artifact.packedFrames) {
    return undefined;
  }
  const cached = decodedFrameCache.get(artifact);
  if (cached) {
    return cached;
  }
  const decode = (series: VizPackedAudioFrameSeries): Uint8Array =>
    series.encoding === 'uint8-array'
      ? series.data
      : decodeVizUint8Base64(series.data);
  const decoded = {
    frequency: decode(artifact.packedFrames.frequency),
    timeDomain: decode(artifact.packedFrames.timeDomain),
  };
  const expectedFrequencyLength =
    artifact.packedFrames.frequency.frameCount *
    artifact.packedFrames.frequency.valuesPerFrame;
  const expectedTimeDomainLength =
    artifact.packedFrames.timeDomain.frameCount *
    artifact.packedFrames.timeDomain.valuesPerFrame;
  if (
    decoded.frequency.length !== expectedFrequencyLength ||
    decoded.timeDomain.length !== expectedTimeDomainLength
  ) {
    throw new Error(
      `Audio artifact "${artifact.id}" packed frame lengths do not match their descriptors.`,
    );
  }
  decodedFrameCache.set(artifact, decoded);
  return decoded;
};

export const sampleAudioFrameSnapshot = (
  artifact: VizAudioFeatureTimelineArtifact,
  frame: number,
  runtimeFps = artifact.frameAlignment.fps,
): VizRuntimeAudioFrameSnapshot | undefined => {
  const packed = artifact.packedFrames;
  const analysis = artifact.analysis;
  if (!packed || !analysis || !Number.isFinite(runtimeFps) || runtimeFps <= 0) {
    return undefined;
  }
  const decoded = getDecodedFrames(artifact);
  if (!decoded) {
    return undefined;
  }
  const artifactFrame = mapRuntimeFrameToArtifactFrame(
    artifact,
    frame,
    runtimeFps,
  );
  const frequencyStart = artifactFrame * packed.frequency.valuesPerFrame;
  const timeDomainStart = artifactFrame * packed.timeDomain.valuesPerFrame;

  return {
    frequencyData: decoded.frequency.slice(
      frequencyStart,
      frequencyStart + packed.frequency.valuesPerFrame,
    ),
    timeDomainData: decoded.timeDomain.slice(
      timeDomainStart,
      timeDomainStart + packed.timeDomain.valuesPerFrame,
    ),
    sampleRate: analysis.sampleRate,
    fftSize: analysis.fftSize,
    minDecibels: analysis.minDecibels,
    maxDecibels: analysis.maxDecibels,
    sourceAssetId: artifact.sourceAssetId,
    artifactId: artifact.id,
    artifactFrame,
    provenance: 'baked',
  };
};

export const sampleProjectAudioFrameSnapshot = (
  project: VizProjectDocument,
  resolvedArtifacts: readonly VizResolvedArtifact[],
  frame: number,
): VizRuntimeAudioFrameSnapshot | undefined => {
  for (const artifactRef of project.artifactRefs ?? []) {
    if (artifactRef.kind !== 'audio-feature-timeline') {
      continue;
    }
    const resolved = resolvedArtifacts.find(
      (artifact) => artifact.id === artifactRef.id,
    );
    const artifact = getAudioFeatureTimelineArtifact(resolved);
    if (!artifact) {
      continue;
    }
    const snapshot = sampleAudioFrameSnapshot(
      artifact,
      frame,
      project.timeline.fps,
    );
    if (snapshot) {
      return snapshot;
    }
  }
  return undefined;
};
