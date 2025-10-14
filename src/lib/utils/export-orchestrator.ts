/**
 * Export Orchestrator
 *
 * Main controller for the frame-by-frame video export process.
 * Orchestrates the entire pipeline from audio extraction to video encoding.
 */

import useAudioStore from '../stores/audio-store';
import useEditorStore from '../stores/editor-store';
import useExportStore, {
  ExportLog,
  ExportSettings,
} from '../stores/export-store';
import { fastCaptureFrame } from './fast-frame-capture';
import {
  BatchFrameWriter,
  clearAllFrames,
  getAllFrames,
} from './frame-storage';
import {
  OfflineAudioData,
  extractOfflineAudioData,
  loadAndDecodeAudio,
} from './offline-audio-extractor';
import { downloadVideo, encodeVideo, initFFmpeg } from './video-encoder';

// Helper to add logs to the export store
const log = (
  type: ExportLog['type'],
  message: string,
  details?: string,
  duration?: number,
) => {
  const exportStore = useExportStore.getState();
  exportStore.addLog({ type, message, details, duration });

  // Also log to console for debugging
  const prefix = `[Export]`;
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

/**
 * Main export function - orchestrates the entire export process
 */
export async function exportVideo(
  rendererContainerElement: HTMLElement,
  settings?: Partial<ExportSettings>,
): Promise<void> {
  const exportStore = useExportStore.getState();
  const audioStore = useAudioStore.getState();
  const editorStore = useEditorStore.getState();

  // Merge settings with defaults
  const finalSettings: ExportSettings = {
    ...exportStore.settings,
    ...settings,
  };

  let timerInterval: NodeJS.Timeout | null = null;
  let wasPlaying = false;
  let wakeLock: WakeLockSentinel | null = null;
  let visibilityChangeHandler: (() => void) | null = null;

  try {
    // Initialize
    log('info', '🚀 Starting export process');
    log(
      'info',
      'Export settings',
      `${finalSettings.width}x${finalSettings.height} @ ${finalSettings.fps}fps, ${finalSettings.quality} quality, ${finalSettings.format} format`,
    );

    const startTime = Date.now();
    exportStore.setIsExporting(true);
    exportStore.setShouldCancel(false); // Reset cancellation flag
    exportStore.setError(null);
    exportStore.clearCapturedFrames();
    exportStore.clearLogs();

    const clearTimer = new PerfTimer('Clear previous frames');
    await clearAllFrames();
    clearTimer.end();

    // Detect tab visibility changes - warn if user switches away
    visibilityChangeHandler = () => {
      if (document.hidden) {
        log('warning', 'Tab is hidden - export may pause or slow down!');
        exportStore.setProgress({
          message: '⚠️ Tab hidden - export paused. Please return to this tab.',
        });
      } else {
        log('info', 'Tab is visible again - export resuming');
        // Will update with actual frame progress in the render loop
      }
    };
    document.addEventListener('visibilitychange', visibilityChangeHandler);

    // Request wake lock to prevent system sleep during export
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        log(
          'success',
          'Wake lock acquired - system will not sleep during export',
        );

        wakeLock.addEventListener('release', () => {
          log('info', 'Wake lock released');
        });
      } catch (err) {
        log('warning', 'Could not acquire wake lock', String(err));
      }
    } else {
      log('warning', 'Wake Lock API not supported - system may sleep');
    }

    // Start timer
    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      exportStore.setProgress({ elapsedTime: elapsed });
    }, 1000);

    // Phase 1: Prepare
    log('info', '📋 Phase 1: Preparing export');
    exportStore.setProgress({
      phase: 'preparing',
      message: 'Preparing export...',
      currentFrame: 0,
      totalFrames: 0,
    });

    // Get audio URL
    const audioUrl = audioStore.currentTrackUrl;
    if (!audioUrl) {
      log('error', 'No audio file loaded');
      throw new Error('No audio file loaded');
    }
    log('info', 'Audio file loaded', audioUrl.substring(0, 50) + '...');

    // Calculate total frames based on start time and duration
    const totalFrames = Math.ceil(finalSettings.duration * finalSettings.fps);
    exportStore.setProgress({ totalFrames });
    log(
      'info',
      'Total frames to render',
      `${totalFrames} frames (${finalSettings.duration}s @ ${finalSettings.fps}fps)`,
    );

    // Load and decode audio
    exportStore.setProgress({ message: 'Loading audio...' });
    const audioLoadTimer = new PerfTimer('Load and decode audio');
    const audioBuffer = await loadAndDecodeAudio(audioUrl);
    audioLoadTimer.end(
      `${audioBuffer.duration.toFixed(2)}s audio, ${audioBuffer.numberOfChannels} channels`,
    );

    // Check for cancellation
    if (useExportStore.getState().shouldCancel) {
      throw new Error('Export cancelled by user');
    }

    // Extract offline audio data for the export range only
    exportStore.setProgress({ message: 'Analyzing audio...' });
    const audioAnalysisTimer = new PerfTimer('Analyze audio (FFT extraction)');
    const offlineAudioData = await extractOfflineAudioData(
      audioBuffer,
      finalSettings.fps,
      2048, // FFT size
      finalSettings.startTime, // Only analyze from start time
      finalSettings.duration, // Only analyze the export duration
    );
    audioAnalysisTimer.end(`${offlineAudioData.frames.length} frames analyzed`);

    // Check for cancellation
    if (useExportStore.getState().shouldCancel) {
      throw new Error('Export cancelled by user');
    }

    // Initialize FFmpeg
    exportStore.setProgress({ message: 'Initializing video encoder...' });
    const ffmpegTimer = new PerfTimer('Initialize FFmpeg');
    await initFFmpeg();
    ffmpegTimer.end('FFmpeg WASM loaded and ready');

    // Check for cancellation
    if (useExportStore.getState().shouldCancel) {
      throw new Error('Export cancelled by user');
    }

    // Phase 2: Render frames
    log('info', '🎬 Phase 2: Rendering frames');
    exportStore.setProgress({
      phase: 'rendering',
      message: 'Rendering frames...',
      currentFrame: 0,
    });

    // Pause playback during export
    wasPlaying = editorStore.isPlaying;
    if (wasPlaying) {
      editorStore.setIsPlaying(false);
      log('info', 'Paused playback for export');
    }

    // Render all frames
    const renderTimer = new PerfTimer('Render all frames');
    await renderFrames(
      rendererContainerElement,
      offlineAudioData,
      finalSettings,
      totalFrames, // Pass the actual total frames to render
      (currentFrame) => {
        exportStore.setProgress({
          currentFrame,
          message: `Rendering frame ${currentFrame} of ${totalFrames}...`,
        });
      },
    );
    const renderDuration = renderTimer.end(`${totalFrames} frames rendered`);
    const avgFrameTime = (renderDuration / totalFrames).toFixed(2);
    const fps = (1000 / parseFloat(avgFrameTime)).toFixed(1);
    log(
      'perf',
      'Rendering performance',
      `Avg ${avgFrameTime}ms/frame (~${fps} fps)`,
    );

    // Check for cancellation
    if (useExportStore.getState().shouldCancel) {
      throw new Error('Export cancelled by user');
    }

    // Phase 3: Encode video
    log('info', '🎥 Phase 3: Encoding video');
    exportStore.setProgress({
      phase: 'encoding',
      message: 'Encoding video...',
    });

    // Get all captured frames
    const framesTimer = new PerfTimer('Retrieve frames from IndexedDB');
    const frames = await getAllFrames();
    framesTimer.end(`${frames.length} frames retrieved`);

    if (frames.length === 0) {
      log('error', 'No frames were captured');
      throw new Error('No frames were captured');
    }

    // Calculate total size of frames
    const totalSize = frames.reduce((sum, f) => sum + f.size, 0);
    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
    log('info', 'Frame data size', `${sizeMB} MB total`);

    // Encode video
    const encodeTimer = new PerfTimer('Encode video with FFmpeg');
    const videoBlob = await encodeVideo(
      frames,
      audioUrl,
      {
        fps: finalSettings.fps,
        width: finalSettings.width,
        height: finalSettings.height,
        format: finalSettings.format,
        quality: finalSettings.quality,
        audioStartTime: finalSettings.startTime, // Trim audio to match exported segment
        audioDuration: finalSettings.duration, // Only use the exported duration
      },
      (progress) => {
        exportStore.setProgress({
          message: `Encoding video... ${Math.round(progress)}%`,
        });
      },
    );
    const encodeDuration = encodeTimer.end();
    const videoSizeMB = (videoBlob.size / 1024 / 1024).toFixed(2);
    log(
      'success',
      'Video encoded successfully',
      `${videoSizeMB} MB (${finalSettings.format})`,
    );

    // Phase 4: Complete
    log('success', '✅ Export complete!');
    exportStore.setProgress({
      phase: 'complete',
      message: 'Export complete!',
      percentage: 100,
    });

    // Download the video
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, -5);
    const filename = `viz-engine-export-${timestamp}.${finalSettings.format}`;
    downloadVideo(videoBlob, filename);
    log('info', 'Downloading video', filename);

    // Clean up
    const cleanupTimer = new PerfTimer('Cleanup frames from IndexedDB');
    await clearAllFrames();
    cleanupTimer.end();

    // Stop timer
    if (timerInterval) clearInterval(timerInterval);

    // Remove visibility change listener
    if (visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', visibilityChangeHandler);
    }

    // Release wake lock
    if (wakeLock) {
      await wakeLock.release();
      log('info', 'Wake lock released - system can sleep again');
    }

    // Restore playback state
    if (wasPlaying) {
      editorStore.setIsPlaying(true);
      log('info', 'Restored playback state');
    }

    // Calculate and log total export time
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    log('perf', 'Total export time', `${totalTime}s`);

    // Don't auto-reset - let user review logs and click "Back to Settings"
  } catch (error) {
    // Stop timer on error
    if (timerInterval) clearInterval(timerInterval);

    // Remove visibility change listener
    if (visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', visibilityChangeHandler);
    }

    // Release wake lock on error/cancellation
    if (wakeLock) {
      await wakeLock.release();
      log('info', 'Wake lock released - system can sleep again');
    }

    const isCancelled =
      error instanceof Error && error.message === 'Export cancelled by user';

    if (isCancelled) {
      log('warning', '❌ Export was cancelled by user');
    } else {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log('error', 'Export failed', errorMessage);
      exportStore.setError(errorMessage);
      exportStore.setProgress({
        phase: 'error',
        message: 'Export failed',
      });
    }

    // Clean up frames on any error/cancellation
    log('info', 'Cleaning up after error/cancellation...');
    await clearAllFrames();

    // Restore playback state
    if (wasPlaying) {
      editorStore.setIsPlaying(true);
      log('info', 'Restored playback state');
    }
  }
}

/**
 * Render all frames with manual time stepping
 */
async function renderFrames(
  rendererContainer: HTMLElement,
  offlineAudioData: OfflineAudioData,
  settings: ExportSettings,
  maxFrames: number, // Maximum frames to render (from user settings)
  onProgress: (frame: number) => void,
): Promise<void> {
  const { fps, width, height } = settings;
  // Use the smaller of: audio frames available OR user-selected duration
  const totalFrames = Math.min(offlineAudioData.frames.length, maxFrames);

  log(
    'info',
    'Starting frame rendering',
    `${totalFrames} frames @ ${width}x${height}`,
  );

  // Get stores
  const exportStore = useExportStore.getState();
  const editorStore = useEditorStore.getState();

  // We need to manually drive the animation by setting the player time
  const playerRef = editorStore.playerRef.current;

  if (!playerRef) {
    log('error', 'Player ref not available');
    throw new Error('Player ref not available');
  }

  // Create batch frame writer - keeps DB connection open for all writes (much faster!)
  const frameWriter = new BatchFrameWriter();
  await frameWriter.open();
  log('info', 'Batch frame writer opened');

  try {
    // Track performance for periodic logging
    let lastLogTime = performance.now();
    let framesRenderedSinceLog = 0;

    // Iterate through each frame
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      // Check for cancellation
      const currentExportStore = useExportStore.getState();
      if (currentExportStore.shouldCancel) {
        log(
          'warning',
          'Render cancelled at frame',
          `${frameIndex}/${totalFrames}`,
        );
        throw new Error('Export cancelled by user');
      }

      // CRITICAL FIX #1: Inject offline audio data for this frame
      // This ensures components get frame-accurate audio data instead of live data
      const audioFrameData = offlineAudioData.frames[frameIndex];
      if (audioFrameData) {
        exportStore.setCurrentOfflineAudioData(audioFrameData);
      }

      // CRITICAL FIX #2: Seek to the frame index directly, not with time offset!
      // The frameIndex is already 0-based, no need to add startTime offset
      playerRef.seekTo(frameIndex);

      // CRITICAL FIX #3: Use double RAF to ensure render completes
      // Single RAF was too fast for complex scenes
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Capture the frame using fast direct canvas compositing
      // This is 10-50x faster than html2canvas
      const frameBlob = await fastCaptureFrame(rendererContainer, {
        width,
        height,
        backgroundColor: '#000000',
        quality: 0.85, // Reduced from 0.92 for faster encoding
      });

      // Store the frame in IndexedDB using batch writer (much faster!)
      await frameWriter.writeFrame(frameIndex, frameBlob);

      // Update progress
      onProgress(frameIndex + 1);
      framesRenderedSinceLog++;

      // Log performance every 60 frames (1 second at 60fps)
      if (frameIndex % 60 === 0 && frameIndex > 0) {
        const now = performance.now();
        const elapsed = now - lastLogTime;
        const avgFrameTime = elapsed / framesRenderedSinceLog;
        const currentFps = (1000 / avgFrameTime).toFixed(1);
        const progress = ((frameIndex / totalFrames) * 100).toFixed(1);
        log(
          'perf',
          `Frame ${frameIndex}/${totalFrames} (${progress}%)`,
          `${avgFrameTime.toFixed(1)}ms/frame (~${currentFps} fps)`,
        );
        lastLogTime = now;
        framesRenderedSinceLog = 0;
      }

      // Less frequent yielding - only every 10 frames
      if (frameIndex % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    log(
      'success',
      'Frame rendering complete',
      `${totalFrames} frames captured`,
    );
  } finally {
    // Always close the batch frame writer, even on error/cancellation
    frameWriter.close();
    log('info', 'Batch frame writer closed');

    // Clear offline audio data after export
    exportStore.setCurrentOfflineAudioData(null);
  }
}

/**
 * Cancel an ongoing export
 */
export function cancelExport(): void {
  const exportStore = useExportStore.getState();
  const editorStore = useEditorStore.getState();

  log('warning', '🛑 Cancellation requested');

  // Set the cancellation flag - this will stop the render loop
  exportStore.setShouldCancel(true);

  // Set cancellation message
  exportStore.setProgress({
    phase: 'error',
    message: 'Export cancelled by user',
  });

  // Clean up any stored frames
  log('info', 'Cleaning up frames...');
  clearAllFrames().catch((err) => {
    log('error', 'Failed to clear frames', String(err));
  });

  // Don't auto-reset - let user review logs and click "Back to Settings"
}

/**
 * Get export progress
 */
export function getExportProgress() {
  return useExportStore.getState().progress;
}
