import { awaitAbortable } from './await-abortable';

/** Codec-owned clip conversion; canonical feature-bake PCM remains unchanged. */
export const resampleBrowserAudioClip = async (
  input: AudioBuffer,
  options: { sampleRate: number; startSample: number; sampleCount: number },
  signal: AbortSignal,
): Promise<AudioBuffer> => {
  signal.throwIfAborted();
  const context = new OfflineAudioContext(
    input.numberOfChannels,
    options.sampleCount,
    options.sampleRate,
  );
  const source = context.createBufferSource();
  source.buffer = input;
  source.connect(context.destination);
  // An interval beyond the source is explicit silence, including its tail.
  if (options.startSample < input.length)
    source.start(0, options.startSample / input.sampleRate);
  try {
    return await awaitAbortable(() => context.startRendering(), signal);
  } finally {
    source.disconnect();
    source.buffer = null;
  }
};
