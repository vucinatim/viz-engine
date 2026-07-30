import {
  decodeVizUint8Base64,
  type VizAudioFeatureTimelineArtifact,
  type VizPackedAudioFrameSeries,
} from '@viz-engine/contracts';

export const VIZ_AUDIO_ARTIFACT_CONTAINER_ENCODING =
  'viz-audio-feature-timeline-v1' as const;

const MAGIC = new TextEncoder().encode('VIZAFTL1');
const HEADER_BYTE_LENGTH = MAGIC.byteLength + 12;

interface SerializedPackedFrameSeries {
  encoding: 'uint8-array';
  frameCount: number;
  valuesPerFrame: number;
}

interface SerializedAudioArtifact extends Omit<
  VizAudioFeatureTimelineArtifact,
  'packedFrames'
> {
  packedFrames: {
    frequency: SerializedPackedFrameSeries;
    timeDomain: SerializedPackedFrameSeries;
  };
}

const asPackedBytes = (series: VizPackedAudioFrameSeries): Uint8Array =>
  series.encoding === 'uint8-array'
    ? series.data
    : decodeVizUint8Base64(series.data);

const assertSeriesLength = (
  series: VizPackedAudioFrameSeries,
  bytes: Uint8Array,
  label: string,
): void => {
  if (
    !Number.isInteger(series.frameCount) ||
    series.frameCount < 0 ||
    !Number.isInteger(series.valuesPerFrame) ||
    series.valuesPerFrame <= 0 ||
    bytes.byteLength !== series.frameCount * series.valuesPerFrame
  ) {
    throw new Error(
      `Audio artifact ${label} packed bytes do not match their descriptor.`,
    );
  }
};

export const isVizAudioArtifactContainerPayload = (
  value: unknown,
): value is VizAudioFeatureTimelineArtifact => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<VizAudioFeatureTimelineArtifact>;
  return (
    candidate.schemaVersion === 1 &&
    candidate.kind === 'audio-feature-timeline' &&
    typeof candidate.packedFrames === 'object' &&
    candidate.packedFrames !== null &&
    typeof candidate.packedFrames.frequency === 'object' &&
    candidate.packedFrames.frequency !== null &&
    typeof candidate.packedFrames.timeDomain === 'object' &&
    candidate.packedFrames.timeDomain !== null
  );
};

export const encodeVizAudioArtifactContainer = (
  artifact: VizAudioFeatureTimelineArtifact,
): Uint8Array => {
  if (!artifact.packedFrames) {
    throw new Error(
      `Audio artifact "${artifact.id}" has no packed frames to encode.`,
    );
  }

  const frequency = asPackedBytes(artifact.packedFrames.frequency);
  const timeDomain = asPackedBytes(artifact.packedFrames.timeDomain);
  assertSeriesLength(artifact.packedFrames.frequency, frequency, 'frequency');
  assertSeriesLength(
    artifact.packedFrames.timeDomain,
    timeDomain,
    'time-domain',
  );

  const serialized: SerializedAudioArtifact = {
    ...artifact,
    packedFrames: {
      frequency: {
        encoding: 'uint8-array',
        frameCount: artifact.packedFrames.frequency.frameCount,
        valuesPerFrame: artifact.packedFrames.frequency.valuesPerFrame,
      },
      timeDomain: {
        encoding: 'uint8-array',
        frameCount: artifact.packedFrames.timeDomain.frameCount,
        valuesPerFrame: artifact.packedFrames.timeDomain.valuesPerFrame,
      },
    },
  };
  const metadata = new TextEncoder().encode(JSON.stringify(serialized));
  const output = new Uint8Array(
    HEADER_BYTE_LENGTH +
      metadata.byteLength +
      frequency.byteLength +
      timeDomain.byteLength,
  );
  output.set(MAGIC);
  const header = new DataView(output.buffer);
  header.setUint32(MAGIC.byteLength, metadata.byteLength, true);
  header.setUint32(MAGIC.byteLength + 4, frequency.byteLength, true);
  header.setUint32(MAGIC.byteLength + 8, timeDomain.byteLength, true);
  let offset = HEADER_BYTE_LENGTH;
  output.set(metadata, offset);
  offset += metadata.byteLength;
  output.set(frequency, offset);
  offset += frequency.byteLength;
  output.set(timeDomain, offset);
  return output;
};

const assertContainerHeader = (bytes: Uint8Array): DataView => {
  if (bytes.byteLength < HEADER_BYTE_LENGTH) {
    throw new Error('Audio artifact container is truncated.');
  }
  for (const [index, byte] of MAGIC.entries()) {
    if (bytes[index] !== byte) {
      throw new Error('Audio artifact container has an invalid signature.');
    }
  }
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
};

export const decodeVizAudioArtifactContainer = (
  bytes: Uint8Array,
): VizAudioFeatureTimelineArtifact => {
  const header = assertContainerHeader(bytes);
  const metadataLength = header.getUint32(MAGIC.byteLength, true);
  const frequencyLength = header.getUint32(MAGIC.byteLength + 4, true);
  const timeDomainLength = header.getUint32(MAGIC.byteLength + 8, true);
  const expectedLength =
    HEADER_BYTE_LENGTH + metadataLength + frequencyLength + timeDomainLength;
  if (bytes.byteLength !== expectedLength) {
    throw new Error(
      'Audio artifact container byte lengths do not match its header.',
    );
  }

  let offset = HEADER_BYTE_LENGTH;
  const metadataBytes = bytes.subarray(offset, offset + metadataLength);
  offset += metadataLength;
  let serialized: SerializedAudioArtifact;
  try {
    serialized = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(metadataBytes),
    ) as SerializedAudioArtifact;
  } catch {
    throw new Error('Audio artifact container metadata is invalid JSON.');
  }
  const frequency = Uint8Array.from(
    bytes.subarray(offset, offset + frequencyLength),
  );
  offset += frequencyLength;
  const timeDomain = Uint8Array.from(
    bytes.subarray(offset, offset + timeDomainLength),
  );
  if (
    serialized.schemaVersion !== 1 ||
    serialized.kind !== 'audio-feature-timeline' ||
    serialized.packedFrames?.frequency?.encoding !== 'uint8-array' ||
    serialized.packedFrames?.timeDomain?.encoding !== 'uint8-array'
  ) {
    throw new Error('Audio artifact container metadata is incompatible.');
  }

  const artifact: VizAudioFeatureTimelineArtifact = {
    ...serialized,
    packedFrames: {
      frequency: {
        ...serialized.packedFrames.frequency,
        data: frequency,
      },
      timeDomain: {
        ...serialized.packedFrames.timeDomain,
        data: timeDomain,
      },
    },
  };
  assertSeriesLength(artifact.packedFrames!.frequency, frequency, 'frequency');
  assertSeriesLength(
    artifact.packedFrames!.timeDomain,
    timeDomain,
    'time-domain',
  );
  return artifact;
};
