import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { link, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import {
  VizAudioPcmError,
  createVizAudioPcmIdentityAsync,
  encodeVizAudioPcmWav,
  sliceVizAudioPcm,
  type VizAudioPcmSource,
  type VizAudioSampleWindow,
} from './audio-pcm.js';
import type {
  VizAudioBakeSourceResolver,
  VizAudioFeatureBakeJobRequest,
} from './job-service.js';

const DEFAULT_MAX_DECODED_BYTES = 1024 * 1024 * 1024;
const MAX_DIAGNOSTIC_BYTES = 64 * 1024;

export type VizAudioDecodeErrorCode =
  | 'cancelled'
  | 'file-read-failed'
  | 'cleanup-failed'
  | 'probe-failed'
  | 'invalid-probe'
  | 'decoded-audio-too-large'
  | 'decode-failed'
  | 'invalid-decoded-pcm';

export class VizAudioDecodeError extends Error {
  readonly code: VizAudioDecodeErrorCode;

  constructor(code: VizAudioDecodeErrorCode, message: string) {
    super(message);
    this.name = 'VizAudioDecodeError';
    this.code = code;
  }
}

export interface DecodeVizAudioFileOptions {
  ffmpegPath?: string;
  ffprobePath?: string;
  maxDecodedBytes?: number;
  signal?: AbortSignal;
}

export interface DecodedVizAudioFile {
  filePath: string;
  sourceContentIdentity: string;
  pcm: VizAudioPcmSource;
  metadata: {
    durationSeconds?: number;
    sourceSampleRate: number;
    sourceChannelCount: number;
    decodedSampleRate: number;
    decodedChannelCount: 1 | 2;
    decodedSampleCount: number;
    decoderIdentity: string;
  };
}

interface ProcessResult {
  stdout: Buffer;
  stderr: string;
}

interface RunProcessOptions {
  maxStdoutBytes: number;
  signal?: AbortSignal;
}

const runProcess = (
  executable: string,
  args: readonly string[],
  options: RunProcessOptions,
): Promise<ProcessResult> =>
  new Promise((resolveProcess, rejectProcess) => {
    if (options.signal?.aborted) {
      rejectProcess(
        new VizAudioDecodeError('cancelled', 'Audio decode was cancelled.'),
      );
      return;
    }

    const child = spawn(executable, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutByteLength = 0;
    let stderrByteLength = 0;
    let terminalError: Error | undefined;
    let wasCancelled = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      child.kill('SIGTERM');
      killTimer ??= setTimeout(() => child.kill('SIGKILL'), 1000);
    };

    const onAbort = (): void => {
      wasCancelled = true;
      stop();
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });

    child.stdout.on('data', (chunk: Buffer) => {
      if (terminalError) {
        return;
      }
      stdoutByteLength += chunk.length;
      if (stdoutByteLength > options.maxStdoutBytes) {
        terminalError = new VizAudioDecodeError(
          'decoded-audio-too-large',
          `Process output exceeded the ${options.maxStdoutBytes}-byte safety limit.`,
        );
        stop();
        return;
      }
      stdoutChunks.push(chunk);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      if (stderrByteLength >= MAX_DIAGNOSTIC_BYTES) {
        return;
      }
      const remaining = MAX_DIAGNOSTIC_BYTES - stderrByteLength;
      const accepted =
        chunk.length <= remaining ? chunk : chunk.subarray(0, remaining);
      stderrChunks.push(accepted);
      stderrByteLength += accepted.length;
    });

    child.once('error', (error) => {
      terminalError = error;
    });

    child.once('close', (exitCode, signal) => {
      if (killTimer) clearTimeout(killTimer);
      options.signal?.removeEventListener('abort', onAbort);
      if (wasCancelled) {
        rejectProcess(
          new VizAudioDecodeError('cancelled', 'Audio decode was cancelled.'),
        );
        return;
      }
      if (terminalError) {
        rejectProcess(terminalError);
        return;
      }

      const stderr = Buffer.concat(stderrChunks, stderrByteLength).toString(
        'utf8',
      );
      if (exitCode !== 0) {
        rejectProcess(
          new Error(
            `${executable} exited with code ${String(exitCode)}${
              signal ? ` (${signal})` : ''
            }: ${stderr.trim() || 'no diagnostic output'}`,
          ),
        );
        return;
      }
      resolveProcess({
        stdout: Buffer.concat(stdoutChunks, stdoutByteLength),
        stderr,
      });
    });
  });

const hashFile = async (
  filePath: string,
  signal?: AbortSignal,
): Promise<string> =>
  new Promise((resolveHash, rejectHash) => {
    if (signal?.aborted) {
      rejectHash(
        new VizAudioDecodeError('cancelled', 'Audio decode was cancelled.'),
      );
      return;
    }
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    const onAbort = (): void => {
      stream.destroy(
        new VizAudioDecodeError('cancelled', 'Audio decode was cancelled.'),
      );
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    stream.on('data', (chunk) => {
      hash.update(chunk);
    });
    stream.once('error', (error) => {
      signal?.removeEventListener('abort', onAbort);
      rejectHash(
        error instanceof VizAudioDecodeError
          ? error
          : new VizAudioDecodeError(
              'file-read-failed',
              `Could not read audio file "${filePath}": ${error.message}`,
            ),
      );
    });
    stream.once('end', () => {
      signal?.removeEventListener('abort', onAbort);
      resolveHash(`sha256:${hash.digest('hex')}`);
    });
  });

interface AudioProbe {
  sampleRate: number;
  channelCount: number;
  durationSeconds?: number;
}

const parsePositiveNumber = (value: unknown): number | undefined => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const probeAudioFile = async (
  filePath: string,
  ffprobePath: string,
  signal?: AbortSignal,
): Promise<AudioProbe> => {
  let result: ProcessResult;
  try {
    result = await runProcess(
      ffprobePath,
      [
        '-v',
        'error',
        '-select_streams',
        'a:0',
        '-show_entries',
        'stream=sample_rate,channels:format=duration',
        '-of',
        'json',
        filePath,
      ],
      {
        maxStdoutBytes: 1024 * 1024,
        ...(signal === undefined ? {} : { signal }),
      },
    );
  } catch (error) {
    if (error instanceof VizAudioDecodeError) {
      throw error;
    }
    throw new VizAudioDecodeError(
      'probe-failed',
      error instanceof Error
        ? error.message
        : `Could not probe audio file "${filePath}".`,
    );
  }

  try {
    const parsed = JSON.parse(result.stdout.toString('utf8')) as {
      streams?: Array<{ sample_rate?: unknown; channels?: unknown }>;
      format?: { duration?: unknown };
    };
    const stream = parsed.streams?.[0];
    const sampleRate = parsePositiveNumber(stream?.sample_rate);
    const channelCount = parsePositiveNumber(stream?.channels);
    if (
      sampleRate === undefined ||
      !Number.isInteger(sampleRate) ||
      channelCount === undefined ||
      !Number.isInteger(channelCount)
    ) {
      throw new Error(
        'probe omitted a valid audio sample rate or channel count',
      );
    }
    const durationSeconds = parsePositiveNumber(parsed.format?.duration);
    return {
      sampleRate,
      channelCount,
      ...(durationSeconds === undefined ? {} : { durationSeconds }),
    };
  } catch (error) {
    throw new VizAudioDecodeError(
      'invalid-probe',
      `Invalid FFprobe result for "${filePath}": ${
        error instanceof Error ? error.message : 'unknown parse failure'
      }.`,
    );
  }
};

const deinterleaveFloat32 = (
  bytes: Buffer,
  channelCount: 1 | 2,
): readonly Float32Array[] => {
  const bytesPerSampleFrame = channelCount * Float32Array.BYTES_PER_ELEMENT;
  if (bytes.length % bytesPerSampleFrame !== 0) {
    throw new VizAudioDecodeError(
      'invalid-decoded-pcm',
      `Decoded PCM byte length ${bytes.length} is not aligned to ${channelCount} channel(s).`,
    );
  }
  const sampleCount = bytes.length / bytesPerSampleFrame;
  const channels = Array.from(
    { length: channelCount },
    () => new Float32Array(sampleCount),
  );
  for (let sample = 0; sample < sampleCount; sample += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      channels[channel]![sample] = bytes.readFloatLE(
        (sample * channelCount + channel) * Float32Array.BYTES_PER_ELEMENT,
      );
    }
  }
  return channels;
};

const decodeOwnedAudioFileToPcm = async (
  inputFilePath: string,
  options: DecodeVizAudioFileOptions = {},
): Promise<DecodedVizAudioFile> => {
  const filePath = inputFilePath.startsWith('file:')
    ? fileURLToPath(inputFilePath)
    : resolve(inputFilePath);
  const maxDecodedBytes = options.maxDecodedBytes ?? DEFAULT_MAX_DECODED_BYTES;
  if (!Number.isSafeInteger(maxDecodedBytes) || maxDecodedBytes <= 0) {
    throw new VizAudioDecodeError(
      'decoded-audio-too-large',
      'maxDecodedBytes must be a positive safe integer.',
    );
  }

  const sourceContentIdentity = await hashFile(filePath, options.signal);
  const probe = await probeAudioFile(
    filePath,
    options.ffprobePath ?? 'ffprobe',
    options.signal,
  );
  const decodedChannelCount: 1 | 2 = probe.channelCount === 1 ? 1 : 2;
  const estimatedDecodedBytes =
    probe.durationSeconds === undefined
      ? undefined
      : Math.ceil(
          probe.durationSeconds *
            probe.sampleRate *
            decodedChannelCount *
            Float32Array.BYTES_PER_ELEMENT,
        );
  if (
    estimatedDecodedBytes !== undefined &&
    estimatedDecodedBytes > maxDecodedBytes
  ) {
    throw new VizAudioDecodeError(
      'decoded-audio-too-large',
      `Estimated decoded PCM size ${estimatedDecodedBytes} exceeds the ${maxDecodedBytes}-byte safety limit.`,
    );
  }

  let decoded: ProcessResult;
  let decoderIdentity: string;
  try {
    const version = await runProcess(
      options.ffmpegPath ?? 'ffmpeg',
      ['-version'],
      {
        maxStdoutBytes: MAX_DIAGNOSTIC_BYTES,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    decoderIdentity = `ffmpeg-f32le:${version.stdout.toString('utf8').split('\n')[0]!.trim()}`;
    decoded = await runProcess(
      options.ffmpegPath ?? 'ffmpeg',
      [
        '-v',
        'error',
        '-i',
        filePath,
        '-map',
        '0:a:0',
        '-vn',
        '-sn',
        '-dn',
        '-ac',
        String(decodedChannelCount),
        '-ar',
        String(probe.sampleRate),
        '-f',
        'f32le',
        '-acodec',
        'pcm_f32le',
        'pipe:1',
      ],
      {
        maxStdoutBytes: maxDecodedBytes,
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      },
    );
  } catch (error) {
    if (error instanceof VizAudioDecodeError) {
      throw error;
    }
    throw new VizAudioDecodeError(
      'decode-failed',
      error instanceof Error
        ? error.message
        : `Could not decode audio file "${filePath}".`,
    );
  }

  const channels = deinterleaveFloat32(decoded.stdout, decodedChannelCount);
  return {
    filePath,
    sourceContentIdentity,
    pcm: {
      sampleRate: probe.sampleRate,
      channels,
    },
    metadata: {
      ...(probe.durationSeconds === undefined
        ? {}
        : { durationSeconds: probe.durationSeconds }),
      sourceSampleRate: probe.sampleRate,
      sourceChannelCount: probe.channelCount,
      decodedSampleRate: probe.sampleRate,
      decodedChannelCount,
      decodedSampleCount: channels[0]?.length ?? 0,
      decoderIdentity,
    },
  };
};

/** Hash, probe and decode the same private byte snapshot, even if the caller replaces its source. */
export const decodeVizAudioFileToPcm = async (
  inputFilePath: string,
  requestedOptions: DecodeVizAudioFileOptions = {},
): Promise<DecodedVizAudioFile> => {
  const options = { ...requestedOptions };
  const filePath = inputFilePath.startsWith('file:')
    ? fileURLToPath(inputFilePath)
    : resolve(inputFilePath);
  if (options.signal?.aborted)
    throw new VizAudioDecodeError('cancelled', 'Audio decode was cancelled.');
  let workspace: string;
  try {
    workspace = await mkdtemp(resolve(tmpdir(), 'viz-audio-decode-'));
  } catch (error) {
    throw new VizAudioDecodeError('file-read-failed', String(error));
  }
  let result: DecodedVizAudioFile | undefined;
  let failure: unknown;
  try {
    const snapshot = resolve(workspace, 'source');
    try {
      await pipeline(
        createReadStream(filePath),
        createWriteStream(snapshot, { flags: 'wx' }),
        ...(options.signal ? [{ signal: options.signal }] : []),
      );
    } catch (error) {
      throw new VizAudioDecodeError(
        options.signal?.aborted ? 'cancelled' : 'file-read-failed',
        String(error),
      );
    }
    result = {
      ...(await decodeOwnedAudioFileToPcm(snapshot, options)),
      filePath,
    };
  } catch (error) {
    failure = error;
  }
  try {
    await rm(workspace, { recursive: true, force: true });
  } catch (error) {
    throw new VizAudioDecodeError(
      'cleanup-failed',
      [failure, error].filter(Boolean).map(String).join('; '),
    );
  }
  if (failure) throw failure;
  if (options.signal?.aborted)
    throw new VizAudioDecodeError('cancelled', 'Audio decode was cancelled.');
  return result!;
};

export interface CreateVizNodeAudioBakeSourceResolverOptions {
  resolveFilePath(
    request: VizAudioFeatureBakeJobRequest,
  ): string | Promise<string>;
  decodeOptions?: Omit<DecodeVizAudioFileOptions, 'signal'>;
}

export const createVizNodeAudioBakeSourceResolver = ({
  resolveFilePath,
  decodeOptions = {},
}: CreateVizNodeAudioBakeSourceResolverOptions): VizAudioBakeSourceResolver => ({
  async resolve(request, signal) {
    const filePath = await resolveFilePath(request);
    const decoded = await decodeVizAudioFileToPcm(filePath, {
      ...decodeOptions,
      signal,
    });
    return {
      pcm: decoded.pcm,
      sourceContentIdentity: decoded.sourceContentIdentity,
      decoderIdentity: decoded.metadata.decoderIdentity,
    };
  },
});

export class VizAudioDerivationError extends Error {
  constructor(
    readonly code:
      | 'source-identity-mismatch'
      | 'pcm-identity-mismatch'
      | 'output-write-failed',
    message: string,
  ) {
    super(message);
    this.name = 'VizAudioDerivationError';
  }
}

export interface DeriveVizAudioFileWindowOptions {
  sourcePath: string;
  outputPath: string;
  window: VizAudioSampleWindow;
  expectedSourceContentIdentity?: string;
  expectedPcm?: {
    contentIdentity: string;
    sampleRate: number;
    channelCount: number;
  };
  signal?: AbortSignal;
  decodeOptions?: Omit<DecodeVizAudioFileOptions, 'signal'>;
  onProgress?: (progress: {
    stage: 'decoding' | 'deriving' | 'writing';
    completed: number;
    total: number;
  }) => void;
}

/** An exclusive output publication; cancellation never replaces an existing file. */
export const deriveVizAudioFileWindow = async (
  requestedOptions: DeriveVizAudioFileWindowOptions,
) => {
  const options = {
    ...requestedOptions,
    window: { ...requestedOptions.window },
    ...(requestedOptions.expectedPcm
      ? { expectedPcm: { ...requestedOptions.expectedPcm } }
      : {}),
    ...(requestedOptions.decodeOptions
      ? { decodeOptions: { ...requestedOptions.decodeOptions } }
      : {}),
  };
  const cancelled = () => {
    if (options.signal?.aborted)
      throw new VizAudioPcmError('cancelled', 'Audio derivation cancelled.');
  };
  cancelled();
  options.onProgress?.({ stage: 'decoding', completed: 0, total: 1 });
  const decoded = await decodeVizAudioFileToPcm(options.sourcePath, {
    ...options.decodeOptions,
    ...(options.signal ? { signal: options.signal } : {}),
  });
  cancelled();
  if (
    options.expectedSourceContentIdentity !== undefined &&
    decoded.sourceContentIdentity !== options.expectedSourceContentIdentity
  )
    throw new VizAudioDerivationError(
      'source-identity-mismatch',
      'Decoded audio file differs from the expected source identity.',
    );
  const sourcePcm = await createVizAudioPcmIdentityAsync(decoded.pcm, {
    shouldCancel: () => options.signal?.aborted ?? false,
  });
  if (
    options.expectedPcm &&
    (sourcePcm.contentIdentity !== options.expectedPcm.contentIdentity ||
      sourcePcm.sampleRate !== options.expectedPcm.sampleRate ||
      sourcePcm.channelCount !== options.expectedPcm.channelCount)
  )
    throw new VizAudioDerivationError(
      'pcm-identity-mismatch',
      'Decoded PCM differs from the expected sample identity, rate or channel layout.',
    );
  options.onProgress?.({ stage: 'decoding', completed: 1, total: 1 });
  cancelled();
  options.onProgress?.({ stage: 'deriving', completed: 0, total: 1 });
  const pcm = sliceVizAudioPcm(decoded.pcm, options.window);
  const pcmIdentity = await createVizAudioPcmIdentityAsync(pcm, {
    shouldCancel: () => options.signal?.aborted ?? false,
  });
  const bytes = encodeVizAudioPcmWav(
    pcm,
    () => options.signal?.aborted ?? false,
  );
  const contentIdentity = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  options.onProgress?.({ stage: 'deriving', completed: 1, total: 1 });
  cancelled();
  const outputPath = resolve(options.outputPath);
  const temporaryPath = `${outputPath}.partial-${randomUUID()}`;
  let published = false;
  let failure: unknown;
  try {
    await mkdir(dirname(outputPath), { recursive: true });
    options.onProgress?.({
      stage: 'writing',
      completed: 0,
      total: bytes.length,
    });
    cancelled();
    await writeFile(temporaryPath, bytes, {
      flag: 'wx',
      ...(options.signal ? { signal: options.signal } : {}),
    });
    cancelled();
    await link(temporaryPath, outputPath);
    published = true;
    cancelled();
    options.onProgress?.({
      stage: 'writing',
      completed: bytes.length,
      total: bytes.length,
    });
    cancelled();
  } catch (error) {
    failure = error;
  }
  const cleanupErrors: unknown[] = [];
  try {
    await rm(temporaryPath, { force: true });
  } catch (error) {
    cleanupErrors.push(error);
  }
  if (failure || cleanupErrors.length || options.signal?.aborted) {
    if (published) {
      try {
        await rm(outputPath, { force: true });
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length)
      throw new VizAudioDerivationError(
        'output-write-failed',
        [failure, ...cleanupErrors].filter(Boolean).map(String).join('; '),
      );
    cancelled();
    if (failure instanceof VizAudioPcmError) throw failure;
    throw new VizAudioDerivationError('output-write-failed', String(failure));
  }
  return {
    version: 'viz-bake.audio-window.f32-wav.v1',
    source: {
      contentIdentity: decoded.sourceContentIdentity,
      pcmIdentity: sourcePcm,
      decoderIdentity: decoded.metadata.decoderIdentity,
    },
    window: { ...options.window },
    derivative: {
      path: outputPath,
      contentIdentity,
      pcmIdentity,
      byteLength: bytes.length,
      mimeType: 'audio/wav',
    },
  };
};
