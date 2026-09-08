import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

export interface VizAudioPcmSource {
  sampleRate: number;
  channels: readonly Float32Array[];
}

export interface VizAudioSampleWindow {
  startSample: number;
  endSampleExclusive: number;
}

export class VizAudioPcmError extends Error {
  constructor(
    readonly code: 'invalid-pcm' | 'invalid-sample-window' | 'cancelled',
    message: string,
  ) {
    super(message);
    this.name = 'VizAudioPcmError';
  }
}

export const validateVizAudioPcmShape = (pcm: VizAudioPcmSource): number => {
  const sampleCount = pcm.channels[0]?.length ?? 0;
  if (
    !Number.isSafeInteger(pcm.sampleRate) ||
    pcm.sampleRate <= 0 ||
    (pcm.channels.length !== 1 && pcm.channels.length !== 2) ||
    sampleCount === 0 ||
    pcm.channels.some(
      (channel) =>
        !(channel instanceof Float32Array) || channel.length !== sampleCount,
    )
  ) {
    throw new VizAudioPcmError(
      'invalid-pcm',
      'PCM requires a positive integer sample rate and one or two nonempty, equal-length Float32 channels.',
    );
  }
  return sampleCount;
};

function* interleavedBlocks(
  pcm: VizAudioPcmSource,
  shouldCancel?: () => boolean,
) {
  const sampleCount = validateVizAudioPcmShape(pcm);
  for (let start = 0; start < sampleCount; start += 16384) {
    if (shouldCancel?.())
      throw new VizAudioPcmError('cancelled', 'PCM operation cancelled.');
    const count = Math.min(16384, sampleCount - start);
    const bytes = new Uint8Array(count * pcm.channels.length * 4);
    const view = new DataView(bytes.buffer);
    let offset = 0;
    for (let frame = 0; frame < count; frame += 1) {
      for (const channel of pcm.channels) {
        const sample = channel[start + frame]!;
        if (!Number.isFinite(sample))
          throw new VizAudioPcmError(
            'invalid-pcm',
            'PCM samples must be finite.',
          );
        view.setFloat32(offset, sample, true);
        offset += 4;
      }
    }
    yield { bytes, start };
  }
}

const pcmIdentity = (pcm: VizAudioPcmSource, digest: Uint8Array) => ({
  encoding: 'f32le-interleaved' as const,
  contentIdentity: `sha256:${bytesToHex(digest)}`,
  sampleRate: pcm.sampleRate,
  channelCount: pcm.channels.length,
  sampleCount: pcm.channels[0]!.length,
});

export const createVizAudioPcmIdentityAsync = async (
  pcm: VizAudioPcmSource,
  options: {
    shouldCancel?: () => boolean;
    yieldToHost?: () => Promise<void>;
  } = {},
) => {
  const hash = sha256.create();
  let blocks = 0;
  for (const { bytes } of interleavedBlocks(pcm, options.shouldCancel)) {
    hash.update(bytes);
    blocks += 1;
    if (blocks % 8 === 0)
      await (options.yieldToHost?.() ??
        new Promise<void>((resolve) => setTimeout(resolve, 0)));
  }
  if (options.shouldCancel?.())
    throw new VizAudioPcmError('cancelled', 'PCM operation cancelled.');
  return pcmIdentity(pcm, hash.digest());
};

/** Sample-major/channel-interleaved f32le, independent of host endianness. */
export const createVizAudioPcmIdentity = (
  pcm: VizAudioPcmSource,
  shouldCancel?: () => boolean,
) => {
  const hash = sha256.create();
  for (const { bytes } of interleavedBlocks(pcm, shouldCancel))
    hash.update(bytes);
  return pcmIdentity(pcm, hash.digest());
};

export const validateVizAudioSampleWindow = (
  pcm: VizAudioPcmSource,
  window: VizAudioSampleWindow,
): void => {
  const count = validateVizAudioPcmShape(pcm);
  if (
    !Number.isSafeInteger(window.startSample) ||
    !Number.isSafeInteger(window.endSampleExclusive) ||
    window.startSample < 0 ||
    window.endSampleExclusive <= window.startSample ||
    window.endSampleExclusive > count
  ) {
    throw new VizAudioPcmError(
      'invalid-sample-window',
      `Sample window [${window.startSample},${window.endSampleExclusive}) must be a nonempty integer interval within [0,${count}).`,
    );
  }
};

export const sliceVizAudioPcm = (
  pcm: VizAudioPcmSource,
  window: VizAudioSampleWindow,
): VizAudioPcmSource => {
  validateVizAudioSampleWindow(pcm, window);
  return {
    sampleRate: pcm.sampleRate,
    channels: pcm.channels.map((channel) =>
      channel.slice(window.startSample, window.endSampleExclusive),
    ),
  };
};

/** IEEE float WAVEFORMATEX (cbSize=0), fact sample count, and exact RIFF sizes. */
export const encodeVizAudioPcmWav = (
  pcm: VizAudioPcmSource,
  shouldCancel?: () => boolean,
): Uint8Array => {
  const count = validateVizAudioPcmShape(pcm);
  const blockAlign = pcm.channels.length * 4;
  const dataSize = count * blockAlign;
  if (dataSize + 50 > 0xffffffff || pcm.sampleRate * blockAlign > 0xffffffff)
    throw new VizAudioPcmError(
      'invalid-pcm',
      'PCM exceeds RIFF/WAVE size limits.',
    );
  const bytes = new Uint8Array(58 + dataSize);
  const view = new DataView(bytes.buffer);
  const fourcc = (offset: number, value: string) =>
    bytes.set(new TextEncoder().encode(value), offset);
  fourcc(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  fourcc(8, 'WAVE');
  fourcc(12, 'fmt ');
  view.setUint32(16, 18, true);
  view.setUint16(20, 3, true);
  view.setUint16(22, pcm.channels.length, true);
  view.setUint32(24, pcm.sampleRate, true);
  view.setUint32(28, pcm.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 32, true);
  view.setUint16(36, 0, true);
  fourcc(38, 'fact');
  view.setUint32(42, 4, true);
  view.setUint32(46, count, true);
  fourcc(50, 'data');
  view.setUint32(54, dataSize, true);
  for (const { bytes: block, start } of interleavedBlocks(pcm, shouldCancel))
    bytes.set(block, 58 + start * blockAlign);
  return bytes;
};
