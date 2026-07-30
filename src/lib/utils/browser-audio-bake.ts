import {
  executeVizAudioFeatureBakeAsync,
  type VizAudioBakeSourceResolver,
  type VizAudioFeatureBakeJobRequest,
  type VizAudioFeatureBakeProgress,
} from '@viz-engine/bake';
import type {
  VizAudioFeatureTimelineArtifact,
  VizRuntimeAudioFrameSnapshot,
} from '@viz-engine/contracts';
import { sampleAudioFrameSnapshot } from '@viz-engine/runtime';

export interface BrowserAudioBake {
  artifact: VizAudioFeatureTimelineArtifact;
  duration: number;
  sampleRate: number;
  fftSize: number;
  frameCount: number;
}

export interface BakeBrowserAudioOptions {
  fps: number;
  fftSize?: number;
  startTime?: number;
  duration?: number;
  sourceAssetId?: string;
  shouldCancel?: () => boolean;
  onProgress?: (progress: VizAudioFeatureBakeProgress) => void;
}

export interface LoadedBrowserAudio {
  audioBuffer: AudioBuffer;
  sourceContentIdentity: string;
}

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join(
    '',
  );

const createSourceContentIdentity = async (
  sourceBytes: ArrayBuffer,
): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', sourceBytes);
  return `sha256:${toHex(new Uint8Array(digest))}`;
};

const getCanonicalChannels = (
  audioBuffer: AudioBuffer,
): readonly Float32Array[] => {
  if (audioBuffer.numberOfChannels <= 0) {
    return [];
  }
  if (audioBuffer.numberOfChannels === 1) {
    return [audioBuffer.getChannelData(0)];
  }
  return [
    audioBuffer.getChannelData(0),
    audioBuffer.getChannelData(1),
  ];
};

export const bakeBrowserAudioFeatures = async (
  audioBuffer: AudioBuffer,
  sourceContentIdentity: string,
  options: BakeBrowserAudioOptions,
): Promise<BrowserAudioBake> => {
  const result = await executeVizAudioFeatureBakeAsync(
    {
      kind: 'audio-feature-timeline',
      sourceAssetId: options.sourceAssetId ?? 'browser-audio-source',
      sourceContentIdentity,
      profile: 'standard',
      fps: options.fps,
      ...(options.fftSize === undefined
        ? {}
        : { fftSize: options.fftSize }),
      sourceWindow: {
        startSeconds: options.startTime ?? 0,
        ...(options.duration === undefined
          ? {}
          : { durationSeconds: options.duration }),
      },
    },
    {
      sampleRate: audioBuffer.sampleRate,
      channels: getCanonicalChannels(audioBuffer),
    },
    {
      ...(options.shouldCancel === undefined
        ? {}
        : { shouldCancel: options.shouldCancel }),
      ...(options.onProgress === undefined
        ? {}
        : { onProgress: options.onProgress }),
    },
  );

  if (!result.ok) {
    throw new Error(
      result.issues.map((issue) => issue.message).join(' ') ||
        'Browser audio bake failed.',
    );
  }

  return {
    artifact: result.artifact,
    duration: result.artifact.sourceWindow.durationSeconds,
    sampleRate: result.artifact.analysis!.sampleRate,
    fftSize: result.artifact.analysis!.fftSize,
    frameCount: result.artifact.frameAlignment.frameCount,
  };
};

export const sampleBrowserAudioBakeFrame = (
  bake: BrowserAudioBake,
  frame: number,
): VizRuntimeAudioFrameSnapshot => {
  const snapshot = sampleAudioFrameSnapshot(
    bake.artifact,
    frame,
    bake.artifact.frameAlignment.fps,
  );
  if (!snapshot) {
    throw new Error(
      `Browser audio bake "${bake.artifact.id}" has no packed frame data.`,
    );
  }
  return snapshot;
};

export const loadAndDecodeBrowserAudio = async (
  audioUrl: string,
  signal?: AbortSignal,
): Promise<LoadedBrowserAudio> => {
  const response = await fetch(audioUrl, {
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok) {
    throw new Error(
      `Could not load audio (${response.status} ${response.statusText}).`,
    );
  }
  const sourceBytes = await response.arrayBuffer();
  const [sourceContentIdentity, audioBuffer] = await Promise.all([
    createSourceContentIdentity(sourceBytes),
    new OfflineAudioContext(2, 44100, 44100).decodeAudioData(
      sourceBytes.slice(0),
    ),
  ]);
  return {
    audioBuffer,
    sourceContentIdentity,
  };
};

export const createVizBrowserAudioBakeSourceResolver = (
  resolveAudioUrl: (
    request: VizAudioFeatureBakeJobRequest,
  ) => string | Promise<string>,
): VizAudioBakeSourceResolver => ({
  async resolve(request, signal) {
    const audioUrl = await resolveAudioUrl(request);
    const loaded = await loadAndDecodeBrowserAudio(audioUrl, signal);
    if (signal.aborted) {
      throw new DOMException("Audio decode was cancelled.", "AbortError");
    }
    return {
      pcm: {
        sampleRate: loaded.audioBuffer.sampleRate,
        channels: getCanonicalChannels(loaded.audioBuffer),
      },
      sourceContentIdentity: loaded.sourceContentIdentity,
      decoderIdentity: "web-audio.decodeAudioData",
    };
  },
});
