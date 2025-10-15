/**
 * Video Encoder using FFmpeg.wasm
 *
 * Encodes captured frames into a video file with audio synchronization.
 * Runs entirely in the browser using WebAssembly.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Helper to add logs to the export store
const log = (
  type: 'info' | 'success' | 'warning' | 'error' | 'perf',
  message: string,
  details?: string,
  duration?: number,
) => {
  // Import here to avoid circular dependency
  import('../stores/export-store').then(({ default: useExportStore }) => {
    const exportStore = useExportStore.getState();
    exportStore.addLog({ type, message, details, duration });
  });

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
export async function initFFmpeg(
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (ffmpeg) return;

  log('info', 'Initializing FFmpeg WASM');
  const initTimer = new PerfTimer('FFmpeg initialization');

  ffmpeg = new FFmpeg();

  // Set up progress logging
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      const progressPercent = progress * 100;
      log('perf', `FFmpeg encoding progress`, `${progressPercent.toFixed(1)}%`);
      onProgress(progressPercent);
    });
  }

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

  // Load FFmpeg WASM files from CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm',
      ),
    });

    initTimer.end('FFmpeg WASM loaded successfully');
  } catch (error) {
    log('error', 'FFmpeg load failed', String(error));
    throw new Error(`Failed to load FFmpeg: ${error}`);
  }
}

/**
 * Encode frames to video
 */
export async function encodeVideo(
  frames: Blob[],
  audioUrl: string | null,
  options: {
    fps: number;
    width: number;
    height: number;
    format: 'mp4' | 'webm';
    quality: 'high' | 'medium' | 'low';
    audioStartTime?: number; // Start time in seconds for audio trimming
    audioDuration?: number; // Duration in seconds for audio trimming
  },
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  if (!ffmpeg) {
    await initFFmpeg(onProgress);
  }

  if (!ffmpeg) {
    throw new Error('FFmpeg not initialized');
  }

  const { fps, format, quality, audioStartTime, audioDuration } = options;
  const totalFrames = frames.length;

  // Helper to check for cancellation
  const checkCancellation = async () => {
    const { default: useExportStore } = await import('../stores/export-store');
    return useExportStore.getState().shouldCancel;
  };

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
      if (i % 10 === 0 && (await checkCancellation())) {
        log('warning', 'Encoding cancelled during frame writing');
        throw new Error('Export cancelled by user');
      }

      const frameData = await fetchFile(frames[i]);
      await ffmpeg.writeFile(
        `frame${String(i).padStart(6, '0')}.jpg`,
        frameData,
      );

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
      await ffmpeg.writeFile('audio.mp3', audioData);

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
    const qualitySettings = getQualitySettings(quality, format);
    log('info', 'Encoding settings', `${quality} quality, ${format} format`);

    // Build FFmpeg command
    const outputFile = `output.${format}`;
    const command = [
      '-framerate',
      String(fps),
      '-pattern_type',
      'glob',
      '-i',
      'frame*.jpg',
      // Audio input with optional trimming
      // Use -ss BEFORE -i for faster seeking (input seeking vs output seeking)
      ...(hasAudio && audioStartTime !== undefined
        ? ['-ss', String(audioStartTime)]
        : []),
      ...(hasAudio && audioDuration !== undefined
        ? ['-t', String(audioDuration)]
        : []),
      ...(hasAudio ? ['-i', 'audio.mp3'] : []),
      '-c:v',
      format === 'mp4' ? 'libx264' : 'libvpx-vp9',
      ...qualitySettings,
      ...(hasAudio ? ['-c:a', format === 'mp4' ? 'aac' : 'libopus'] : []),
      ...(hasAudio ? ['-shortest'] : []), // Stop encoding when shortest stream ends
      '-pix_fmt',
      'yuv420p', // Compatibility with most players
      '-movflags',
      '+faststart', // Enable streaming for MP4
      outputFile,
    ];

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
    ffmpeg.on('log', progressHandler);

    // Track intervals for cleanup
    let cancellationChecker: NodeJS.Timeout | null = null;
    let checkLoop: NodeJS.Timeout | null = null;

    try {
      // Set up a timeout for encoding (15 minutes max)
      const encodingTimeout = new Promise((_, reject) => {
        setTimeout(
          () => {
            reject(new Error('FFmpeg encoding timeout after 15 minutes'));
          },
          15 * 60 * 1000,
        );
      });

      // Set up cancellation checker (polls every 500ms)
      let cancelled = false;
      cancellationChecker = setInterval(async () => {
        if (await checkCancellation()) {
          cancelled = true;
        }
      }, 500);

      // Race between encoding, timeout, and cancellation
      const encodingPromise = ffmpeg.exec(command);
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
      ffmpeg.off('log', progressHandler);
    }

    if (onProgress) {
      onProgress(100); // Encoding complete
    }

    // Read the output file
    log('info', 'Reading encoded video file');
    const readTimer = new PerfTimer('Read output file');
    const data = await ffmpeg.readFile(outputFile);
    readTimer.end('Output file read');

    // Clean up files from virtual filesystem
    log('info', 'Cleaning up virtual filesystem');
    const cleanupTimer = new PerfTimer('Cleanup virtual filesystem');

    for (let i = 0; i < frames.length; i++) {
      await ffmpeg.deleteFile(`frame${String(i).padStart(6, '0')}.jpg`);
    }
    if (hasAudio) {
      await ffmpeg.deleteFile('audio.mp3');
    }
    await ffmpeg.deleteFile(outputFile);

    cleanupTimer.end(`${frames.length} frame files + audio cleaned up`);

    // Convert to blob
    const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
    // Create a new Uint8Array to ensure compatible ArrayBuffer type
    const uint8Data =
      data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array();
    const blob = new Blob([uint8Data], { type: mimeType });

    const blobSizeMB = (blob.size / 1024 / 1024).toFixed(2);
    log(
      'success',
      'Video encoded successfully',
      `${blobSizeMB} MB (${blob.size} bytes)`,
    );
    return blob;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', 'Video encoding failed', errorMessage);
    throw new Error(`Video encoding failed: ${errorMessage}`);
  }
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
): number {
  // Rough estimation based on typical bitrates
  const pixels = width * height;
  const durationInSeconds = frameCount / 60; // Assuming 60 fps

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
