import type { VizAudioFeatureTimelineArtifact } from '@viz-engine/contracts';
import {
  decodeVizAudioArtifactContainer,
  encodeVizAudioArtifactContainer,
} from '@viz-engine/project-bundle/node';
import {
  isVizAudioFeatureTimelineArtifact,
  sampleAudioFeatureValue,
  sampleAudioFrameSnapshot,
} from '@viz-engine/runtime';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const sourcePath = resolve(
  process.argv[2] ??
    'public/productions/signal-cathedral/baked/artifact-audio-features-a10777ef.json',
);
const sourceBytes = readFileSync(sourcePath);
const artifact = JSON.parse(
  sourceBytes.toString('utf8'),
) as VizAudioFeatureTimelineArtifact;
if (!isVizAudioFeatureTimelineArtifact(artifact)) {
  throw new Error(`"${sourcePath}" is not a valid audio feature artifact.`);
}
const container = encodeVizAudioArtifactContainer(artifact);
const reopened = decodeVizAudioArtifactContainer(container);
if (!isVizAudioFeatureTimelineArtifact(reopened)) {
  throw new Error('Encoded container did not reopen as a valid artifact.');
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)]!;
};

const measure = (operation: () => void, iterations = 9): number => {
  const durations: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now();
    operation();
    durations.push(performance.now() - startedAt);
  }
  return median(durations);
};

const legacyDecodeMs = measure(() => {
  JSON.parse(sourceBytes.toString('utf8'));
});
const containerDecodeMs = measure(() => {
  decodeVizAudioArtifactContainer(container);
});

const sample = (candidate: VizAudioFeatureTimelineArtifact): number => {
  let checksum = 0;
  const frameCount = candidate.frameAlignment.frameCount;
  for (let index = 0; index < 10_000; index += 1) {
    const frame = (index * 17) % frameCount;
    const snapshot = sampleAudioFrameSnapshot(candidate, frame);
    checksum +=
      (snapshot?.frequencyData[0] ?? 0) +
      (snapshot?.timeDomainData[0] ?? 0) +
      (sampleAudioFeatureValue(candidate, 'rms', frame) ?? 0);
  }
  return checksum;
};
sample(artifact);
sample(reopened);
let legacyChecksum = 0;
let containerChecksum = 0;
const legacySeekMs = measure(() => {
  legacyChecksum = sample(artifact);
}, 5);
const containerSeekMs = measure(() => {
  containerChecksum = sample(reopened);
}, 5);
if (legacyChecksum !== containerChecksum) {
  throw new Error('Legacy and container sampling checksums differ.');
}

const legacyFrequency =
  artifact.packedFrames?.frequency.encoding === 'uint8-base64'
    ? artifact.packedFrames.frequency.data.length
    : (artifact.packedFrames?.frequency.data.byteLength ?? 0);
const legacyTimeDomain =
  artifact.packedFrames?.timeDomain.encoding === 'uint8-base64'
    ? artifact.packedFrames.timeDomain.data.length
    : (artifact.packedFrames?.timeDomain.data.byteLength ?? 0);
const rawPackedBytes =
  reopened.packedFrames!.frequency.data.byteLength +
  reopened.packedFrames!.timeDomain.data.byteLength;
const legacyEncodedBytes = legacyFrequency + legacyTimeDomain;

process.stdout.write(
  `${JSON.stringify(
    {
      sourcePath,
      frameCount: artifact.frameAlignment.frameCount,
      featureCount: artifact.featureSeries.length,
      packedValuesPreserved: rawPackedBytes,
      storage: {
        legacyJsonBytes: sourceBytes.byteLength,
        containerBytes: container.byteLength,
        reductionBytes: sourceBytes.byteLength - container.byteLength,
        reductionPercent:
          ((sourceBytes.byteLength - container.byteLength) /
            sourceBytes.byteLength) *
          100,
      },
      decode: {
        legacyJsonMedianMs: legacyDecodeMs,
        containerMedianMs: containerDecodeMs,
      },
      seek: {
        samplesPerRun: 10_000,
        legacyMedianMs: legacySeekMs,
        containerMedianMs: containerSeekMs,
        checksum: legacyChecksum,
      },
      retainedPackedRepresentationFloor: {
        legacyBase64PlusDecodedBytes: legacyEncodedBytes + rawPackedBytes,
        containerRawBytes: rawPackedBytes,
        reductionBytes: legacyEncodedBytes,
      },
    },
    null,
    2,
  )}\n`,
);
