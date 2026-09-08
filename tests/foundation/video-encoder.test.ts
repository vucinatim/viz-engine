import {
  createVizRenderAudioBlock,
  estimateVideoSize,
} from '@/lib/utils/video-encoder';
import { describe, expect, it } from 'vitest';

describe('streaming audio coordinates', () => {
  const channels = [
    new Float32Array([1, 2, 3, 4, 5]),
    new Float32Array([6, 7, 8, 9, 10]),
  ];
  const audio = {
    length: 5,
    numberOfChannels: 2,
    getChannelData: (index: number) => channels[index]!,
  } as AudioBuffer;
  it('clips absolute samples, preserves planar channel order and pads the requested tail', () => {
    expect([...createVizRenderAudioBlock(audio, 1, 2, 4)]).toEqual([
      4, 5, 0, 0, 9, 10, 0, 0,
    ]);
    expect([...createVizRenderAudioBlock(audio, 8, 0, 2)]).toEqual([
      0, 0, 0, 0,
    ]);
  });
  it('keeps partial blocks contiguous without accumulating timestamp rounding', () => {
    const first = createVizRenderAudioBlock(audio, 1, 0, 2);
    const last = createVizRenderAudioBlock(audio, 1, 2, 1);
    expect([...first]).toEqual([2, 3, 7, 8]);
    expect([...last]).toEqual([4, 9]);
  });
  it('budgets more bytes for more frames while preserving per-frame quality', () => {
    expect(estimateVideoSize(600, 1920, 1080, 'high', 60)).toBeCloseTo(
      2 * estimateVideoSize(300, 1920, 1080, 'high', 30),
      1,
    );
    expect(estimateVideoSize(300, 1920, 1080, 'high', 60)).toBe(
      estimateVideoSize(300, 1920, 1080, 'high', 30),
    );
  });
});

describe('maintained MP4 presentation contract', () => {
  it('rejects incompatible modes and non-callable mapping before output creation', async () => {
    const { Mp4OutputFormat } = await import('mediabunny');
    for (const fastStart of [
      'fragmented',
      'reserve',
      'in-memory',
      undefined,
    ] as const) {
      expect(
        () =>
          new Mp4OutputFormat({
            fastStart,
            getTrackPresentationWindow: () => undefined,
          }),
      ).toThrow('fastStart: false');
    }
    expect(
      () =>
        new Mp4OutputFormat({
          fastStart: false,
          getTrackPresentationWindow: 1 as never,
        }),
    ).toThrow('requires a function');
  });
  it.each([
    { start: -1, duration: 0.001 },
    { start: NaN, duration: 0.001 },
    { start: 0, duration: 0 },
    { start: 0, duration: Infinity },
    { start: 0, duration: 10 },
  ])(
    'rejects invalid or out-of-media presentation window $start / $duration',
    async (window) => {
      const {
        AudioSample,
        AudioSampleSource,
        BufferTarget,
        MovOutputFormat,
        Output,
      } = await import('mediabunny');
      const output = new Output({
        format: new MovOutputFormat({
          fastStart: false,
          getTrackPresentationWindow: () => window,
        }),
        target: new BufferTarget(),
      });
      const source = new AudioSampleSource({ codec: 'pcm-s16' });
      output.addAudioTrack(source);
      await output.start();
      const sample = new AudioSample({
        data: new Float32Array(128),
        sampleRate: 48_000,
        numberOfChannels: 1,
        format: 'f32-planar',
        timestamp: 0,
      });
      try {
        await source.add(sample);
      } finally {
        sample.close();
      }
      await expect(output.finalize()).rejects.toThrow(
        'inside the coded media interval',
      );
      await output.cancel();
    },
  );
});

describe('maintained muxer cancellation contract', () => {
  it('cannot report success when canceled during asynchronous final publication', async () => {
    const {
      AudioSample,
      AudioSampleSource,
      BufferTarget,
      MovOutputFormat,
      Output,
    } = await import('mediabunny');
    let releaseFinalization!: () => void;
    let enteredFinalization!: () => void;
    const held = new Promise<void>((resolve) => {
      releaseFinalization = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      enteredFinalization = resolve;
    });
    const output = new Output({
      format: new MovOutputFormat(),
      target: new BufferTarget(),
      onFinalize: async () => {
        enteredFinalization();
        await held;
      },
    });
    const source = new AudioSampleSource({ codec: 'pcm-s16' });
    output.addAudioTrack(source);
    await output.start();
    const sample = new AudioSample({
      data: new Float32Array(128),
      sampleRate: 48_000,
      numberOfChannels: 1,
      format: 'f32-planar',
      timestamp: 0,
    });
    try {
      await source.add(sample);
    } finally {
      sample.close();
    }
    const finishing = output.finalize();
    await entered;
    const rejection = expect(finishing).rejects.toThrow(
      'Output canceled during finalization.',
    );
    const canceled = output.cancel();
    expect(output.state).toBe('canceled');
    releaseFinalization();
    await rejection;
    await canceled;
    expect(output.state).toBe('canceled');
  });
});

describe('maintained Opus presentation contract', () => {
  it('rejects a non-callable presentation endpoint before output creation', async () => {
    const { WebMOutputFormat } = await import('mediabunny');
    expect(
      () => new WebMOutputFormat({ getTrackPresentationEnd: 1 as never }),
    ).toThrow('requires a function');
  });
  it.each([
    { end: 0, codec: 'opus', header: true, error: 'positive finite Opus' },
    { end: -1, codec: 'opus', header: true, error: 'positive finite Opus' },
    { end: NaN, codec: 'opus', header: true, error: 'positive finite Opus' },
    {
      end: Infinity,
      codec: 'opus',
      header: true,
      error: 'positive finite Opus',
    },
    {
      end: 0.01,
      codec: 'pcm-s16',
      header: false,
      error: 'positive finite Opus',
    },
    { end: 0.01, codec: 'opus', header: false, error: 'identification header' },
    { end: 1, codec: 'opus', header: true, error: 'does not cover' },
  ] as const)(
    'rejects invalid endpoint/header/coverage $end / $codec / $header',
    async ({ end, codec, header, error }) => {
      const {
        Output,
        MkvOutputFormat,
        BufferTarget,
        EncodedAudioPacketSource,
        EncodedPacket,
      } = await import('mediabunny');
      const output = new Output({
        format: new MkvOutputFormat({ getTrackPresentationEnd: () => end }),
        target: new BufferTarget(),
      });
      const source = new EncodedAudioPacketSource(codec);
      output.addAudioTrack(source);
      await output.start();
      const description = new Uint8Array([
        79, 112, 117, 115, 72, 101, 97, 100, 1, 1, 56, 1, 128, 187, 0, 0, 0, 0,
        0,
      ]);
      await expect(
        (async () => {
          await source.add(
            new EncodedPacket(
              new Uint8Array([0xf8, 0xff, 0xfe]),
              'key',
              0,
              0.02,
            ),
            {
              decoderConfig: {
                codec: codec === 'opus' ? 'opus' : 'pcm-s16',
                sampleRate: 48000,
                numberOfChannels: 1,
                ...(header ? { description } : {}),
              },
            },
          );
          await output.finalize();
        })(),
      ).rejects.toThrow(error);
      await output.cancel();
    },
  );
});
