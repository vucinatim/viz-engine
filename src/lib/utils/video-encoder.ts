/**
 * Video Encoder using FFmpeg.wasm
 *
 * Encodes captured frames into a video file with audio synchronization.
 * Runs entirely in the browser using WebAssembly.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import ffmpegCoreURL from '@ffmpeg/core?url';
import ffmpegWasmURL from '@ffmpeg/core/wasm?url';
import { fetchFile } from '@ffmpeg/util';
import useExportStore from '../stores/export-store';

// Helper to add logs to the export store
const log = (
  type: 'info' | 'success' | 'warning' | 'error' | 'perf',
  message: string,
  details?: string,
  duration?: number,
) => {
  const exportStore = useExportStore.getState();
  exportStore.addLog({ type, message, details, duration });

  // Also log to console for debugging
  const prefix = `[Encoder]`;
  const fullMessage = details ? `${message} - ${details}` : message;
  const durationStr = duration ? ` (${duration}ms)` : '';

  switch (type) {
    case 'error':
      console.error(prefix, fullMessage, durationStr);
      break;
    case 'warning':
      console.warn(prefix, fullMessage, durationStr);
      break;
    case 'info':
    case 'success':
    case 'perf':
      console.log(prefix, fullMessage, durationStr);
      break;
  }
};

// Performance timer helper
class PerfTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }

  end(details?: string) {
    const duration = Math.round(performance.now() - this.startTime);
    log('perf', this.name, details, duration);
    return duration;
  }
}

let ffmpeg: FFmpeg | null = null;

/**
 * Initialize FFmpeg (only once)
 */
export async function initFFmpeg(): Promise<void> {
  if (ffmpeg) return;

  log('info', 'Initializing FFmpeg WASM');
  const initTimer = new PerfTimer('FFmpeg initialization');

  ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => {
    // Only log important FFmpeg messages to avoid spam
    if (
      message.includes('frame=') ||
      message.includes('fps=') ||
      message.includes('bitrate=')
    ) {
      log('perf', 'FFmpeg status', message.trim());
    }
  });

  try {
    await ffmpeg.load({
      coreURL: ffmpegCoreURL,
      wasmURL: ffmpegWasmURL,
    });

    initTimer.end('FFmpeg WASM loaded successfully');
  } catch (error) {
    const failedEncoder = ffmpeg;
    failedEncoder?.terminate();
    if (ffmpeg === failedEncoder) {
      ffmpeg = null;
    }
    log('error', 'FFmpeg load failed', String(error));
    throw new Error(`Failed to load FFmpeg: ${error}`);
  }
}

export interface VideoEncodingOptions {
  fps: number;
  width: number;
  height: number;
  format: 'mp4' | 'webm';
  quality: 'high' | 'medium' | 'low';
  audioStartTime?: number;
  audioDuration?: number;
}

export interface EncodedVideoProbeStream {
  kind: 'video' | 'audio';
  codec: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  sampleRate?: number;
  channelCount?: number;
}

export interface EncodedVideoProbe {
  container: string;
  durationSeconds?: number;
  byteLength: number;
  streams: EncodedVideoProbeStream[];
}

export interface EncodedVideoResult {
  blob: Blob;
  probe: EncodedVideoProbe;
}

export interface VideoEncodingRuntimeOptions {
  signal?: AbortSignal;
  shouldCancel?: () => boolean;
}

export function buildVideoEncodingCommand(
  options: VideoEncodingOptions,
  hasAudio: boolean,
): string[] {
  const { fps, format, quality, audioStartTime, audioDuration } = options;

  return [
    '-framerate',
    String(fps),
    '-pattern_type',
    'glob',
    '-i',
    'frame*.jpg',
    ...(hasAudio && audioStartTime !== undefined
      ? ['-ss', String(audioStartTime)]
      : []),
    ...(hasAudio && audioDuration !== undefined
      ? ['-t', String(audioDuration)]
      : []),
    ...(hasAudio ? ['-i', 'audio.mp3'] : []),
    '-c:v',
    format === 'mp4' ? 'libx264' : 'libvpx-vp9',
    ...getQualitySettings(quality, format),
    ...(hasAudio ? ['-c:a', format === 'mp4' ? 'aac' : 'libopus'] : []),
    ...(hasAudio ? ['-shortest'] : []),
    '-pix_fmt',
    'yuv420p',
    ...(format === 'mp4' ? ['-movflags', '+faststart'] : []),
    `output.${format}`,
  ];
}

/**
 * Encode frames to video
 */
export async function encodeVideoWithProbe(
  frames: Blob[],
  audioUrl: string | null,
  options: VideoEncodingOptions,
  onProgress?: (progress: number) => void,
  runtime: VideoEncodingRuntimeOptions = {},
): Promise<EncodedVideoResult> {
  if (!ffmpeg) {
    await initFFmpeg();
  }

  if (!ffmpeg) {
    throw new Error('FFmpeg not initialized');
  }

  const encoder = ffmpeg;
  const { format, quality, audioStartTime, audioDuration } = options;
  const totalFrames = frames.length;
  const outputFile = `output.${format}`;
  const virtualFiles: string[] = [];
  let failed = false;

  // Helper to check for cancellation
  const checkCancellation = () =>
    runtime.signal?.aborted === true ||
    (runtime.shouldCancel?.() ??
      useExportStore.getState().shouldCancel);

  try {
    // Write all frames to FFmpeg's virtual filesystem
    log(
      'info',
      'Writing frames to FFmpeg virtual filesystem',
      `${frames.length} frames`,
    );
    const writeTimer = new PerfTimer('Write frames to FFmpeg');

    for (let i = 0; i < frames.length; i++) {
      // Check for cancellation every 10 frames
      if (i % 10 === 0 && checkCancellation()) {
        log('warning', 'Encoding cancelled during frame writing');
        throw new Error('Export cancelled by user');
      }

      const frameData = await fetchFile(frames[i]);
      const frameFile = `frame${String(i).padStart(6, '0')}.jpg`;
      await encoder.writeFile(frameFile, frameData, {
        ...(runtime.signal === undefined
          ? {}
          : { signal: runtime.signal }),
      });
      virtualFiles.push(frameFile);

      // Progress reporting removed - will be done by FFmpeg log handler
      // to avoid conflicting progress updates
      if (i % 50 === 0) {
        log('perf', `Writing frames progress`, `${i}/${frames.length}`);
      }
    }

    writeTimer.end(`${frames.length} frames written`);

    // Write audio file if provided
    let hasAudio = false;
    if (audioUrl) {
      log('info', 'Loading audio file');
      const audioTimer = new PerfTimer('Load audio file');
      const audioData = await fetchFile(audioUrl);
      await encoder.writeFile('audio.mp3', audioData, {
        ...(runtime.signal === undefined
          ? {}
          : { signal: runtime.signal }),
      });
      virtualFiles.push('audio.mp3');

      // Log audio trimming info if provided
      if (audioStartTime !== undefined || audioDuration !== undefined) {
        log(
          'info',
          'Audio trimming',
          `Start: ${audioStartTime ?? 0}s, Duration: ${audioDuration ?? 'auto'}s`,
        );
      }

      audioTimer.end('Audio file loaded');
      hasAudio = true;
    }

    // Determine encoding settings based on quality
    log('info', 'Encoding settings', `${quality} quality, ${format} format`);

    // Build FFmpeg command
    const command = buildVideoEncodingCommand(options, hasAudio);
    virtualFiles.push(outputFile);

    log('info', 'FFmpeg command', command.join(' '));

    // Run FFmpeg with timeout and progress tracking
    log('info', 'Starting FFmpeg encoding process');
    const encodingTimer = new PerfTimer('FFmpeg encoding');

    // Set up progress tracking by parsing FFmpeg log messages
    // FFmpeg outputs: "frame=  123 fps=5.6 q=30.0 size=..."
    let lastReportedProgress = 0;
    const progressHandler = ({ message }: { message: string }) => {
      const frameMatch = message.match(/frame=\s*(\d+)/);
      if (frameMatch && onProgress) {
        const currentFrame = parseInt(frameMatch[1], 10);
        // Report progress as 0-100% of encoding phase
        const progress = Math.min((currentFrame / totalFrames) * 100, 100);

        // Only report if progress has increased to avoid jumps
        if (progress > lastReportedProgress) {
          lastReportedProgress = progress;
          onProgress(progress);
        }
      }
    };

    // Attach the progress handler
    encoder.on('log', progressHandler);

    // Track intervals for cleanup
    let cancellationChecker: NodeJS.Timeout | null = null;
    let checkLoop: NodeJS.Timeout | null = null;
    let encodingTimeoutHandle: NodeJS.Timeout | null = null;

    try {
      // Set up a timeout for encoding (15 minutes max)
      const encodingTimeout = new Promise((_, reject) => {
        encodingTimeoutHandle = setTimeout(
          () => {
            reject(new Error('FFmpeg encoding timeout after 15 minutes'));
          },
          15 * 60 * 1000,
        );
      });

      // Set up cancellation checker (polls every 500ms)
      let cancelled = false;
      cancellationChecker = setInterval(() => {
        if (checkCancellation()) {
          cancelled = true;
        }
      }, 500);

      // Race between encoding, timeout, and cancellation
      const encodingPromise = encoder.exec(
        command,
        undefined,
        runtime.signal === undefined
          ? undefined
          : { signal: runtime.signal },
      );
      const cancellationPromise = new Promise<void>((_, reject) => {
        checkLoop = setInterval(() => {
          if (cancelled) {
            reject(new Error('Export cancelled by user'));
          }
        }, 100);
      });

      await Promise.race([
        encodingPromise,
        encodingTimeout,
        cancellationPromise,
      ]);

      encodingTimer.end('FFmpeg encoding completed');
    } finally {
      // Clean up all intervals and handlers
      if (cancellationChecker) clearInterval(cancellationChecker);
      if (checkLoop) clearInterval(checkLoop);
      if (encodingTimeoutHandle) clearTimeout(encodingTimeoutHandle);
      encoder.off('log', progressHandler);
    }

    if (onProgress) {
      onProgress(100); // Encoding complete
    }

    // Read the output file
    log('info', 'Reading encoded video file');
    const readTimer = new PerfTimer('Read output file');
    const data = await encoder.readFile(outputFile);
    readTimer.end('Output file read');

    // Convert to blob
    const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
    // Create a new Uint8Array to ensure compatible ArrayBuffer type
    const uint8Data =
      data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array();
    const blob = new Blob([uint8Data], { type: mimeType });
    const probeFile = 'probe.json';
    virtualFiles.push(probeFile);
    const probeLogs: string[] = [];
    const probeLogHandler = ({ message }: { message: string }) => {
      probeLogs.push(message.trim());
      if (probeLogs.length > 20) {
        probeLogs.shift();
      }
    };
    encoder.on('log', probeLogHandler);
    let probeStatus: number;
    try {
      probeStatus = await encoder.ffprobe(
        [
          '-v',
          'error',
          '-show_format',
          '-show_streams',
          '-of',
          'json',
          '-o',
          probeFile,
          outputFile,
        ],
        undefined,
        runtime.signal === undefined
          ? undefined
          : { signal: runtime.signal },
      );
    } finally {
      encoder.off('log', probeLogHandler);
    }
    const probeData = await encoder.readFile(probeFile, 'utf8');
    if (typeof probeData !== 'string') {
      throw new Error('FFprobe did not return JSON text.');
    }
    const probe = parseEncodedVideoProbe(
      JSON.parse(probeData) as unknown,
      blob.size,
    );
    // @ffmpeg/core 0.12.10 leaves its shared return slot at -1 for
    // ffprobe even when the command writes complete, valid output.
    // Treat that sentinel as success only after strict output parsing.
    if (probeStatus !== 0 && probeStatus !== -1) {
      const probeDetails = probeLogs.filter(Boolean).join(' | ');
      throw new Error(
        `FFprobe failed with exit status ${probeStatus}${
          probeDetails.length > 0 ? `: ${probeDetails}` : '.'
        }`,
      );
    }

    const blobSizeMB = (blob.size / 1024 / 1024).toFixed(2);
    log(
      'success',
      'Video encoded successfully',
      `${blobSizeMB} MB (${blob.size} bytes)`,
    );
    return { blob, probe };
  } catch (error) {
    failed = true;
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', 'Video encoding failed', errorMessage);
    throw new Error(`Video encoding failed: ${errorMessage}`);
  } finally {
    if (failed) {
      encoder.terminate();
      if (ffmpeg === encoder) {
        ffmpeg = null;
      }
      log('info', 'Reset FFmpeg after failed encoding');
    } else if (virtualFiles.length > 0) {
      log('info', 'Cleaning up virtual filesystem');
      const cleanupTimer = new PerfTimer('Cleanup virtual filesystem');
      let deletedFiles = 0;

      for (const file of virtualFiles) {
        try {
          await encoder.deleteFile(file);
          deletedFiles += 1;
        } catch {
          // Missing partial outputs are already clean.
        }
      }

      cleanupTimer.end(`${deletedFiles} virtual files cleaned up`);
    }
  }
}

const parseOptionalFiniteNumber = (
  value: unknown,
): number | undefined => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseFrameRate = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return parseOptionalFiniteNumber(value);
  }
  const [numeratorRaw, denominatorRaw] = value.split('/');
  const numerator = Number(numeratorRaw);
  const denominator = Number(denominatorRaw ?? '1');
  return Number.isFinite(numerator) &&
    Number.isFinite(denominator) &&
    denominator !== 0
    ? numerator / denominator
    : undefined;
};

export const parseEncodedVideoProbe = (
  value: unknown,
  byteLength: number,
): EncodedVideoProbe => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('FFprobe output must be an object.');
  }
  const record = value as Record<string, unknown>;
  const format =
    typeof record.format === 'object' && record.format !== null
      ? (record.format as Record<string, unknown>)
      : {};
  const rawStreams = Array.isArray(record.streams)
    ? record.streams
    : [];
  const streams = rawStreams.flatMap((raw) => {
    if (typeof raw !== 'object' || raw === null) {
      return [];
    }
    const stream = raw as Record<string, unknown>;
    if (
      stream.codec_type !== 'video' &&
      stream.codec_type !== 'audio'
    ) {
      return [];
    }
    const kind: EncodedVideoProbeStream['kind'] =
      stream.codec_type;
    const durationSeconds = parseOptionalFiniteNumber(
      stream.duration,
    );
    const width = parseOptionalFiniteNumber(stream.width);
    const height = parseOptionalFiniteNumber(stream.height);
    const frameRate = parseFrameRate(stream.r_frame_rate);
    const sampleRate = parseOptionalFiniteNumber(
      stream.sample_rate,
    );
    const channelCount = parseOptionalFiniteNumber(
      stream.channels,
    );
    return [
      {
        kind,
        codec:
          typeof stream.codec_name === 'string'
            ? stream.codec_name
            : 'unknown',
        ...(durationSeconds === undefined
          ? {}
          : { durationSeconds }),
        ...(width === undefined ? {} : { width }),
        ...(height === undefined ? {} : { height }),
        ...(frameRate === undefined ? {} : { frameRate }),
        ...(sampleRate === undefined ? {} : { sampleRate }),
        ...(channelCount === undefined
          ? {}
          : { channelCount }),
      },
    ];
  });
  if (streams.length === 0) {
    throw new Error('FFprobe output has no audio or video streams.');
  }
  const durationSeconds = parseOptionalFiniteNumber(
    format.duration,
  );
  return {
    container:
      typeof format.format_name === 'string'
        ? format.format_name
        : 'unknown',
    ...(durationSeconds === undefined
      ? {}
      : { durationSeconds }),
    byteLength,
    streams,
  };
};

export async function encodeVideo(
  frames: Blob[],
  audioUrl: string | null,
  options: VideoEncodingOptions,
  onProgress?: (progress: number) => void,
  runtime?: VideoEncodingRuntimeOptions,
): Promise<Blob> {
  const result = await encodeVideoWithProbe(
    frames,
    audioUrl,
    options,
    onProgress,
    runtime,
  );
  return result.blob;
}

/**
 * Get quality settings for FFmpeg based on quality preset
 */
function getQualitySettings(
  quality: 'high' | 'medium' | 'low',
  format: 'mp4' | 'webm',
): string[] {
  if (format === 'mp4') {
    // H.264 settings - HEAVILY optimized for WASM encoding speed
    // WASM is ~10-20x slower than native FFmpeg, so we use much faster presets
    switch (quality) {
      case 'high':
        // veryfast preset: ~3-4x faster than medium, still great quality
        // For 1920x1080@60fps: ~2-3min instead of 8-10min
        return ['-preset', 'veryfast', '-crf', '18', '-tune', 'film'];
      case 'medium':
        // faster preset: good balance of speed and quality
        return ['-preset', 'faster', '-crf', '22', '-tune', 'film'];
      case 'low':
        // ultrafast: maximum speed, acceptable quality
        return ['-preset', 'ultrafast', '-crf', '26', '-tune', 'film'];
    }
  } else {
    // VP9 settings - optimized for faster encoding
    switch (quality) {
      case 'high':
        // Use higher cpu-used for faster encoding
        return ['-b:v', '2M', '-quality', 'good', '-cpu-used', '3'];
      case 'medium':
        return ['-b:v', '1M', '-quality', 'good', '-cpu-used', '4'];
      case 'low':
        return ['-b:v', '500k', '-quality', 'realtime', '-cpu-used', '5'];
    }
  }
}

/**
 * Download encoded video
 */
export function downloadVideo(
  blob: Blob,
  filename: string = 'export.mp4',
): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Estimate video file size (rough approximation)
 * @param frameCount - Number of frames
 * @param width - Video width
 * @param height - Video height
 * @param quality - Quality preset
 * @returns Estimated size in MB
 */
export function estimateVideoSize(
  frameCount: number,
  width: number,
  height: number,
  quality: 'high' | 'medium' | 'low',
  fps = 60,
): number {
  // Rough estimation based on typical bitrates
  const pixels = width * height;
  const durationInSeconds = frameCount / fps;

  let bitrate: number; // in Mbps

  switch (quality) {
    case 'high':
      bitrate = (pixels / 1000000) * 8; // ~8 Mbps per megapixel
      break;
    case 'medium':
      bitrate = (pixels / 1000000) * 4; // ~4 Mbps per megapixel
      break;
    case 'low':
      bitrate = (pixels / 1000000) * 2; // ~2 Mbps per megapixel
      break;
  }

  // Calculate size in MB
  const sizeInMB = (bitrate * durationInSeconds) / 8;
  return Math.round(sizeInMB * 100) / 100;
}
