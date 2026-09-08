import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

test('executor clips nonzero source time and preserves decoded beginning, middle and end A/V events', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.route('**/__av_integration__', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
  await page.goto('/__av_integration__');
  const results = await page.evaluate(async (base) => {
    const { createVizBrowserRenderExecutor } = await import(
      /* @vite-ignore */ `${base}/src/lib/utils/browser-render-executor.ts`
    );
    const { openVizStreamingVideoEncoder } = await import(
      /* @vite-ignore */ `${base}/src/lib/utils/video-encoder.ts`
    );
    // Record the native sample-rate boundary independently of our conversion.
    // This is diagnostic: a browser fixing its resampler does not fail the gate.
    const nativeRateObservations = [];
    for (const inputRate of [44100, 48000]) {
      const packets: { timestamp: number; duration: number | null }[] = [];
      let header: number[] = [],
        decoderRate: number | undefined;
      const encoder = new AudioEncoder({
        output(chunk, metadata) {
          packets.push({
            timestamp: chunk.timestamp,
            duration: chunk.duration,
          });
          if (metadata?.decoderConfig) {
            decoderRate = metadata.decoderConfig.sampleRate;
            const description = metadata.decoderConfig.description;
            if (description)
              header = Array.from(
                ArrayBuffer.isView(description)
                  ? new Uint8Array(
                      description.buffer,
                      description.byteOffset,
                      description.byteLength,
                    )
                  : new Uint8Array(description),
              );
          }
        },
        error(error) {
          throw error;
        },
      });
      encoder.configure({
        codec: 'opus',
        sampleRate: inputRate,
        numberOfChannels: 1,
        bitrate: 192000,
      });
      try {
        for (let frame = 0; frame < 90; frame++) {
          const sample = new AudioData({
            format: 'f32-planar',
            sampleRate: inputRate,
            numberOfChannels: 1,
            numberOfFrames: inputRate / 30,
            timestamp: Math.round((frame / 30) * 1e6),
            data: new Float32Array(inputRate / 30),
          });
          encoder.encode(sample);
          sample.close();
          if (encoder.encodeQueueSize > 2)
            await new Promise<void>((resolve) =>
              encoder.addEventListener('dequeue', () => resolve(), {
                once: true,
              }),
            );
        }
        await encoder.flush();
      } finally {
        encoder.close();
      }
      const preSkip = header[10]! | (header[11]! << 8);
      const last = packets.at(-1)!;
      nativeRateObservations.push({
        inputRate,
        decoderRate,
        header,
        preSkip,
        packets,
        presentationEnd:
          (last.timestamp + (last.duration ?? 0)) / 1e6 - preSkip / 48000,
      });
    }
    const rate = 44100,
      eventFrames = [3, 45, 84],
      length = rate * 4;
    const wav = new ArrayBuffer(44 + length * 2),
      view = new DataView(wav);
    const text = (offset: number, value: string) =>
      [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
    text(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, 'data');
    view.setUint32(40, length * 2, true);
    const templates: number[][] = [];
    for (const [index, frame] of eventFrames.entries()) {
      const template = [];
      let random = 12345 + index,
        filtered = 0;
      for (let i = 0; i < 1470; i++) {
        random ^= random << 13;
        random ^= random >>> 17;
        random ^= random << 5;
        filtered = filtered * 0.7 + ((random >>> 0) / 0xffffffff - 0.5) * 0.3;
        const sample = Math.round(filtered * 60000);
        view.setInt16(44 + (rate + frame * 1470 + i) * 2, sample, true);
        template.push(sample / 32768);
      }
      templates.push(template);
    }
    const uri = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
    const outputs = [];
    try {
      for (const format of ['mp4', 'webm']) {
        const captured: number[] = [];
        let disposed = 0;
        let releaseHandoff!: () => void, firstHandoff!: () => void;
        const heldHandoff = new Promise<void>((resolve) => {
          releaseHandoff = resolve;
        });
        const startedHandoff = new Promise<void>((resolve) => {
          firstHandoff = resolve;
        });
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 48;
        const drawing = canvas.getContext('2d')!;
        const executor = createVizBrowserRenderExecutor({
          openVideoEncoder: async (context) => {
            const native = await openVizStreamingVideoEncoder({
              request: context.request,
              sourceFps: context.source.project.timeline.fps,
              audio: context.audio,
              signal: context.signal,
            });
            return {
              ...native,
              async addFrame(canvas: HTMLCanvasElement, index: number) {
                await native.addFrame(canvas, index);
                if (index === 0) {
                  firstHandoff();
                  await heldHandoff;
                }
              },
            };
          },
          openCaptureSession: async () => ({
            captureFrame: async ({ frame }: { frame: number }) => {
              captured.push(frame);
              drawing.fillStyle = eventFrames.some(
                (event) => frame === 60 + event * 2,
              )
                ? '#ffffff'
                : '#000000';
              drawing.fillRect(0, 0, 64, 48);
              return canvas;
            },
            dispose() {
              disposed++;
            },
          }),
        });
        const pending = executor.execute({
          request: {
            schemaVersion: 1,
            kind: 'clip',
            source: { projectId: 'av-events' },
            executorId: executor.id,
            intent: 'preview',
            outputLabel: 'av-events',
            quality: 'high',
            format,
            startFrame: 60,
            frameCount: 90,
            fps: 30,
            viewport: { width: 64, height: 48 },
            includeAudio: true,
          },
          source: {
            project: {
              projectId: 'av-events',
              timeline: { fps: 60 },
              assetRefs: [{ id: 'audio', kind: 'audio' }],
            },
            resolvedAssets: [{ id: 'audio', kind: 'audio', uri }],
            resolvedArtifacts: [],
            contentIdentity: 'av-events-44100',
          },
          signal: new AbortController().signal,
          onProgress() {},
        });
        // The first real encoded handoff stays held across browser frames.
        await Promise.race([
          startedHandoff,
          pending.then(() => {
            throw new Error('Execution bypassed held handoff.');
          }),
        ]);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        const capturesWhileHeld = captured.length;
        releaseHandoff();
        const result = await pending;
        try {
          const blob = await (await fetch(result.outputs[0].uri)).blob();
          const context = new AudioContext({ sampleRate: rate });
          let pcm: number[];
          let codedRateSampleCount = 0;
          try {
            pcm = Array.from(
              (
                await context.decodeAudioData(await blob.arrayBuffer())
              ).getChannelData(0),
            );
          } finally {
            await context.close();
          }
          const codedContext = new AudioContext({
            sampleRate: format === 'webm' ? 48000 : rate,
          });
          try {
            codedRateSampleCount = (
              await codedContext.decodeAudioData(await blob.arrayBuffer())
            ).length;
          } finally {
            await codedContext.close();
          }
          outputs.push({
            format,
            codedRateSampleCount,
            capturesWhileHeld,
            diagnostics: result.diagnostics,
            captured,
            disposed,
            performance: result.performance,
            pcm,
            bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
          });
        } finally {
          result.releaseOutputs();
        }
      }
    } finally {
      URL.revokeObjectURL(uri);
    }
    return { rate, eventFrames, templates, outputs, nativeRateObservations };
  }, `/@fs${process.cwd()}`);
  const observations = [];
  for (const output of results.outputs) {
    const path = testInfo.outputPath(`av-events.${output.format}`);
    const bytes = Buffer.from(output.bytes);
    await writeFile(path, bytes);
    await testInfo.attach(`av-events.${output.format}`, {
      path,
      contentType: `video/${output.format}`,
    });
    const rgb = execFileSync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-i',
        path,
        '-map',
        '0:v:0',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgb24',
        'pipe:1',
      ],
      { maxBuffer: 10_000_000 },
    );
    expect(rgb.length).toBe(64 * 48 * 3 * 90);
    const videoEvents = Array.from({ length: 90 }, (_, i) => i).filter(
      (i) => rgb[i * 64 * 48 * 3]! > 220,
    );
    expect(videoEvents).toEqual(results.eventFrames);
    if (output.format === 'webm')
      expect(output.codedRateSampleCount).toBe(144000);
    const matchPcm = (pcm: number[]) =>
      results.templates.map((template, event) => {
        const expected = results.eventFrames[event]! * 1470;
        let best = { lag: 0, correlation: -Infinity };
        for (let lag = -2000; lag <= 2000; lag++) {
          let dot = 0,
            a = 0,
            b = 0;
          for (let i = 128; i < 1340; i++) {
            const actual = pcm[expected + i + lag] ?? 0;
            const wanted = template[i]!;
            dot += actual * wanted;
            a += actual * actual;
            b += wanted * wanted;
          }
          const correlation = a > 0 ? dot / Math.sqrt(a * b) : 0;
          if (correlation > best.correlation) best = { lag, correlation };
        }
        return {
          ...best,
          audioTime: (expected + best.lag) / results.rate,
          videoTime: videoEvents[event]! / 30,
        };
      });
    const matches = matchPcm(output.pcm);
    const aligned = (entries: typeof matches) =>
      entries.every(
        (entry) => Math.abs(entry.audioTime - entry.videoTime) <= 1 / 60,
      );
    expect(aligned(matches)).toBe(true);
    for (const match of matches) expect(match.correlation).toBeGreaterThan(0.9);
    // Perturb decoded samples before observation, not the calculated timestamps.
    // The same correlator must discover a displaced origin and end-only drift.
    const shiftedOrigin = matchPcm([
      ...Array<number>(1470).fill(0),
      ...output.pcm,
    ]);
    const latePcm = [...output.pcm];
    latePcm.splice(120000, 0, ...Array<number>(1470).fill(0));
    const shiftedEnd = matchPcm(latePcm);
    expect(aligned(shiftedOrigin)).toBe(false);
    expect(aligned(shiftedEnd)).toBe(false);
    expect(shiftedOrigin.map((entry) => entry.lag)).toEqual([1470, 1470, 1470]);
    expect(shiftedEnd.map((entry) => entry.lag)).toEqual([0, 0, 1470]);
    expect(output.captured).toEqual(
      Array.from({ length: 90 }, (_, i) => 60 + i * 2),
    );
    expect(output.disposed).toBe(1);
    expect(output.capturesWhileHeld).toBe(1);
    observations.push({
      format: output.format,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      captured: output.captured,
      capturesWhileHeld: output.capturesWhileHeld,
      decodedSamples: output.pcm.length,
      codedRateSampleCount: output.codedRateSampleCount,
      diagnostics: output.diagnostics,
      videoEvents,
      matches,
      shiftedOrigin,
      shiftedEnd,
      performance: output.performance,
    });
  }
  await testInfo.attach('av-events.json', {
    contentType: 'application/json',
    body: Buffer.from(
      JSON.stringify(
        {
          browser: page.context().browser()!.version(),
          ffmpeg: execFileSync('ffmpeg', ['-version'], {
            encoding: 'utf8',
          }).split('\n')[0],
          rate: results.rate,
          nativeRateObservations: results.nativeRateObservations,
          observations,
        },
        null,
        2,
      ),
    ),
  });
});

test('codec clip conversion preserves stereo, exact unaligned length and zero tails without mutating source PCM', async ({
  page,
}) => {
  await page.route('**/__resample_clip__', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
  await page.goto('/__resample_clip__');
  const result = await page.evaluate(async (base) => {
    const { resampleBrowserAudioClip } = await import(
      /* @vite-ignore */ `${base}/src/lib/utils/browser-audio-resample.ts`
    );
    const pcm = new AudioBuffer({
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 44100,
    });
    pcm.getChannelData(0).fill(0.25);
    pcm.getChannelData(1).fill(-0.5);
    const clips = [];
    for (const startSample of [5145, 43980, 45000]) {
      const converted = await resampleBrowserAudioClip(
        pcm,
        { sampleRate: 48000, startSample, sampleCount: 400 },
        new AbortController().signal,
      );
      clips.push({
        startSample,
        length: converted.length,
        rate: converted.sampleRate,
        channels: converted.numberOfChannels,
        middle: [
          converted.getChannelData(0)[64],
          converted.getChannelData(1)[64],
        ],
        tail: [
          converted.getChannelData(0)[350],
          converted.getChannelData(1)[350],
        ],
      });
    }
    const controller = new AbortController();
    const pending = resampleBrowserAudioClip(
      pcm,
      { sampleRate: 48000, startSample: 0, sampleCount: 48000 },
      controller.signal,
    );
    controller.abort(new Error('conversion canceled'));
    const canceled = await pending.then(
      () => false,
      (error: Error) => error.message === 'conversion canceled',
    );
    return {
      clips,
      canceled,
      unchanged:
        pcm.getChannelData(0).every((v) => v === 0.25) &&
        pcm.getChannelData(1).every((v) => v === -0.5),
    };
  }, `/@fs${process.cwd()}`);
  expect(result.unchanged).toBe(true);
  expect(result.canceled).toBe(true);
  for (const clip of result.clips)
    expect([clip.length, clip.rate, clip.channels]).toEqual([400, 48000, 2]);
  expect(result.clips[0]!.middle).toEqual([0.25, -0.5]);
  expect(result.clips[0]!.tail).toEqual([0.25, -0.5]);
  expect(result.clips[1]!.middle).toEqual([0.25, -0.5]);
  expect(result.clips[1]!.tail).toEqual([0, 0]);
  expect(result.clips[2]!.middle).toEqual([0, 0]);
});

test('canceling a held clip conversion cannot create a late encoder or output', async ({
  page,
}) => {
  await page.route('**/__held_conversion__', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
  await page.goto('/__held_conversion__');
  const result = await page.evaluate(async (base) => {
    const { openVizStreamingVideoEncoder } = await import(
      /* @vite-ignore */ `${base}/src/lib/utils/video-encoder.ts`
    );
    const NativeContext = OfflineAudioContext,
      NativeEncoder = VideoEncoder;
    const controller = new AbortController();
    let conversions = 0,
      encoders = 0,
      release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    globalThis.OfflineAudioContext = class extends NativeContext {
      async startRendering() {
        conversions++;
        const rendered = super.startRendering();
        queueMicrotask(() =>
          controller.abort(new Error('held conversion canceled')),
        );
        await held;
        return rendered;
      }
    };
    globalThis.VideoEncoder = class extends NativeEncoder {
      constructor(init: VideoEncoderInit) {
        super(init);
        encoders++;
      }
    };
    const pcm = new AudioBuffer({
      sampleRate: 44100,
      numberOfChannels: 1,
      length: 44100,
    });
    let error = '';
    try {
      try {
        const encoder = await openVizStreamingVideoEncoder({
          sourceFps: 60,
          signal: controller.signal,
          audio: {
            load: async () => ({
              audioBuffer: pcm,
              sourceContentIdentity: 'held',
            }),
            decodedBytes: () => pcm.length * 4,
            dispose() {},
          },
          request: {
            schemaVersion: 1,
            kind: 'clip',
            source: { projectId: 'held' },
            executorId: 'browser-webgl',
            intent: 'preview',
            outputLabel: 'held',
            quality: 'high',
            format: 'webm',
            startFrame: 0,
            frameCount: 30,
            fps: 30,
            viewport: { width: 64, height: 48 },
            includeAudio: true,
          },
        });
        await encoder.dispose();
      } catch (caught) {
        error = String(caught);
      }
      const beforeRelease = encoders;
      release();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const files = [];
      for await (const [
        name,
      ] of (await navigator.storage.getDirectory()) as unknown as AsyncIterable<
        [string, unknown]
      >)
        if (name.startsWith('viz-render-')) files.push(name);
      return { error, conversions, beforeRelease, encoders, files };
    } finally {
      release();
      globalThis.OfflineAudioContext = NativeContext;
      globalThis.VideoEncoder = NativeEncoder;
    }
  }, `/@fs${process.cwd()}`);
  expect(result.error).toContain('held conversion canceled');
  expect(result.conversions).toBe(1);
  expect(result.beforeRelease).toBe(0);
  expect(result.encoders).toBe(0);
  expect(result.files).toEqual([]);
});
