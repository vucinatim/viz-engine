import type { AacEncoderPacketMetadata } from '@mediabunny/aac-encoder';
import type {
  VizMediaProbe,
  VizRenderDiagnostic,
  VizRenderRequest,
} from '@viz-engine/contracts';
import {
  AudioSample,
  AudioSampleSource,
  BlobSource,
  Input,
  MP4,
  Mp4OutputFormat,
  Output,
  Quality,
  StreamTarget,
  VideoSample,
  VideoSampleSource,
  WEBM,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
} from 'mediabunny';
import type { VizBrowserRenderAudio } from './browser-render-audio';
import { openVizBrowserRenderOutput } from './browser-render-output';

type VideoRequest = Extract<VizRenderRequest, { kind: 'clip' | 'video' }>;
export interface VizStreamingVideoEncoder {
  /** Snapshots the borrowed canvas before yielding. Await before changing it. */
  addFrame(canvas: HTMLCanvasElement, index: number): Promise<void>;
  finalize(): Promise<{
    blob: Blob;
    probe: VizMediaProbe;
    diagnostics: VizRenderDiagnostic[];
  }>;
  dispose(): Promise<void>;
}

const bitrateFor = (
  width: number,
  height: number,
  quality: 'high' | 'medium' | 'low',
) =>
  Math.max(
    64_000,
    width * height * (quality === 'high' ? 8 : quality === 'medium' ? 4 : 2),
  );

export const estimateVideoSize = (
  frameCount: number,
  width: number,
  height: number,
  quality: 'high' | 'medium' | 'low',
  fps = 60,
): number =>
  Math.round(
    ((bitrateFor(width, height, quality) * (frameCount / fps)) /
      8 /
      1_000_000) *
      100,
  ) / 100;

/** Bounded planar PCM block. Clip coordinates are absolute sample positions. */
export const createVizRenderAudioBlock = (
  audio: AudioBuffer,
  startSample: number,
  outputOffset: number,
  frameCount: number,
): Float32Array => {
  const data = new Float32Array(frameCount * audio.numberOfChannels);
  const sourceStart = startSample + outputOffset;
  const available = Math.max(
    0,
    Math.min(frameCount, audio.length - sourceStart),
  );
  for (let channel = 0; channel < audio.numberOfChannels; channel++) {
    data.set(
      audio
        .getChannelData(channel)
        .subarray(sourceStart, sourceStart + available),
      channel * frameCount,
    );
  }
  return data;
};

export const probeVizEncodedMedia = async (
  blob: Blob,
  signal: AbortSignal,
): Promise<VizMediaProbe> => {
  signal.throwIfAborted();
  const input = new Input({
    source: new BlobSource(blob),
    formats: [MP4, WEBM],
  });
  const abort = () => input.dispose();
  signal.throwIfAborted();
  signal.addEventListener('abort', abort, { once: true });
  try {
    const streams: VizMediaProbe['streams'] = [];
    for (const track of await input.getVideoTracks()) {
      const stats = await track.computePacketStats();
      streams.push({
        kind: 'video',
        codec: (await track.getCodec()) ?? 'unknown',
        width: await track.getDisplayWidth(),
        height: await track.getDisplayHeight(),
        durationSeconds:
          (await track.getDurationFromMetadata()) ??
          (await track.computeDuration()),
        frameRate: stats.averagePacketRate,
      });
    }
    for (const track of await input.getAudioTracks()) {
      streams.push({
        kind: 'audio',
        codec: (await track.getCodec()) ?? 'unknown',
        sampleRate: await track.getSampleRate(),
        channelCount: await track.getNumberOfChannels(),
        durationSeconds:
          (await track.getDurationFromMetadata()) ??
          (await track.computeDuration()),
      });
    }
    signal.throwIfAborted();
    return {
      container: (await input.getFormat()).name,
      byteLength: blob.size,
      durationSeconds:
        (await input.getDurationFromMetadata()) ??
        (await input.computeDuration()),
      streams,
    };
  } finally {
    signal.removeEventListener('abort', abort);
    input.dispose();
  }
};

export const openVizStreamingVideoEncoder = async ({
  request,
  sourceFps,
  audio,
  signal,
}: {
  request: VideoRequest;
  sourceFps: number;
  audio: VizBrowserRenderAudio;
  signal: AbortSignal;
}): Promise<VizStreamingVideoEncoder> => {
  signal.throwIfAborted();
  const videoCodec = request.format === 'mp4' ? 'avc' : 'vp9';
  const audioCodec = request.format === 'mp4' ? 'aac' : 'opus';
  const quality = new Quality({
    bitrate: bitrateFor(
      request.viewport.width,
      request.viewport.height,
      request.quality === 'high'
        ? 'high'
        : request.quality === 'standard'
          ? 'medium'
          : 'low',
    ),
  });
  if (
    !(await canEncodeVideo(videoCodec, {
      ...request.viewport,
      frameRate: request.fps,
      quality,
      latencyMode: 'quality',
    }))
  ) {
    throw new Error(
      `Browser cannot encode ${request.format}/${videoCodec} at ${request.viewport.width}x${request.viewport.height} at ${request.fps} fps.`,
    );
  }
  signal.throwIfAborted();
  const loaded = request.includeAudio ? await audio.load() : undefined;
  if (request.includeAudio && !loaded)
    throw new Error(
      'Video requested audio, but no canonical resolved audio asset is available.',
    );
  const pcm = loaded?.audioBuffer;
  if (pcm && audioCodec === 'aac') {
    const { registerAacEncoder } = await import('@mediabunny/aac-encoder');
    registerAacEncoder();
  }
  const audioQuality = new Quality({ bitrate: 192_000 });
  if (
    pcm &&
    !(await canEncodeAudio(audioCodec, {
      sampleRate: pcm.sampleRate,
      numberOfChannels: pcm.numberOfChannels,
      quality: audioQuality,
    }))
  )
    throw new Error(
      `Browser cannot encode ${request.format}/${audioCodec} at ${pcm.sampleRate} Hz, ${pcm.numberOfChannels} channels.`,
    );
  signal.throwIfAborted();
  const sink = await openVizBrowserRenderOutput(signal);
  let firstAacSample: number | undefined;
  let lastAacSample: number | undefined;
  let videoConfig: VideoEncoderConfig | undefined;
  let audioConfig: AudioEncoderConfig | undefined;
  const output = new Output({
    format:
      request.format === 'mp4'
        ? new Mp4OutputFormat({
            fastStart: false,
            getTrackPresentationWindow: (track) => {
              if (!pcm || !track.isAudioTrack()) return undefined;
              if (firstAacSample === undefined)
                throw new Error(
                  'AAC encoder did not report priming coordinates.',
                );
              return {
                start: -firstAacSample / pcm.sampleRate,
                duration: totalSamples / pcm.sampleRate,
              };
            },
          })
        : new WebMOutputFormat({
            getTrackPresentationEnd: (track) =>
              pcm && track.isAudioTrack()
                ? totalSamples / pcm.sampleRate
                : undefined,
          }),
    target: new StreamTarget(sink.writable, {
      chunked: true,
      chunkSize: 1024 * 1024,
    }),
  });
  const video = new VideoSampleSource({
    codec: videoCodec,
    quality,
    latencyMode: 'quality',
    sizeChangeBehavior: 'deny',
    onEncoderConfig: (config) => {
      videoConfig = config;
    },
  });
  const audioTrack = pcm
    ? new AudioSampleSource({
        codec: audioCodec,
        quality: audioQuality,
        onEncoderConfig: (config) => {
          audioConfig = config;
        },
        onEncodedPacket: (_packet, metadata) => {
          if (audioCodec !== 'aac') return;
          const timing = (metadata as AacEncoderPacketMetadata | undefined)
            ?.aacTiming;
          if (
            !timing ||
            !Number.isSafeInteger(timing.packetStartSample) ||
            !Number.isSafeInteger(timing.packetSampleCount)
          )
            throw new Error('AAC encoder lost its coded sample coordinates.');
          if (
            lastAacSample !== undefined &&
            timing.packetStartSample !== lastAacSample
          )
            throw new Error('AAC coded sample coordinates are not contiguous.');
          firstAacSample ??= timing.packetStartSample;
          lastAacSample = timing.packetStartSample + timing.packetSampleCount;
          if (firstAacSample > 0)
            throw new Error(
              'AAC encoder reported an unexpected presentation origin.',
            );
        },
      })
    : undefined;
  let nextFrame = 0;
  let audioOffset = 0;
  const totalSamples = pcm
    ? Math.round((request.frameCount / request.fps) * pcm.sampleRate)
    : 0;
  const startSample = pcm
    ? Math.round((request.startFrame / sourceFps) * pcm.sampleRate)
    : 0;
  let disposal: Promise<void> | undefined;
  let finalization: Promise<unknown> | undefined;
  const dispose = () =>
    (disposal ??= (async () => {
      signal.removeEventListener('abort', abort);
      const cleanup = await Promise.allSettled([
        sink.dispose(),
        output.state === 'finalized' ? Promise.resolve() : output.cancel(),
      ]);
      await finalization?.catch(() => undefined);
      const failure = cleanup.find((entry) => entry.status === 'rejected');
      if (failure?.status === 'rejected' && !signal.aborted)
        throw failure.reason;
    })());
  const abort = () => {
    void dispose().catch(() => undefined);
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    signal.throwIfAborted();
    output.addVideoTrack(video, { frameRate: request.fps });
    if (audioTrack) output.addAudioTrack(audioTrack);
    await output.start();
    signal.throwIfAborted();
  } catch (error) {
    await dispose();
    throw error;
  }
  return {
    async addFrame(canvas, index) {
      signal.throwIfAborted();
      if (disposal || finalization) throw new Error('Video encoder is closed.');
      if (index !== nextFrame || index >= request.frameCount)
        throw new Error('Video frames must be submitted once in order.');
      if (
        canvas.width !== request.viewport.width ||
        canvas.height !== request.viewport.height
      )
        throw new Error(
          'Encoded canvas does not match the requested dimensions.',
        );
      // Snapshot now: canvas remains owned by the render host.
      const sample = new VideoSample(canvas, {
        timestamp: index / request.fps,
        duration: (index + 1) / request.fps - index / request.fps,
      });
      try {
        await video.add(sample);
      } finally {
        sample.close();
      }
      signal.throwIfAborted();
      // Keep both muxer tracks advancing together; do not accumulate an entire track.
      if (pcm && audioTrack) {
        const until = Math.min(
          totalSamples,
          Math.round(((index + 1) / request.fps) * pcm.sampleRate),
        );
        while (audioOffset < until) {
          signal.throwIfAborted();
          const count = Math.min(4096, until - audioOffset);
          const block = new AudioSample({
            data: createVizRenderAudioBlock(
              pcm,
              startSample,
              audioOffset,
              count,
            ),
            format: 'f32-planar',
            sampleRate: pcm.sampleRate,
            numberOfChannels: pcm.numberOfChannels,
            timestamp: audioOffset / pcm.sampleRate,
          });
          try {
            await audioTrack.add(block);
          } finally {
            block.close();
          }
          audioOffset += count;
        }
      }
      signal.throwIfAborted();
      nextFrame++;
    },
    async finalize() {
      signal.throwIfAborted();
      if (disposal || finalization) throw new Error('Video encoder is closed.');
      if (nextFrame !== request.frameCount)
        throw new Error('Cannot finalize an incomplete video.');
      finalization = output.finalize();
      await finalization;
      signal.throwIfAborted();
      const blob = await sink.finalize(
        request.format === 'mp4' ? 'video/mp4' : 'video/webm',
      );
      const probe = await probeVizEncodedMedia(blob, signal);
      return {
        blob,
        probe,
        diagnostics: [
          {
            severity: 'info',
            code: 'browser-encoding-path',
            message: `Video uses browser WebCodecs; ${pcm ? (audioCodec === 'aac' ? 'AAC uses the timing-aware libavcodec worker.' : 'Opus uses browser WebCodecs.') : 'audio is omitted.'}`,
            details: {
              videoConfig,
              audioConfig,
              audioBackend: pcm
                ? audioCodec === 'aac'
                  ? 'libavcodec-wasm'
                  : 'webcodecs'
                : 'none',
              ...(pcm
                ? {
                    sampleRate: pcm.sampleRate,
                    sourceStartSample: startSample,
                    intendedSampleCount: totalSamples,
                    ...(firstAacSample === undefined
                      ? {}
                      : {
                          firstPacketSample: firstAacSample,
                          lastPacketEndSample: lastAacSample,
                          codecDelaySamples: -firstAacSample,
                        }),
                  }
                : {}),
            },
          },
        ],
      };
    },
    dispose,
  };
};
