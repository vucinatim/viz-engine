import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const createWaveFile = () => {
  const sampleRate = 8_000;
  const samples = sampleRate;
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index += 1) {
    bytes.writeInt16LE(
      Math.round(Math.sin((index / sampleRate) * Math.PI * 2 * 220) * 12_000),
      44 + index * 2,
    );
  }
  return bytes;
};

const waitForAudioEditor = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('vizengine-has-seen-tutorial', 'true');
    Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
      configurable: true,
      value: async () => {
        if ((window as any).__captureTestMode !== 'success') {
          throw new DOMException(
            'Permission denied for test',
            'NotAllowedError',
          );
        }
        const context = new AudioContext();
        const stream = context.createMediaStreamDestination().stream;
        (window as any).__captureTestStream = stream;
        (window as any).__captureTestContext = context;
        return stream;
      },
    });
  });
  await page.goto('/?allowSmallViewport=1');
  await expect(page.getByTestId('viz-editor')).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => Boolean(window.__vizEditorDebug)))
    .toBe(true);
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug?.vizSessionHost.getSnapshot().audioSession
            .source?.kind,
      ),
    )
    .toBe('media-element');
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const audio = document.querySelector('audio');
        return Boolean(audio && Number.isFinite(audio.duration));
      }),
    )
    .toBe(true);
};

test('keeps audio transport, loading, capture, and volume responsive', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !(
        message.text().includes('GL Driver Message') &&
        message.text().includes('GPU stall due to ReadPixels')
      )
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => diagnostics.push(error.message));

  await waitForAudioEditor(page);
  await expect(
    page.getByRole('slider', { name: 'Audio volume' }),
  ).toBeVisible();
  await expect(
    page.getByRole('slider', { name: 'Waveform position' }),
  ).toBeVisible();
  await expect(
    page.getByRole('slider', { name: 'Track overview position' }),
  ).toBeVisible();

  const initialBundledSource = await page.evaluate(
    () =>
      window.__vizEditorDebug!.vizSessionHost.getSnapshot().audioSession.source
        ?.uri,
  );
  await page.getByRole('button', { name: 'Next track' }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug!.vizSessionHost.getSnapshot().audioSession
            .source?.uri,
      ),
    )
    .not.toBe(initialBundledSource);
  await page.getByRole('button', { name: 'Previous track' }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug!.vizSessionHost.getSnapshot().audioSession
            .source?.uri,
      ),
    )
    .toBe(initialBundledSource);

  await page.getByLabel('Play/Pause').click();
  await expect
    .poll(async () =>
      page.evaluate(() => !document.querySelector('audio')?.paused),
    )
    .toBe(true);
  const playback = await page.evaluate(
    () =>
      new Promise<{ frameDelta: number; sessionUpdates: number }>((resolve) => {
        const debug = window.__vizEditorDebug!;
        const startFrame =
          debug.vizSessionHost.getSnapshot().transport.currentFrame;
        let sessionUpdates = 0;
        const unsubscribe = debug.vizSessionStore.subscribe(() => {
          sessionUpdates += 1;
        });
        window.setTimeout(() => {
          const frameDelta =
            debug.vizSessionHost.getSnapshot().transport.currentFrame -
            startFrame;
          unsubscribe();
          debug.editorControl.preview.pause();
          resolve({ frameDelta, sessionUpdates });
        }, 700);
      }),
  );
  expect(playback.frameDelta).toBeGreaterThan(15);
  expect(playback.sessionUpdates).toBe(0);

  const revisionBeforeVolume = await page.evaluate(
    () => window.__vizEditorDebug!.vizSessionStore.getState().project.revision,
  );
  const volume = page.getByRole('slider', { name: 'Audio volume' });
  await volume.evaluate((element) => {
    const samples: Array<{ time: number; value: number }> = [];
    (window as any).__audioVolumeSamples = samples;
    (window as any).__audioVolumeObserver = new MutationObserver(() => {
      samples.push({
        time: performance.now(),
        value: Number(element.getAttribute('aria-valuenow')),
      });
    });
    (window as any).__audioVolumeObserver.observe(element, {
      attributes: true,
      attributeFilter: ['aria-valuenow'],
    });
  });
  const volumeBounds = await page
    .getByTestId('audio-volume-slider')
    .boundingBox();
  expect(volumeBounds).not.toBeNull();
  await page.mouse.move(
    volumeBounds!.x + volumeBounds!.width / 2,
    volumeBounds!.y + 3,
  );
  await page.mouse.down();
  await page.mouse.move(
    volumeBounds!.x + volumeBounds!.width / 2,
    volumeBounds!.y + volumeBounds!.height * 0.55,
    { steps: 20 },
  );
  await page.mouse.up();
  const committedVolume = Number(await volume.getAttribute('aria-valuenow'));
  const volumeSamples = await page.evaluate(() => {
    (window as any).__audioVolumeObserver?.disconnect();
    return (window as any).__audioVolumeSamples as Array<{
      time: number;
      value: number;
    }>;
  });
  expect(committedVolume).toBeGreaterThan(0.35);
  expect(committedVolume).toBeLessThan(0.65);
  expect(
    new Set(volumeSamples.map((sample) => sample.value)).size,
  ).toBeGreaterThan(10);
  expect(
    await page.evaluate(
      () =>
        window.__vizEditorDebug!.vizSessionStore.getState().project.revision,
    ),
  ).toBe(revisionBeforeVolume);
  await volume.press('Home');
  await expect(volume).toHaveAttribute('aria-valuenow', '0');
  await volume.press('End');
  await expect(volume).toHaveAttribute('aria-valuenow', '1');

  const waveform = page.getByRole('slider', { name: 'Waveform position' });
  await waveform.focus();
  await waveform.press('End');
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const transport =
          window.__vizEditorDebug!.vizSessionHost.getSnapshot().transport;
        return transport.durationFrames - transport.currentFrame;
      }),
    )
    .toBeLessThanOrEqual(2);
  await waveform.press('Home');
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug!.vizSessionHost.getSnapshot().transport
            .currentFrame,
      ),
    )
    .toBe(0);

  const validSource = await page.evaluate(
    () =>
      window.__vizEditorDebug!.vizSessionHost.getSnapshot().audioSession.source
        ?.uri,
  );
  await page.locator('input[name="audio-file"]').setInputFiles({
    name: 'broken.mp3',
    mimeType: 'audio/mpeg',
    buffer: Buffer.from('not an audio file'),
  });
  await expect(page.getByRole('alert')).toContainText(
    'could not be decoded by the browser',
  );
  expect(
    await page.evaluate(
      () =>
        window.__vizEditorDebug!.vizSessionHost.getSnapshot().audioSession
          .source?.uri,
    ),
  ).toBe(validSource);

  await page.locator('input[name="audio-file"]').setInputFiles({
    name: 'valid.wav',
    mimeType: 'audio/wav',
    buffer: createWaveFile(),
  });
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug!.vizSessionHost.getSnapshot().audioSession
            .source?.kind,
      ),
    )
    .toBe('file');
  await expect
    .poll(async () =>
      page.evaluate(() => document.querySelector('audio')?.duration),
    )
    .toBeCloseTo(1, 1);
  await expect
    .poll(async () =>
      waveform.evaluate((canvas) => {
        const context = (canvas as HTMLCanvasElement).getContext('2d');
        if (!context) return 0;
        const pixels = context.getImageData(
          0,
          0,
          (canvas as HTMLCanvasElement).width,
          (canvas as HTMLCanvasElement).height,
        ).data;
        return pixels.some((channel) => channel > 0) ? 1 : 0;
      }),
    )
    .toBe(1);
  const localSource = await page.evaluate(
    () =>
      window.__vizEditorDebug!.vizSessionHost.getSnapshot().audioSession.source
        ?.uri,
  );

  const captureButton = page.getByRole('button', {
    name: 'Capture Tab Audio',
  });
  await expect(captureButton).toBeEnabled();
  await captureButton.click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Permission denied for test' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        window.__vizEditorDebug!.vizSessionHost.getSnapshot().audioSession
          .source?.uri,
    ),
  ).toBe(localSource);

  await page.evaluate(() => {
    (window as any).__captureTestMode = 'success';
  });
  await captureButton.click();
  await expect(
    page.getByRole('button', { name: 'Stop Tab Audio' }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug!.vizSessionHost.getSnapshot().audioSession
            .source?.kind,
      ),
    )
    .toBe('stream');
  await page.getByRole('button', { name: 'Stop Tab Audio' }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug!.vizSessionHost.getSnapshot().audioSession
            .source?.uri,
      ),
    )
    .toBe(localSource);
  expect(
    await page.evaluate(() =>
      (window as any).__captureTestStream
        .getTracks()
        .every((track: MediaStreamTrack) => track.readyState === 'ended'),
    ),
  ).toBe(true);

  expect(diagnostics).toEqual([]);

  const reportPath = process.env.VIZ_AUDIO_PERFORMANCE_REPORT;
  if (reportPath) {
    const intervals = volumeSamples
      .slice(1)
      .map((sample, index) => sample.time - volumeSamples[index]!.time)
      .toSorted((left, right) => left - right);
    const percentile = (fraction: number) =>
      intervals[Math.floor((intervals.length - 1) * fraction)] ?? 0;
    const absolutePath = resolve(reportPath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(
      absolutePath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          scenario: 'audio-workflow',
          playback: {
            observedFrames: playback.frameDelta,
            reactSessionUpdates: playback.sessionUpdates,
          },
          volumeDrag: {
            changedValues: new Set(volumeSamples.map((sample) => sample.value))
              .size,
            committedValue: committedVolume,
            medianUpdateIntervalMs: percentile(0.5),
            p95UpdateIntervalMs: percentile(0.95),
            maximumUpdateIntervalMs: intervals.at(-1) ?? 0,
            projectRevisionDelta: 0,
          },
          sourceFailure: {
            preservedPreviousSource: true,
            visibleError: true,
            validLocalWaveform: true,
          },
          captureDenial: {
            preservedPreviousSource: true,
            visibleError: true,
          },
          captureLifecycle: {
            restoredPreviousSource: true,
            stoppedAllTracks: true,
          },
          diagnostics,
        },
        null,
        2,
      )}\n`,
    );
  }
});
