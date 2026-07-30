import {
  executeVizAudioFeatureBake,
  type VizAudioFeatureBakeRequest,
} from '@viz-engine/bake';
import {
  VIZ_PROJECT_SCHEMA_VERSION,
  decodeVizUint8Base64,
  type VizProjectDocument,
} from '@viz-engine/contracts';
import {
  VIZ_AUDIO_ARTIFACT_CONTAINER_ENCODING,
  decodeVizAudioArtifactContainer,
  encodeVizAudioArtifactContainer,
  loadLocalVizProjectBundle,
  writeLocalVizProjectBundle,
} from '@viz-engine/project-bundle/node';
import {
  isVizAudioFeatureTimelineArtifact,
  sampleAudioFrameSnapshot,
} from '@viz-engine/runtime';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

const createArtifact = () => {
  const request: VizAudioFeatureBakeRequest = {
    kind: 'audio-feature-timeline',
    sourceAssetId: 'audio-main',
    sourceContentIdentity: 'sha256:audio-container-test',
    profile: 'standard',
    fps: 60,
    fftSize: 256,
  };
  const samples = new Float32Array(8_000);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] =
      Math.sin((2 * Math.PI * 110 * index) / 8_000) * 0.5 +
      Math.sin((2 * Math.PI * 440 * index) / 8_000) * 0.25;
  }
  const result = executeVizAudioFeatureBake(request, {
    sampleRate: 8_000,
    channels: [samples],
  });
  if (!result.ok) {
    throw new Error('Expected audio bake to succeed.');
  }
  return result;
};

describe('audio artifact encoded container', () => {
  it('preserves every scalar and packed value while reducing stored bytes', () => {
    const { artifact } = createArtifact();
    const encoded = encodeVizAudioArtifactContainer(artifact);
    const decoded = decodeVizAudioArtifactContainer(encoded);
    const legacyJsonByteLength = Buffer.byteLength(
      `${JSON.stringify(artifact, null, 2)}\n`,
    );
    const { packedFrames: artifactPackedFrames, ...artifactMetadata } =
      artifact;
    const { packedFrames: decodedPackedFrames, ...decodedMetadata } = decoded;

    expect(encoded.byteLength).toBeLessThan(legacyJsonByteLength * 0.8);
    expect(decodedMetadata).toEqual(artifactMetadata);
    expect(decodedPackedFrames).toMatchObject({
      frequency: {
        encoding: 'uint8-array',
        frameCount: artifactPackedFrames!.frequency.frameCount,
        valuesPerFrame: artifactPackedFrames!.frequency.valuesPerFrame,
      },
      timeDomain: {
        encoding: 'uint8-array',
        frameCount: artifactPackedFrames!.timeDomain.frameCount,
        valuesPerFrame: artifactPackedFrames!.timeDomain.valuesPerFrame,
      },
    });
    expect(decoded.packedFrames!.frequency.data).toEqual(
      decodeVizUint8Base64(artifact.packedFrames!.frequency.data as string),
    );
    expect(decoded.packedFrames!.timeDomain.data).toEqual(
      decodeVizUint8Base64(artifact.packedFrames!.timeDomain.data as string),
    );
    expect(isVizAudioFeatureTimelineArtifact(decoded)).toBe(true);
    expect(sampleAudioFrameSnapshot(decoded, 31)).toEqual(
      sampleAudioFrameSnapshot(artifact, 31),
    );
  });

  it('writes and reopens the versioned container through the canonical bundle boundary', () => {
    const { artifact, resolvedArtifact } = createArtifact();
    const bundleDirectory = mkdtempSync(join(tmpdir(), 'viz-audio-container-'));
    temporaryDirectories.push(bundleDirectory);
    const project: VizProjectDocument = {
      schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
      projectId: 'audio-container-project',
      name: 'Audio Container Project',
      timeline: {
        fps: artifact.frameAlignment.fps,
        durationInFrames: artifact.frameAlignment.frameCount,
      },
      viewport: { width: 320, height: 180 },
      layerOrder: [],
      layers: [],
      artifactRefs: [
        {
          id: artifact.id,
          kind: artifact.kind,
          label: artifact.label,
          sourceAssetId: artifact.sourceAssetId,
        },
      ],
    };

    const written = writeLocalVizProjectBundle({
      bundleDirectory,
      project,
      resolvedAssets: [],
      resolvedArtifacts: [resolvedArtifact],
      executionEnvironment: {
        runtime: {
          packageId: '@viz-engine/runtime',
          version: 'test',
        },
        components: [],
        nodePackages: [],
        renderer: {
          package: {
            packageId: '@viz-engine/renderer-three',
            version: 'test',
          },
          backend: {
            id: 'test',
            version: 'test',
          },
          programs: [],
        },
      },
    });
    expect(written.issues).toEqual([]);
    expect(written.manifest.artifactEntries).toEqual([
      {
        artifactId: artifact.id,
        kind: artifact.kind,
        path: `baked/${artifact.id}.vizaudio`,
        encoding: VIZ_AUDIO_ARTIFACT_CONTAINER_ENCODING,
      },
    ]);

    const reopened = loadLocalVizProjectBundle(bundleDirectory);
    expect(reopened.issues).toEqual([]);
    expect(reopened.executionManifest).toMatchObject({
      runtime: {
        packageId: '@viz-engine/runtime',
        version: 'test',
      },
      bakes: [
        {
          artifactId: artifact.id,
          executionIdentity: resolvedArtifact.metadata!.executionIdentity,
        },
      ],
    });
    const reopenedArtifact = reopened.resolvedArtifacts[0]!.payload;
    expect(isVizAudioFeatureTimelineArtifact(reopenedArtifact)).toBe(true);
    expect(
      sampleAudioFrameSnapshot(
        reopenedArtifact as typeof artifact,
        artifact.frameAlignment.frameCount - 1,
      ),
    ).toEqual(
      sampleAudioFrameSnapshot(
        artifact,
        artifact.frameAlignment.frameCount - 1,
      ),
    );
  });

  it('fails closed on a truncated container', () => {
    const encoded = encodeVizAudioArtifactContainer(createArtifact().artifact);
    expect(() =>
      decodeVizAudioArtifactContainer(encoded.subarray(0, encoded.length - 1)),
    ).toThrow('byte lengths do not match');
  });
});
