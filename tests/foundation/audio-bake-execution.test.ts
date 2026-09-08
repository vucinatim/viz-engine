import {
  VIZ_AUDIO_FEATURE_BAKE_VERSION,
  executeVizAudioFeatureBake,
  executeVizAudioFeatureBakeAsync,
  type VizAudioFeatureBakeRequest,
} from '@viz-engine/bake';
import {
  decodeVizUint8Base64,
  encodeVizUint8Base64,
} from '@viz-engine/contracts';
import {
  getAudioFeatureTimelineArtifact,
  isVizAudioFeatureTimelineArtifact,
  sampleAudioFeatureValue,
  sampleAudioFrameSnapshot,
} from '@viz-engine/runtime';
import { describe, expect, it } from 'vitest';

const request: VizAudioFeatureBakeRequest = {
  kind: 'audio-feature-timeline',
  sourceAssetId: 'audio-main',
  sourceContentIdentity: 'sha256:test-audio',
  profile: 'standard',
  fps: 10,
  fftSize: 256,
};

const createPulseSignal = (): Float32Array => {
  const signal = new Float32Array(4_000);
  for (let index = 0; index < signal.length; index += 1) {
    signal[index] = Math.sin((2 * Math.PI * 110 * index) / 8_000) * 0.5;
  }
  signal[2_000] = 1;
  return signal;
};

describe('canonical audio bake execution', () => {
  it('round-trips portable packed bytes exactly', () => {
    const values = new Uint8Array([0, 1, 2, 3, 127, 128, 254, 255]);
    const encoded = encodeVizUint8Base64(values);

    expect(encoded).toBe('AAECA3+A/v8=');
    expect(decodeVizUint8Base64(encoded)).toEqual(values);
    expect(decodeVizUint8Base64('')).toEqual(new Uint8Array());
    expect(() => decodeVizUint8Base64('not canonical')).toThrow(
      'Invalid canonical uint8 base64 payload.',
    );
  });

  it('produces deterministic, identity-bearing scalar and packed artifacts', () => {
    const pcm = {
      sampleRate: 8_000,
      channels: [createPulseSignal()],
    };
    const first = executeVizAudioFeatureBake(request, pcm);
    const second = executeVizAudioFeatureBake(request, pcm);

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    if (!first.ok) {
      throw new Error('Expected bake to succeed.');
    }

    expect(first.executionIdentity).toContain(VIZ_AUDIO_FEATURE_BAKE_VERSION);
    expect(first.artifact).toMatchObject({
      schemaVersion: 1,
      sourceAssetId: 'audio-main',
      profile: 'standard',
      frameAlignment: {
        fps: 10,
        frameCount: 5,
        alignment: 'frame-centered',
      },
      analysis: {
        sourceContentIdentity: 'sha256:test-audio',
        sampleRate: 8_000,
        channelCount: 1,
        fftSize: 256,
      },
    });
    expect(first.artifact.featureSeries.map(({ name }) => name)).toEqual([
      'rms',
      'loudness',
      'bass-energy',
      'mid-energy',
      'treble-energy',
      'spectral-centroid',
      'spectral-flux',
      'onset-strength',
      'waveform-peak',
    ]);
    expect(first.metrics).toEqual({
      frameCount: 5,
      featureCount: 9,
      packedByteLength: 5 * (128 + 256),
    });
    expect(isVizAudioFeatureTimelineArtifact(first.artifact)).toBe(true);
    expect(getAudioFeatureTimelineArtifact(first.resolvedArtifact)).toBe(
      first.artifact,
    );

    const corrupted = structuredClone(first.artifact);
    corrupted.packedFrames!.frequency.data = 'not-base64';
    expect(isVizAudioFeatureTimelineArtifact(corrupted)).toBe(false);

    const semanticallyCompressed = structuredClone(first.artifact);
    semanticallyCompressed.packedFrames!.frequency.valuesPerFrame = 16;
    semanticallyCompressed.packedFrames!.frequency.data = encodeVizUint8Base64(
      new Uint8Array(5 * 16),
    );
    expect(isVizAudioFeatureTimelineArtifact(semanticallyCompressed)).toBe(
      false,
    );
  });

  it('samples scalar and packed frames against the runtime FPS', () => {
    const result = executeVizAudioFeatureBake(request, {
      sampleRate: 8_000,
      channels: [createPulseSignal()],
    });
    if (!result.ok) {
      throw new Error('Expected bake to succeed.');
    }

    const artifact = result.artifact;
    const firstAtDoubleRuntimeFps = sampleAudioFrameSnapshot(artifact, 0, 20);
    const secondAtDoubleRuntimeFps = sampleAudioFrameSnapshot(artifact, 2, 20);

    expect(firstAtDoubleRuntimeFps).toMatchObject({
      sampleRate: 8_000,
      fftSize: 256,
      sourceAssetId: 'audio-main',
      artifactId: artifact.id,
      artifactFrame: 0,
      provenance: 'baked',
    });
    expect(firstAtDoubleRuntimeFps?.frequencyData).toHaveLength(128);
    expect(firstAtDoubleRuntimeFps?.timeDomainData).toHaveLength(256);
    expect(secondAtDoubleRuntimeFps?.artifactFrame).toBe(1);
    expect(sampleAudioFeatureValue(artifact, 'rms', 2, 20)).toBe(
      artifact.featureSeries[0]?.values[1],
    );
  });

  it('supports cancellation and rejects unsupported or ambiguous input', () => {
    let progressCalls = 0;
    const cancelled = executeVizAudioFeatureBake(
      request,
      {
        sampleRate: 8_000,
        channels: [createPulseSignal()],
      },
      {
        shouldCancel: () => progressCalls >= 2,
        onProgress: () => {
          progressCalls += 1;
        },
      },
    );
    expect(cancelled).toMatchObject({
      ok: false,
      status: 'cancelled',
      issues: [{ code: 'cancelled' }],
    });

    const invalid = executeVizAudioFeatureBake(
      {
        ...request,
        profile: 'extended',
        sourceWindow: { startSeconds: -1 },
      },
      {
        sampleRate: 8_000,
        channels: [
          createPulseSignal(),
          createPulseSignal(),
          createPulseSignal(),
        ],
      },
    );
    expect(invalid).toMatchObject({
      ok: false,
      status: 'failed',
    });
    if (invalid.ok) {
      throw new Error('Expected invalid bake to fail.');
    }
    expect(invalid.issues.map(({ code }) => code)).toEqual([
      'unsupported-profile',
      'invalid-pcm',
      'invalid-request',
    ]);
  });

  it('keeps cooperative async bake output identical and yields cancellation', async () => {
    const pcm = {
      sampleRate: 8_000,
      channels: [createPulseSignal()],
    };
    const expected = executeVizAudioFeatureBake(request, pcm);
    let yields = 0;
    const actual = await executeVizAudioFeatureBakeAsync(request, pcm, {
      yieldEveryFrames: 2,
      yieldToHost: async () => {
        yields += 1;
      },
    });

    expect(actual).toEqual(expected);
    expect(yields).toBe(2);

    let cancel = false;
    const cancelled = await executeVizAudioFeatureBakeAsync(request, pcm, {
      yieldEveryFrames: 2,
      shouldCancel: () => cancel,
      yieldToHost: async () => {
        cancel = true;
      },
    });
    expect(cancelled).toMatchObject({
      ok: false,
      status: 'cancelled',
      issues: [{ code: 'cancelled' }],
    });
  });
  it('binds actual PCM and decoder provenance instead of trusting equal file labels', () => {
    const pcm = { sampleRate: 8000, channels: [createPulseSignal()] };
    const first = executeVizAudioFeatureBake(
      { ...request, decoderIdentity: 'decoder-a' },
      pcm,
    );
    pcm.channels[0]![100] = 0.75;
    const changed = executeVizAudioFeatureBake(
      { ...request, decoderIdentity: 'decoder-a' },
      pcm,
    );
    const otherDecoder = executeVizAudioFeatureBake(
      { ...request, decoderIdentity: 'decoder-b' },
      pcm,
    );
    expect(first.ok && changed.ok && otherDecoder.ok).toBe(true);
    if (!first.ok || !changed.ok || !otherDecoder.ok)
      throw new Error('Expected successful identity probes.');
    expect(first.executionIdentity).not.toBe(changed.executionIdentity);
    expect(changed.executionIdentity).not.toBe(otherDecoder.executionIdentity);
    expect(changed.artifact.metadata).toMatchObject({
      executionDescriptor: {
        decoderIdentity: 'decoder-a',
        decodedPcm: { sampleRate: 8000, channelCount: 1, sampleCount: 4000 },
      },
    });
  });

  it('rejects source windows extending outside PCM instead of silently truncating', () => {
    const result = executeVizAudioFeatureBake(
      {
        ...request,
        sourceWindow: { startSeconds: 0.25, durationSeconds: 0.5 },
      },
      { sampleRate: 8000, channels: [createPulseSignal()] },
    );
    expect(result).toMatchObject({
      ok: false,
      status: 'failed',
      issues: [{ code: 'invalid-request' }],
    });
  });

  it('decodes production-sized canonical base64 without a recursive expression and rejects malformed padding', () => {
    const source = Uint8Array.from(
      { length: 8 * 1024 * 1024 },
      (_, i) => i % 251,
    );
    expect(
      Buffer.compare(
        Buffer.from(
          decodeVizUint8Base64(Buffer.from(source).toString('base64')),
        ),
        Buffer.from(source),
      ),
    ).toBe(0);
    for (const invalid of [
      '=AAA',
      'AA=A',
      'AA==AAAA',
      'AB==',
      'AAB=',
      'AAA?',
      'AA\n=',
    ])
      expect(() => decodeVizUint8Base64(invalid)).toThrow('Invalid canonical');
  });
});
