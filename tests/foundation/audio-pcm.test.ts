import {
  createVizAudioPcmIdentity,
  createVizAudioPcmIdentityAsync,
  encodeVizAudioPcmWav,
  sliceVizAudioPcm,
} from '@viz-engine/bake';
import { decodeVizAudioFileToPcm } from '@viz-engine/bake/node';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pcm = {
  sampleRate: 48000,
  channels: [
    new Float32Array([0, -0, 0.125, -0.75, 0.4]),
    new Float32Array([0.9, -0.1, 0.5, 0.25, -0.2]),
  ],
};

describe('canonical PCM identity and exact sample windows', () => {
  it('hashes explicit interleaved little-endian bits, preserving channel order and signed zero', async () => {
    const expectedBytes = Buffer.alloc(40);
    for (let frame = 0; frame < 5; frame += 1)
      for (let channel = 0; channel < 2; channel += 1)
        expectedBytes.writeFloatLE(
          pcm.channels[channel]![frame]!,
          (frame * 2 + channel) * 4,
        );
    const identity = createVizAudioPcmIdentity(pcm);
    expect(identity).toEqual({
      encoding: 'f32le-interleaved',
      sampleRate: 48000,
      channelCount: 2,
      sampleCount: 5,
      contentIdentity: `sha256:${createHash('sha256').update(expectedBytes).digest('hex')}`,
    });
    expect(await createVizAudioPcmIdentityAsync(pcm)).toEqual(identity);
    expect(
      createVizAudioPcmIdentity({
        ...pcm,
        channels: [...pcm.channels].reverse(),
      }).contentIdentity,
    ).not.toBe(identity.contentIdentity);
    const changed = structuredClone(pcm);
    changed.channels[0]![1] = 0;
    expect(createVizAudioPcmIdentity(changed).contentIdentity).not.toBe(
      identity.contentIdentity,
    );
  });

  it('copies exactly the half-open range without mutating or aliasing its source', () => {
    const before = structuredClone(pcm);
    const sliced = sliceVizAudioPcm(pcm, {
      startSample: 1,
      endSampleExclusive: 4,
    });
    expect(sliced.channels).toEqual(
      pcm.channels.map((channel) => channel.slice(1, 4)),
    );
    sliced.channels[0]![0] = 99;
    expect(pcm).toEqual(before);
  });

  it.each([
    [-1, 3],
    [0.1, 3],
    [2, 2],
    [4, 3],
    [0, 6],
    [0, Infinity],
  ])(
    'rejects rather than clamps invalid sample window [%s,%s)',
    (startSample, endSampleExclusive) => {
      expect(() =>
        sliceVizAudioPcm(pcm, { startSample, endSampleExclusive }),
      ).toThrow(expect.objectContaining({ code: 'invalid-sample-window' }));
    },
  );

  it('rejects malformed/nonfinite PCM and supports cooperative identity cancellation', async () => {
    expect(() =>
      createVizAudioPcmIdentity({ ...pcm, sampleRate: 48000.5 }),
    ).toThrow(expect.objectContaining({ code: 'invalid-pcm' }));
    expect(() =>
      encodeVizAudioPcmWav({ ...pcm, channels: [new Float32Array([NaN])] }),
    ).toThrow(expect.objectContaining({ code: 'invalid-pcm' }));
    let cancelled = false;
    await expect(
      createVizAudioPcmIdentityAsync(
        { sampleRate: 48000, channels: [new Float32Array(200000)] },
        {
          shouldCancel: () => cancelled,
          yieldToHost: async () => {
            cancelled = true;
          },
        },
      ),
    ).rejects.toMatchObject({ code: 'cancelled' });
  });

  it('writes deterministic lossless float WAV decoded independently by FFmpeg', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'viz-pcm-wav-'));
    try {
      const bytes = encodeVizAudioPcmWav(pcm);
      expect(encodeVizAudioPcmWav(pcm)).toEqual(bytes);
      const path = resolve(directory, 'audio.wav');
      writeFileSync(path, bytes);
      const decoded = await decodeVizAudioFileToPcm(path);
      expect(decoded.pcm).toEqual(pcm);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
