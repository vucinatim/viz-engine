import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { VizAudioPcmSource } from "./audio-feature-bake.js";
import type {
  VizAudioBakeSourceResolver,
  VizAudioFeatureBakeJobRequest,
} from "./job-service.js";

const DEFAULT_MAX_DECODED_BYTES = 1024 * 1024 * 1024;
const MAX_DIAGNOSTIC_BYTES = 64 * 1024;

export type VizAudioDecodeErrorCode =
  | "cancelled"
  | "file-read-failed"
  | "probe-failed"
  | "invalid-probe"
  | "decoded-audio-too-large"
  | "decode-failed"
  | "invalid-decoded-pcm";

export class VizAudioDecodeError extends Error {
  readonly code: VizAudioDecodeErrorCode;

  constructor(code: VizAudioDecodeErrorCode, message: string) {
    super(message);
    this.name = "VizAudioDecodeError";
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
        new VizAudioDecodeError("cancelled", "Audio decode was cancelled."),
      );
      return;
    }

    const child = spawn(executable, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutByteLength = 0;
    let stderrByteLength = 0;
    let terminalError: Error | undefined;
    let wasCancelled = false;

    const onAbort = (): void => {
      wasCancelled = true;
      child.kill("SIGTERM");
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout.on("data", (chunk: Buffer) => {
      if (terminalError) {
        return;
      }
      stdoutByteLength += chunk.length;
      if (stdoutByteLength > options.maxStdoutBytes) {
        terminalError = new VizAudioDecodeError(
          "decoded-audio-too-large",
          `Process output exceeded the ${options.maxStdoutBytes}-byte safety limit.`,
        );
        child.kill("SIGTERM");
        return;
      }
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderrByteLength >= MAX_DIAGNOSTIC_BYTES) {
        return;
      }
      const remaining = MAX_DIAGNOSTIC_BYTES - stderrByteLength;
      const accepted =
        chunk.length <= remaining ? chunk : chunk.subarray(0, remaining);
      stderrChunks.push(accepted);
      stderrByteLength += accepted.length;
    });

    child.once("error", (error) => {
      terminalError = error;
    });

    child.once("close", (exitCode, signal) => {
      options.signal?.removeEventListener("abort", onAbort);
      if (wasCancelled) {
        rejectProcess(
          new VizAudioDecodeError(
            "cancelled",
            "Audio decode was cancelled.",
          ),
        );
        return;
      }
      if (terminalError) {
        rejectProcess(terminalError);
        return;
      }

      const stderr = Buffer.concat(
        stderrChunks,
        stderrByteLength,
      ).toString("utf8");
      if (exitCode !== 0) {
        rejectProcess(
          new Error(
            `${executable} exited with code ${String(exitCode)}${
              signal ? ` (${signal})` : ""
            }: ${stderr.trim() || "no diagnostic output"}`,
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
        new VizAudioDecodeError("cancelled", "Audio decode was cancelled."),
      );
      return;
    }
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    const onAbort = (): void => {
      stream.destroy(
        new VizAudioDecodeError("cancelled", "Audio decode was cancelled."),
      );
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    stream.on("data", (chunk) => {
      hash.update(chunk);
    });
    stream.once("error", (error) => {
      signal?.removeEventListener("abort", onAbort);
      rejectHash(
        error instanceof VizAudioDecodeError
          ? error
          : new VizAudioDecodeError(
              "file-read-failed",
              `Could not read audio file "${filePath}": ${error.message}`,
            ),
      );
    });
    stream.once("end", () => {
      signal?.removeEventListener("abort", onAbort);
      resolveHash(`sha256:${hash.digest("hex")}`);
    });
  });

interface AudioProbe {
  sampleRate: number;
  channelCount: number;
  durationSeconds?: number;
}

const parsePositiveNumber = (value: unknown): number | undefined => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
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
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=sample_rate,channels:format=duration",
        "-of",
        "json",
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
      "probe-failed",
      error instanceof Error
        ? error.message
        : `Could not probe audio file "${filePath}".`,
    );
  }

  try {
    const parsed = JSON.parse(result.stdout.toString("utf8")) as {
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
      throw new Error("probe omitted a valid audio sample rate or channel count");
    }
    const durationSeconds = parsePositiveNumber(parsed.format?.duration);
    return {
      sampleRate,
      channelCount,
      ...(durationSeconds === undefined ? {} : { durationSeconds }),
    };
  } catch (error) {
    throw new VizAudioDecodeError(
      "invalid-probe",
      `Invalid FFprobe result for "${filePath}": ${
        error instanceof Error ? error.message : "unknown parse failure"
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
      "invalid-decoded-pcm",
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
        (sample * channelCount + channel) *
          Float32Array.BYTES_PER_ELEMENT,
      );
    }
  }
  return channels;
};

export const decodeVizAudioFileToPcm = async (
  inputFilePath: string,
  options: DecodeVizAudioFileOptions = {},
): Promise<DecodedVizAudioFile> => {
  const filePath = inputFilePath.startsWith("file:")
    ? fileURLToPath(inputFilePath)
    : resolve(inputFilePath);
  const maxDecodedBytes =
    options.maxDecodedBytes ?? DEFAULT_MAX_DECODED_BYTES;
  if (!Number.isSafeInteger(maxDecodedBytes) || maxDecodedBytes <= 0) {
    throw new VizAudioDecodeError(
      "decoded-audio-too-large",
      "maxDecodedBytes must be a positive safe integer.",
    );
  }

  const [probe, sourceContentIdentity] = await Promise.all([
    probeAudioFile(
      filePath,
      options.ffprobePath ?? "ffprobe",
      options.signal,
    ),
    hashFile(filePath, options.signal),
  ]);
  const decodedChannelCount: 1 | 2 =
    probe.channelCount === 1 ? 1 : 2;
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
      "decoded-audio-too-large",
      `Estimated decoded PCM size ${estimatedDecodedBytes} exceeds the ${maxDecodedBytes}-byte safety limit.`,
    );
  }

  let decoded: ProcessResult;
  try {
    decoded = await runProcess(
      options.ffmpegPath ?? "ffmpeg",
      [
        "-v",
        "error",
        "-i",
        filePath,
        "-map",
        "0:a:0",
        "-vn",
        "-sn",
        "-dn",
        "-ac",
        String(decodedChannelCount),
        "-ar",
        String(probe.sampleRate),
        "-f",
        "f32le",
        "-acodec",
        "pcm_f32le",
        "pipe:1",
      ],
      {
        maxStdoutBytes: maxDecodedBytes,
        ...(options.signal === undefined
          ? {}
          : { signal: options.signal }),
      },
    );
  } catch (error) {
    if (error instanceof VizAudioDecodeError) {
      throw error;
    }
    throw new VizAudioDecodeError(
      "decode-failed",
      error instanceof Error
        ? error.message
        : `Could not decode audio file "${filePath}".`,
    );
  }

  const channels = deinterleaveFloat32(
    decoded.stdout,
    decodedChannelCount,
  );
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
    },
  };
};

export interface CreateVizNodeAudioBakeSourceResolverOptions {
  resolveFilePath(
    request: VizAudioFeatureBakeJobRequest,
  ): string | Promise<string>;
  decodeOptions?: Omit<DecodeVizAudioFileOptions, "signal">;
  decoderIdentity?: string;
}

export const createVizNodeAudioBakeSourceResolver = ({
  resolveFilePath,
  decodeOptions = {},
  decoderIdentity = "ffmpeg-f32le",
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
      decoderIdentity,
    };
  },
});
