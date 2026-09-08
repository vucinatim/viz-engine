import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const ffmpeg = process.env.VIZ_MEDIA_FFMPEG ?? 'ffmpeg';
const ffprobe = process.env.VIZ_MEDIA_FFPROBE ?? 'ffprobe';
const mediaTools = () => ({
  ffmpeg: execFileSync(ffmpeg, ['-version'], { encoding: 'utf8' }).split(
    '\n',
  )[0],
  ffprobe: execFileSync(ffprobe, ['-version'], { encoding: 'utf8' }).split(
    '\n',
  )[0],
});

test('streaming codecs produce independently decodable video and clipped stereo audio', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.route('**/__streaming_export_proof__', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body></body></html>',
    }),
  );
  await page.goto('/__streaming_export_proof__');
  const result = await page.evaluate(async (modulePath) => {
    const { openVizStreamingVideoEncoder } = await import(
      /* @vite-ignore */ modulePath
    );
    const sampleRate = 48_000;
    const pcm = new AudioBuffer({
      numberOfChannels: 2,
      length: sampleRate * 3,
      sampleRate,
    });
    // First second is silence. The requested clip must start at the tone, not source origin.
    for (let channel = 0; channel < 2; channel++) {
      const data = pcm.getChannelData(channel);
      for (let i = sampleRate; i < data.length; i++)
        data[i] =
          0.4 *
          Math.sin((2 * Math.PI * (channel ? 880 : 440) * i) / sampleRate);
    }
    const audio = {
      load: async () => ({
        audioBuffer: pcm,
        sourceContentIdentity: 'synthetic',
      }),
      decodedBytes: () => pcm.length * 8,
      dispose() {},
    };
    const outputs = [];
    for (const format of ['mp4', 'webm']) {
      const encoder = await openVizStreamingVideoEncoder({
        sourceFps: 60,
        audio,
        signal: new AbortController().signal,
        request: {
          schemaVersion: 1,
          kind: 'clip',
          source: { projectId: 'proof' },
          executorId: 'browser-webgl',
          intent: 'preview',
          outputLabel: 'streaming-proof',
          quality: 'high',
          format,
          startFrame: 60,
          frameCount: 30,
          fps: 30,
          viewport: { width: 64, height: 48 },
          includeAudio: true,
        },
      });
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 48;
        const context = canvas.getContext('2d')!;
        for (let index = 0; index < 30; index++) {
          context.fillStyle = index < 15 ? '#ff0000' : '#0000ff';
          context.fillRect(0, 0, 64, 48);
          await encoder.addFrame(canvas, index);
        }
        const { blob, probe, diagnostics } = await encoder.finalize();
        outputs.push({
          format,
          probe,
          diagnostics,
          bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
        });
      } finally {
        await encoder.dispose();
      }
    }
    const directory = await navigator.storage.getDirectory();
    const names: string[] = [];
    for await (const [name] of directory as unknown as AsyncIterable<
      [string, unknown]
    >)
      if (name.startsWith('viz-render-')) names.push(name);
    return {
      outputs,
      temporaryFiles: names,
      mountedCanvases: document.querySelectorAll('canvas').length,
    };
  }, `/@fs/${process.cwd()}/src/lib/utils/video-encoder.ts`);
  expect(result.temporaryFiles).toEqual([]);
  expect(result.mountedCanvases).toBe(0);
  const observations = [];
  for (const output of result.outputs) {
    const path = testInfo.outputPath(`streaming.${output.format}`);
    await writeFile(path, Buffer.from(output.bytes));
    const probe = JSON.parse(
      execFileSync(
        ffprobe,
        [
          '-v',
          'error',
          '-show_streams',
          '-show_format',
          '-count_frames',
          '-of',
          'json',
          path,
        ],
        { encoding: 'utf8' },
      ),
    );
    const video = probe.streams.find(
      (stream: { codec_type: string }) => stream.codec_type === 'video',
    );
    const audio = probe.streams.find(
      (stream: { codec_type: string }) => stream.codec_type === 'audio',
    );
    expect(video.codec_name).toBe(output.format === 'mp4' ? 'h264' : 'vp9');
    expect(audio.codec_name).toBe(output.format === 'mp4' ? 'aac' : 'opus');
    expect([video.width, video.height, Number(video.nb_read_frames)]).toEqual([
      64, 48, 30,
    ]);
    expect(audio.channels).toBe(2);
    const rgb = execFileSync(ffmpeg, [
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
    ]);
    expect(rgb.length).toBe(64 * 48 * 3 * 30);
    expect(rgb[0]).toBeGreaterThan(220);
    expect(rgb[2]).toBeLessThan(25);
    expect(rgb[rgb.length - 1]).toBeGreaterThan(220);
    expect(rgb[rgb.length - 3]).toBeLessThan(25);
    const samples = execFileSync(ffmpeg, [
      '-v',
      'error',
      '-i',
      path,
      '-map',
      '0:a:0',
      '-f',
      'f32le',
      '-acodec',
      'pcm_f32le',
      'pipe:1',
    ]);
    const frames = samples.length / 8;
    const rms = (channel: number) =>
      Math.sqrt(
        Array.from(
          { length: 4800 },
          (_, i) => samples.readFloatLE(((i + 4800) * 2 + channel) * 4) ** 2,
        ).reduce((a, b) => a + b, 0) / 4800,
      );
    expect(rms(0)).toBeGreaterThan(0.2);
    expect(rms(1)).toBeGreaterThan(0.2);
    expect(frames).toBeGreaterThanOrEqual(47_900);
    if (output.format === 'webm') expect(frames).toBe(48_000);
    else expect(frames).toBeLessThan(49_024);
    expect(Number(probe.format.duration)).toBeCloseTo(1, 6);
    expect(output.probe.durationSeconds).toBeCloseTo(1, 6);
    observations.push({
      format: output.format,
      libraryProbe: output.probe,
      diagnostics: output.diagnostics,
      independentProbe: probe,
      decodedAudioFrames: frames,
      rms: [rms(0), rms(1)],
      sha256: createHash('sha256')
        .update(Buffer.from(output.bytes))
        .digest('hex'),
    });
    await testInfo.attach(`streaming.${output.format}`, {
      path,
      contentType: `video/${output.format}`,
    });
  }
  await testInfo.attach('streaming-observation.json', {
    contentType: 'application/json',
    body: Buffer.from(
      JSON.stringify(
        {
          mediaTools: mediaTools(),
          browser: page.context().browser()!.version(),
          platform: process.platform,
          architecture: process.arch,
          head: execFileSync('git', ['rev-parse', 'HEAD'], {
            encoding: 'utf8',
          }).trim(),
          diffSha256: createHash('sha256')
            .update(execFileSync('git', ['diff', 'HEAD', '--binary']))
            .digest('hex'),
          temporaryFiles: result.temporaryFiles,
          observations,
        },
        null,
        2,
      ),
    ),
  });
});

test('native streaming cancellation settles during frame handoff and finalization, then a fresh export succeeds', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.route('**/__streaming_cancel_proof__', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body></body></html>',
    }),
  );
  await page.goto('/__streaming_cancel_proof__');
  const result = await page.evaluate(async (modulePath) => {
    const { openVizStreamingVideoEncoder } = await import(
      /* @vite-ignore */ modulePath
    );
    const pcm = new AudioBuffer({
      numberOfChannels: 2,
      sampleRate: 48_000,
      length: 48_000,
    });
    const audio = {
      load: async () => ({ audioBuffer: pcm, sourceContentIdentity: 'silent' }),
      decodedBytes: () => 384_000,
      dispose() {},
    };
    const request = {
      schemaVersion: 1,
      kind: 'clip',
      source: { projectId: 'cancel' },
      executorId: 'browser-webgl',
      intent: 'preview',
      outputLabel: 'cancel',
      quality: 'draft',
      format: 'mp4',
      startFrame: 0,
      frameCount: 2,
      fps: 30,
      viewport: { width: 64, height: 48 },
      includeAudio: true,
    };
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 48;
    const outcomes = [];
    for (const phase of ['handoff', 'finalize', 'success']) {
      const controller = new AbortController();
      const encoder = await openVizStreamingVideoEncoder({
        request,
        sourceFps: 60,
        signal: controller.signal,
        audio,
      });
      let rejected = false;
      const started = performance.now();
      try {
        if (phase === 'handoff') {
          const pending = encoder.addFrame(canvas, 0);
          controller.abort();
          await pending;
        } else {
          await encoder.addFrame(canvas, 0);
          await encoder.addFrame(canvas, 1);
          const pending = encoder.finalize();
          if (phase === 'finalize') controller.abort();
          await pending;
        }
      } catch {
        rejected = true;
      } finally {
        await encoder.dispose();
      }
      outcomes.push({ phase, rejected, elapsed: performance.now() - started });
    }
    const directory = await navigator.storage.getDirectory();
    const files: string[] = [];
    for await (const [name] of directory as unknown as AsyncIterable<
      [string, unknown]
    >)
      if (name.startsWith('viz-render-')) files.push(name);
    return { outcomes, files };
  }, `/@fs/${process.cwd()}/src/lib/utils/video-encoder.ts`);
  expect(result.files).toEqual([]);
  expect(result.outcomes.map((entry) => entry.rejected)).toEqual([
    true,
    true,
    false,
  ]);
  for (const outcome of result.outcomes)
    expect(outcome.elapsed).toBeLessThan(5000);
});

const findBox = (
  bytes: Buffer,
  path: string[],
): { offset: number; size: number } => {
  let start = 0;
  let end = bytes.length;
  let found = { offset: 0, size: 0 };
  for (const kind of path) {
    let match: typeof found | undefined;
    for (let offset = start; offset + 8 <= end;) {
      const size32 = bytes.readUInt32BE(offset);
      const size =
        size32 === 1
          ? Number(bytes.readBigUInt64BE(offset + 8))
          : size32 === 0
            ? end - offset
            : size32;
      if (size < 8 || offset + size > end)
        throw new Error('Invalid MP4 box extent.');
      if (bytes.toString('ascii', offset + 4, offset + 8) === kind) {
        match = { offset, size };
        break;
      }
      offset += size;
    }
    if (!match) throw new Error(`Missing MP4 box ${kind}.`);
    found = match;
    start = found.offset + 8;
    end = found.offset + found.size;
  }
  return found;
};

// Independent EBML traversal for the exact timing elements under observation.
const readWebmTiming = (bytes: Buffer) => {
  const elements: Array<{ id: number; offset: number; size: number }> = [];
  const containers = new Set([
    0x18538067, 0x1654ae6b, 0xae, 0x1f43b675, 0xa0, 0x1549a966,
  ]);
  const visit = (start: number, end: number) => {
    for (let position = start; position < end;) {
      let idLength = 1;
      while (idLength <= 4 && !(bytes[position]! & (1 << (8 - idLength))))
        idLength++;
      if (idLength > 4) throw new Error('Invalid EBML element id.');
      const id = bytes.readUIntBE(position, idLength);
      position += idLength;
      let sizeLength = 1;
      while (sizeLength <= 8 && !(bytes[position]! & (1 << (8 - sizeLength))))
        sizeLength++;
      if (sizeLength > 8) throw new Error('Invalid EBML element size.');
      let size = bytes[position]! & ((1 << (8 - sizeLength)) - 1);
      for (let i = 1; i < sizeLength; i++)
        size = size * 256 + bytes[position + i]!;
      position += sizeLength;
      if (size === 2 ** (7 * sizeLength) - 1) size = end - position;
      if (position + size > end)
        throw new Error('Invalid EBML element extent.');
      elements.push({ id, offset: position, size });
      if (containers.has(id)) visit(position, position + size);
      position += size;
    }
  };
  visit(0, bytes.length);
  const opus = elements.find(
    (e) =>
      e.id === 0x63a2 &&
      bytes.toString('ascii', e.offset, e.offset + 8) === 'OpusHead',
  )!;
  const delay = elements
    .filter((e) => e.id === 0x56aa)
    .find((e) => bytes.readUIntBE(e.offset, e.size) > 0)!;
  const preroll = elements
    .filter((e) => e.id === 0x56bb)
    .find((e) => bytes.readUIntBE(e.offset, e.size) > 0)!;
  const discard = elements.filter((e) => e.id === 0x75a2);
  const duration = elements.find((e) => e.id === 0x4489)!;
  const scale = elements.find((e) => e.id === 0x2ad7b1)!;
  return {
    opus,
    delay,
    preroll,
    discard,
    durationSeconds:
      ((duration.size === 8
        ? bytes.readDoubleBE(duration.offset)
        : bytes.readFloatBE(duration.offset)) *
        bytes.readUIntBE(scale.offset, scale.size)) /
      1e9,
  };
};

test('audio presentation preserves short and unaligned sample intervals and rejects displaced or truncated controls', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.route('**/__aac_timing_proof__', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body></body></html>',
    }),
  );
  await page.goto('/__aac_timing_proof__');
  const encoded = await page.evaluate(async (modulePath) => {
    const { openVizStreamingVideoEncoder } = await import(
      /* @vite-ignore */ modulePath
    );
    const cases = [
      { frameCount: 1, fps: 120 },
      { frameCount: 32, fps: 125 },
      { frameCount: 30, fps: 30 },
    ].flatMap((entry) =>
      (['mp4', 'webm'] as const).map((format) => ({ ...entry, format })),
    );
    const outputs = [];
    for (const entry of cases) {
      const sampleRate = 48_000;
      const count = Math.round((entry.frameCount / entry.fps) * sampleRate);
      const start = 5600; // frame 7 on a 60fps source, independent of export FPS.
      const pcm = new AudioBuffer({
        numberOfChannels: 1,
        sampleRate,
        length: start + count + 2000,
      });
      const data = pcm.getChannelData(0);
      // Band-limited nonperiodic signal avoids false correlation at another cycle of a chirp.
      let random = 0x12345678;
      let filtered = 0;
      for (let i = 0; i < data.length; i++) {
        random ^= random << 13;
        random ^= random >>> 17;
        random ^= random << 5;
        filtered = filtered * 0.7 + ((random >>> 0) / 0xffffffff - 0.5) * 0.3;
        data[i] = filtered;
      }
      const encoder = await openVizStreamingVideoEncoder({
        sourceFps: 60,
        signal: new AbortController().signal,
        audio: {
          load: async () => ({
            audioBuffer: pcm,
            sourceContentIdentity: 'nonperiodic-timing',
          }),
          decodedBytes: () => pcm.length * 4,
          dispose() {},
        },
        request: {
          schemaVersion: 1,
          kind: 'clip',
          source: { projectId: 'timing' },
          executorId: 'browser-webgl',
          intent: 'preview',
          outputLabel: 'timing',
          quality: 'high',
          startFrame: 7,
          ...entry,
          includeAudio: true,
          viewport: { width: 64, height: 48 },
        },
      });
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 48;
        for (let i = 0; i < entry.frameCount; i++)
          await encoder.addFrame(canvas, i);
        const result = await encoder.finalize();
        let decodedBrowserPcm: number[] | undefined;
        if (entry.format === 'webm') {
          const context = new AudioContext({ sampleRate: 48_000 });
          try {
            decodedBrowserPcm = Array.from(
              (
                await context.decodeAudioData(await result.blob.arrayBuffer())
              ).getChannelData(0),
            );
          } finally {
            await context.close();
          }
        }
        outputs.push({
          ...entry,
          decodedBrowserPcm,
          count,
          expected: Array.from(data.subarray(start, start + count)),
          diagnostics: result.diagnostics,
          bytes: Array.from(new Uint8Array(await result.blob.arrayBuffer())),
        });
      } finally {
        await encoder.dispose();
      }
    }
    return outputs;
  }, `/@fs/${process.cwd()}/src/lib/utils/video-encoder.ts`);
  const observations = [];
  for (const entry of encoded) {
    const bytes = Buffer.from(entry.bytes);
    let audioTrack: Buffer | undefined;
    let audioEdit: { offset: number; size: number } | undefined;
    let mediaStart = 0;
    let durationTicks = 0;
    let movieTimescale = 1;
    if (entry.format === 'mp4') {
      const moov = findBox(bytes, ['moov']);
      const tracks: Buffer[] = [];
      for (
        let offset = moov.offset + 8;
        offset < moov.offset + moov.size;
        offset += bytes.readUInt32BE(offset)
      ) {
        if (bytes.toString('ascii', offset + 4, offset + 8) === 'trak')
          tracks.push(
            bytes.subarray(offset, offset + bytes.readUInt32BE(offset)),
          );
      }
      const audio = tracks.find((track) => {
        const hdlr = findBox(track, ['trak', 'mdia', 'hdlr']);
        return (
          track.toString('ascii', hdlr.offset + 16, hdlr.offset + 20) === 'soun'
        );
      })!;
      const edit = findBox(audio, ['trak', 'edts', 'elst']);
      audioTrack = audio;
      audioEdit = edit;
      expect(audio[edit.offset + 8]).toBe(1);
      expect(audio.readUInt32BE(edit.offset + 12)).toBe(1);
      durationTicks = Number(audio.readBigUInt64BE(edit.offset + 16));
      mediaStart = Number(audio.readBigInt64BE(edit.offset + 24));
      const movie = findBox(bytes, ['moov', 'mvhd']);
      movieTimescale = bytes.readUInt32BE(
        movie.offset + (bytes[movie.offset + 8] === 1 ? 28 : 20),
      );
      const details = entry.diagnostics[0].details;
      expect(mediaStart).toBe(details.codecDelaySamples);
      expect(durationTicks / movieTimescale).toBeCloseTo(
        entry.count / 48_000,
        5,
      );
    } else {
      const timing = readWebmTiming(bytes);
      mediaStart = bytes.readUInt16LE(timing.opus.offset + 10);
      expect(bytes.readUIntBE(timing.delay.offset, timing.delay.size)).toBe(
        Math.round((mediaStart / 48000) * 1e9),
      );
      expect(bytes.readUIntBE(timing.preroll.offset, timing.preroll.size)).toBe(
        80_000_000,
      );
      expect(timing.durationSeconds).toBeCloseTo(entry.count / 48_000, 6);
      expect(timing.discard).toHaveLength(1);
      const padding = timing.discard[0]!;
      const discardNs = bytes.readIntBE(padding.offset, padding.size);
      expect(discardNs).toBeGreaterThan(0);
      expect(discardNs).toBeLessThan(20_000_000);
      durationTicks = timing.durationSeconds;
    }
    const path = testInfo.outputPath(`timing-${entry.count}.${entry.format}`);
    await writeFile(path, bytes);
    const decode = (file: string) =>
      execFileSync(ffmpeg, [
        '-v',
        'error',
        '-i',
        file,
        '-map',
        '0:a:0',
        '-f',
        'f32le',
        '-acodec',
        'pcm_f32le',
        'pipe:1',
      ]);
    const ffmpegPcm = decode(path);
    // FFmpeg has two independently verified first-and-last Opus packet trim bugs.
    // Web Audio decodes through a separate container/codec implementation, with
    // identical sample-count and signal invariants and corrupted-tail controls.
    const pcm =
      entry.format === 'webm'
        ? Buffer.alloc(entry.decodedBrowserPcm!.length * 4)
        : ffmpegPcm;
    if (entry.format === 'webm')
      entry.decodedBrowserPcm!.forEach((sample, i) =>
        pcm.writeFloatLE(sample, i * 4),
      );
    if (entry.format === 'webm') {
      await testInfo.attach(`webm-decoder-${entry.count}.json`, {
        contentType: 'application/json',
        body: Buffer.from(
          JSON.stringify({
            browser: entry.decodedBrowserPcm!.length,
            ffmpeg: ffmpegPcm.length / 4,
            count: entry.count,
          }),
        ),
      });
      expect(pcm.length / 4).toBe(entry.count);
      const timing = readWebmTiming(bytes);
      const padding = timing.discard[0]!;
      const wrongTail = Buffer.from(bytes);
      wrongTail.fill(0, padding.offset, padding.offset + padding.size);
      const wrongPath = testInfo.outputPath(`wrong-tail-${entry.count}.webm`);
      await writeFile(wrongPath, wrongTail);
      const wrongTailCount = await page.evaluate(
        async (bytes) => {
          const context = new AudioContext({ sampleRate: 48000 });
          try {
            return (await context.decodeAudioData(new Uint8Array(bytes).buffer))
              .length;
          } finally {
            await context.close();
          }
        },
        [...wrongTail],
      );
      expect(wrongTailCount).toBeGreaterThan(entry.count);
      const wrongDelay = Buffer.from(bytes);
      wrongDelay.writeUIntBE(
        bytes.readUIntBE(timing.delay.offset, timing.delay.size) + 1_000_000,
        timing.delay.offset,
        timing.delay.size,
      );
      const correctedOrigin = (candidate: Buffer) =>
        -candidate.readUIntBE(timing.delay.offset, timing.delay.size) / 1e9 +
        candidate.readUInt16LE(timing.opus.offset + 10) / 48000;
      expect(correctedOrigin(bytes)).toBe(0);
      expect(Math.abs(correctedOrigin(wrongDelay))).toBeGreaterThan(3 / 48000);
    }
    const alignment = (decoded: Buffer, expectedOffset: number) => {
      const width = Math.min(128, entry.count - expectedOffset);
      let best = { lag: 0, correlation: -Infinity };
      for (let lag = -1200; lag <= 1200; lag++) {
        let dot = 0;
        let energyA = 0;
        let energyB = 0;
        for (let i = 0; i < width; i++) {
          const position = expectedOffset + i + lag;
          const actual =
            position < 0 || position * 4 + 4 > decoded.length
              ? 0
              : decoded.readFloatLE(position * 4);
          const expected = entry.expected[expectedOffset + i]!;
          dot += actual * expected;
          energyA += actual * actual;
          energyB += expected * expected;
        }
        const correlation =
          energyA === 0 ? 0 : dot / Math.sqrt(energyA * energyB);
        if (correlation > best.correlation) best = { lag, correlation };
      }
      return best;
    };
    const points = [
      Math.min(48, entry.count - 128),
      Math.floor(entry.count / 2),
      entry.count - 128,
    ];
    const matches = points.map((point) => alignment(pcm, point));
    await testInfo.attach(`audio-match-${entry.format}-${entry.count}.json`, {
      contentType: 'application/json',
      body: Buffer.from(
        JSON.stringify({
          format: entry.format,
          count: entry.count,
          mediaStart,
          points,
          matches,
          diagnostics: entry.diagnostics,
        }),
      ),
    });
    for (const match of matches) {
      expect(Math.abs(match.lag)).toBeLessThanOrEqual(3);
      expect(match.correlation).toBeGreaterThan(0.9);
    }
    if (entry.format === 'mp4' && entry.count > 2000) {
      const audio = audioTrack!;
      const edit = audioEdit!;
      const wrongStart = Buffer.from(bytes);
      const absoluteEdit = audio.byteOffset - bytes.byteOffset + edit.offset;
      wrongStart.writeBigInt64BE(BigInt(mediaStart + 1024), absoluteEdit + 24);
      const wrongPath = testInfo.outputPath(`wrong-start-${entry.count}.mp4`);
      await writeFile(wrongPath, wrongStart);
      expect(
        Math.abs(alignment(decode(wrongPath), points[1]!).lag),
      ).toBeGreaterThan(800);
      const wrongEnd = Buffer.from(bytes);
      wrongEnd.writeBigUInt64BE(
        BigInt(durationTicks - Math.round((movieTimescale * 1024) / 48_000)),
        absoluteEdit + 16,
      );
      expect(
        Number(wrongEnd.readBigUInt64BE(absoluteEdit + 16)) / movieTimescale,
      ).not.toBeCloseTo(entry.count / 48_000, 5);
    }
    observations.push({
      format: entry.format,
      count: entry.count,
      fps: entry.fps,
      mediaStart,
      durationTicks,
      movieTimescale,
      matches,
      diagnostics: entry.diagnostics,
      decodedBlockSamples: pcm.length / 4,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  await testInfo.attach('audio-presentation-observation.json', {
    contentType: 'application/json',
    body: Buffer.from(JSON.stringify(observations, null, 2)),
  });
});

test('codec worker faults and held responses cannot strand cancellation or leak workers', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const unhandled: string[] = [];
  page.on('pageerror', (error) => unhandled.push(error.message));
  await page.route('**/__aac_fault_proof__', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body></body></html>',
    }),
  );
  await page.goto('/__aac_fault_proof__');
  const result = await page.evaluate(async (modulePath) => {
    const { openVizStreamingVideoEncoder } = await import(
      /* @vite-ignore */ modulePath
    );
    const NativeWorker = Worker;
    const pcm = new AudioBuffer({
      numberOfChannels: 1,
      sampleRate: 48_000,
      length: 48_000,
    });
    const audio = {
      load: async () => ({ audioBuffer: pcm, sourceContentIdentity: 'silent' }),
      decodedBytes: () => pcm.length * 4,
      dispose() {},
    };
    const outcomes = [];
    for (const fault of [
      'hold-init',
      'hold-encode',
      'hold-flush',
      'reject-encode',
      'worker-error',
      'none',
    ]) {
      const controller = new AbortController();
      let hit = false;
      let created = 0;
      let terminated = 0;
      class FaultWorker extends NativeWorker {
        private ended = false;
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          created++;
        }
        postMessage(message: unknown, transfer: Transferable[] = []) {
          const command = message as { id: number; command?: { type: string } };
          if (
            !hit &&
            command.command &&
            (fault === `hold-${command.command.type}` ||
              (command.command.type === 'encode' &&
                ['reject-encode', 'worker-error'].includes(fault)))
          ) {
            hit = true;
            if (fault.startsWith('hold-'))
              setTimeout(() => controller.abort(), 0);
            else if (fault === 'reject-encode')
              queueMicrotask(() =>
                this.dispatchEvent(
                  new MessageEvent('message', {
                    data: {
                      id: command.id,
                      success: false,
                      error: 'injected encoder rejection',
                    },
                  }),
                ),
              );
            else queueMicrotask(() => this.dispatchEvent(new Event('error')));
            return;
          }
          super.postMessage(message, transfer);
        }
        terminate() {
          if (!this.ended) {
            terminated++;
            this.ended = true;
          }
          super.terminate();
        }
      }
      globalThis.Worker = FaultWorker;
      let rejected = false;
      const start = performance.now();
      const encoder = await openVizStreamingVideoEncoder({
        sourceFps: 60,
        audio,
        signal: controller.signal,
        request: {
          schemaVersion: 1,
          kind: 'clip',
          source: { projectId: 'fault' },
          executorId: 'browser-webgl',
          intent: 'preview',
          outputLabel: 'fault',
          quality: 'draft',
          format: 'mp4',
          startFrame: 0,
          frameCount: 6,
          fps: 30,
          includeAudio: true,
          viewport: { width: 64, height: 48 },
        },
      });
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 48;
        for (let frame = 0; frame < 6; frame++)
          await encoder.addFrame(canvas, frame);
        await encoder.finalize();
      } catch {
        rejected = true;
      } finally {
        await encoder.dispose();
        globalThis.Worker = NativeWorker;
      }
      outcomes.push({
        fault,
        hit,
        rejected,
        created,
        terminated,
        elapsed: performance.now() - start,
      });
    }
    const directory = await navigator.storage.getDirectory();
    const files: string[] = [];
    for await (const [name] of directory as unknown as AsyncIterable<
      [string, unknown]
    >)
      if (name.startsWith('viz-render-')) files.push(name);
    return { outcomes, files };
  }, `/@fs/${process.cwd()}/src/lib/utils/video-encoder.ts`);
  await testInfo.attach('worker-lifecycle-observation.json', {
    contentType: 'application/json',
    body: Buffer.from(JSON.stringify({ ...result, unhandled }, null, 2)),
  });
  expect(result.files).toEqual([]);
  expect(unhandled).toEqual([]);
  for (const outcome of result.outcomes) {
    expect(outcome.hit).toBe(outcome.fault !== 'none');
    expect(outcome.rejected).toBe(outcome.fault !== 'none');
    expect(outcome.created).toBe(1);
    expect(outcome.terminated).toBe(1);
    expect(outcome.elapsed).toBeLessThan(5000);
  }
});

test('borrowed canvases preserve still alpha and distinct contact-sheet frames', async ({
  page,
}) => {
  await page.route('**/__image_export_proof__', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body></body></html>',
    }),
  );
  await page.goto('/__image_export_proof__');
  const result = await page.evaluate(async (modulePath) => {
    const { createVizBrowserRenderExecutor } = await import(
      /* @vite-ignore */ modulePath
    );
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext('2d')!;
    const executor = createVizBrowserRenderExecutor({
      openCaptureSession: async () => ({
        captureFrame: async ({ frame }: { frame: number }) => {
          context.clearRect(0, 0, 16, 16);
          context.fillStyle = frame === 0 ? '#ff0000' : '#0000ff';
          context.fillRect(0, 0, 8, 16);
          return canvas;
        },
        dispose() {},
      }),
    });
    const project = { projectId: 'image-proof', timeline: { fps: 60 } };
    const results = [];
    for (const kind of ['still', 'contact-sheet']) {
      const output = await executor.execute({
        request: {
          schemaVersion: 1,
          kind,
          frame: 0,
          frames: [0, 1],
          columns: 2,
          gap: 0,
          source: { projectId: project.projectId },
          executorId: executor.id,
          intent: 'preview',
          outputLabel: 'image',
          quality: 'high',
          format: 'png',
          viewport: { width: 16, height: 16 },
        },
        source: {
          project,
          resolvedAssets: [],
          resolvedArtifacts: [],
          contentIdentity: 'image',
        },
        signal: new AbortController().signal,
        onProgress() {},
      });
      try {
        const blob = await (await fetch(output.outputs[0].uri)).blob();
        const bitmap = await createImageBitmap(blob);
        const target = document.createElement('canvas');
        target.width = bitmap.width;
        target.height = bitmap.height;
        const drawing = target.getContext('2d')!;
        drawing.drawImage(bitmap, 0, 0);
        bitmap.close();
        results.push({
          kind,
          width: target.width,
          first: Array.from(drawing.getImageData(2, 2, 1, 1).data),
          alpha: drawing.getImageData(12, 2, 1, 1).data[3],
          last:
            kind === 'contact-sheet'
              ? Array.from(drawing.getImageData(18, 2, 1, 1).data)
              : undefined,
        });
      } finally {
        output.releaseOutputs();
      }
    }
    return { results, borrowedSize: [canvas.width, canvas.height] };
  }, `/@fs/${process.cwd()}/src/lib/utils/browser-render-executor.ts`);
  expect(result.borrowedSize).toEqual([16, 16]);
  expect(result.results[0]).toMatchObject({
    width: 16,
    first: [255, 0, 0, 255],
    alpha: 0,
  });
  expect(result.results[1]).toMatchObject({
    width: 32,
    first: [255, 0, 0, 255],
    last: [0, 0, 255, 255],
  });
});
