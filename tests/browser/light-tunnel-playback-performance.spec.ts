import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, release } from 'node:os';
import { dirname, resolve } from 'node:path';

const ENABLED = process.env.VIZ_LIGHT_TUNNEL_PERFORMANCE === '1';
const WARMUP_MILLISECONDS = 3_000;
const SAMPLE_MILLISECONDS = 5_000;
const GRAPH_WARMUP_MILLISECONDS = 1_500;
const GRAPH_SAMPLE_MILLISECONDS = 3_000;

interface PlaybackSample {
  displayIntervals: number[];
  runtimeIntervals: number[];
  planMilliseconds: number[];
  attachmentMilliseconds: number[];
  totalMilliseconds: number[];
  renderedFrames: number[];
  graphSignatures: string[];
  issueCodes: string[];
  issueFrameCount: number;
  longTasks: number[];
}

interface LiveControlSample {
  inputToTransientMs: number;
  inputToRuntimeMs: number;
  inputToVisibleMs: number;
}

declare global {
  interface Window {
    __vizLightTunnelControlSample?: Promise<LiveControlSample>;
  }
}

const percentile = (samples: readonly number[], ratio: number): number => {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[
    Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))
  ]!;
};

const summarize = (samples: readonly number[]) => ({
  count: samples.length,
  meanMs: samples.reduce((total, sample) => total + sample, 0) / samples.length,
  medianMs: percentile(samples, 0.5),
  p95Ms: percentile(samples, 0.95),
  p99Ms: percentile(samples, 0.99),
  maximumMs: Math.max(...samples),
});

const summarizePlayback = (
  sample: PlaybackSample,
  sampleMilliseconds: number,
) => ({
  display: summarize(sample.displayIntervals),
  runtime: {
    ...summarize(sample.runtimeIntervals),
    cadenceFps: sample.renderedFrames.length / (sampleMilliseconds / 1_000),
  },
  planning: summarize(sample.planMilliseconds),
  attachment: summarize(sample.attachmentMilliseconds),
  total: summarize(sample.totalMilliseconds),
  renderedFrameCount: new Set(sample.renderedFrames).size,
  renderedFrameSpan:
    sample.renderedFrames.length === 0
      ? 0
      : Math.max(...sample.renderedFrames) -
        Math.min(...sample.renderedFrames) +
        1,
  changingGraphStateCount: new Set(sample.graphSignatures).size,
  issueCodes: [...new Set(sample.issueCodes)],
  issueFrameCount: sample.issueFrameCount,
  longTasks: summarize(sample.longTasks.length > 0 ? sample.longTasks : [0]),
  over33Milliseconds: sample.displayIntervals.filter((value) => value > 33.33)
    .length,
});

const isKnownBrowserDiagnostic = (message: string): boolean =>
  message.includes('GL Driver Message') &&
  message.includes('GPU stall due to ReadPixels');

const waitForEditor = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    localStorage.setItem('vizengine-has-seen-tutorial', 'true');
  });
  await page.goto('/?allowSmallViewport=1');
  await expect(page.getByTestId('viz-editor')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__vizEditorDebug)))
    .toBe(true);
  await page.evaluate(async () => {
    await window.__vizEditorDebug?.editorControl.persistence.loadProjectFromUrl(
      '/projects/light-tunnel.vizengine.json',
    );
  });
  await expect(page.getByTestId('layer-card')).toHaveCount(2);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const runtime =
          window.__vizEditorDebug?.editorControl.preview.inspectRuntimePreview();
        return {
          projectId:
            window.__vizEditorDebug?.vizSessionStore.getState().project
              .workingProject.projectId,
          renderedLayers: runtime?.lastRenderedLayerIds.length,
          graphResults: runtime?.lastGraphResults.length,
          issues: runtime?.lastPlanIssues.length,
        };
      }),
    )
    .toEqual({
      projectId: 'light-tunnel',
      renderedLayers: 2,
      graphResults: 9,
      issues: 0,
    });
};

const readCanvasFingerprints = (page: Page, selector: string) =>
  page.evaluate((canvasSelector) => {
    return [
      ...document.querySelectorAll<HTMLCanvasElement>(canvasSelector),
    ].map((canvas) => {
      const sample = document.createElement('canvas');
      sample.width = 64;
      sample.height = 36;
      const context = sample.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Cannot inspect runtime preview pixels.');
      context.drawImage(canvas, 0, 0, sample.width, sample.height);
      const pixels = context.getImageData(
        0,
        0,
        sample.width,
        sample.height,
      ).data;
      let hash = 2_166_136_261;
      let visiblePixels = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3]! > 8) visiblePixels += 1;
        for (let channel = 0; channel < 4; channel += 1) {
          hash ^= pixels[index + channel]!;
          hash = Math.imul(hash, 16_777_619);
        }
      }
      return { hash: hash >>> 0, visiblePixels };
    });
  }, selector);

const observeThumbnailMotion = async (
  page: Page,
  initial: Array<{ hash: number }>,
): Promise<number[]> => {
  const hashes = initial.map((thumbnail) => new Set([thumbnail.hash]));
  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.preview.play(),
  );
  for (let sample = 0; sample < 12; sample += 1) {
    await page.waitForTimeout(100);
    const thumbnails = await readCanvasFingerprints(
      page,
      'canvas[data-testid="layer-mirror-canvas"]',
    );
    thumbnails.forEach((thumbnail, index) =>
      hashes[index]?.add(thumbnail.hash),
    );
  }
  await page.evaluate(() => {
    const preview = window.__vizEditorDebug?.editorControl.preview;
    preview?.pause();
    preview?.seekToFrame(0);
  });
  return hashes.map((values) => values.size);
};

const collectPlayback = (
  page: Page,
  warmupMilliseconds: number,
  sampleMilliseconds: number,
): Promise<PlaybackSample> =>
  page.evaluate(
    ({ warmup, sample }) =>
      new Promise<PlaybackSample>((resolveSample) => {
        const debug = window.__vizEditorDebug;
        if (!debug) throw new Error('Viz editor debug control is not mounted.');
        const displayIntervals: number[] = [];
        const runtimeIntervals: number[] = [];
        const planMilliseconds: number[] = [];
        const attachmentMilliseconds: number[] = [];
        const totalMilliseconds: number[] = [];
        const renderedFrames: number[] = [];
        const graphSignatures: string[] = [];
        const issueCodes: string[] = [];
        let issueFrameCount = 0;
        const longTasks: number[] = [];
        const startedAt = performance.now();
        let previousDisplay = startedAt;
        let previousRuntime: number | undefined;
        const observer =
          'PerformanceObserver' in window
            ? new PerformanceObserver((entries) => {
                for (const entry of entries.getEntries()) {
                  if (
                    entry.entryType === 'longtask' &&
                    performance.now() - startedAt >= warmup
                  ) {
                    longTasks.push(entry.duration);
                  }
                }
              })
            : undefined;
        observer?.observe({ entryTypes: ['longtask'] });
        const unsubscribe = debug.editorControl.preview.subscribeRuntimePreview(
          (runtime) => {
            const now = performance.now();
            if (now - startedAt < warmup) {
              previousRuntime = now;
              return;
            }
            if (previousRuntime !== undefined) {
              runtimeIntervals.push(now - previousRuntime);
            }
            previousRuntime = now;
            if (runtime.lastTimings) {
              planMilliseconds.push(runtime.lastTimings.planMilliseconds);
              attachmentMilliseconds.push(
                runtime.lastTimings.attachmentMilliseconds,
              );
              totalMilliseconds.push(runtime.lastTimings.totalMilliseconds);
            }
            if (runtime.lastCompletedFrame)
              renderedFrames.push(runtime.lastCompletedFrame.currentFrame);
            graphSignatures.push(
              JSON.stringify(
                runtime.lastGraphResults.map((result) => result.values),
              ),
            );
            issueCodes.push(
              ...runtime.lastPlanIssues.map((issue) => issue.code),
            );
            if (runtime.lastPlanIssues.length > 0) issueFrameCount += 1;
          },
        );
        debug.editorControl.preview.play();
        const collect = (now: number) => {
          if (now - startedAt >= warmup) {
            displayIntervals.push(now - previousDisplay);
          }
          previousDisplay = now;
          if (now - startedAt < warmup + sample) {
            requestAnimationFrame(collect);
            return;
          }
          debug.editorControl.preview.pause();
          unsubscribe();
          observer?.disconnect();
          resolveSample({
            displayIntervals,
            runtimeIntervals,
            planMilliseconds,
            attachmentMilliseconds,
            totalMilliseconds,
            renderedFrames,
            graphSignatures,
            issueCodes,
            issueFrameCount,
            longTasks,
          });
        };
        requestAnimationFrame(collect);
      }),
    { warmup: warmupMilliseconds, sample: sampleMilliseconds },
  );

const armLiveControlSample = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const debug = window.__vizEditorDebug;
    if (!debug) throw new Error('Viz editor debug control is not mounted.');
    const beforeCycle =
      debug.editorControl.preview.inspectRuntimePreview().renderCycle;

    window.__vizLightTunnelControlSample = new Promise(
      (resolveSample, reject) => {
        let inputAt: number | undefined;
        let transientAt: number | undefined;
        let settled = false;
        const cleanup = () => {
          window.removeEventListener('pointermove', onPointerMove, true);
          unsubscribeLive();
          unsubscribeRuntime();
          window.clearTimeout(timeout);
        };
        const onPointerMove = () => {
          inputAt = performance.now();
        };
        window.addEventListener('pointermove', onPointerMove, {
          capture: true,
          once: true,
        });
        const unsubscribeLive = debug.vizSessionHost.subscribeLiveProjectValues(
          () => {
            if (inputAt !== undefined && transientAt === undefined) {
              transientAt = performance.now();
            }
          },
        );
        const unsubscribeRuntime =
          debug.editorControl.preview.subscribeRuntimePreview((runtime) => {
            if (
              settled ||
              inputAt === undefined ||
              transientAt === undefined ||
              runtime.renderCycle <= beforeCycle
            ) {
              return;
            }
            settled = true;
            const runtimeAt = performance.now();
            requestAnimationFrame(() => {
              cleanup();
              resolveSample({
                inputToTransientMs: transientAt! - inputAt!,
                inputToRuntimeMs: runtimeAt - inputAt!,
                inputToVisibleMs: performance.now() - inputAt!,
              });
            });
          });
        const timeout = window.setTimeout(() => {
          if (!settled) {
            settled = true;
            cleanup();
            reject(new Error('Timed out measuring a live Light Tunnel edit.'));
          }
        }, 2_000);
      },
    );
  });

const readLiveControlSample = (page: Page): Promise<LiveControlSample> =>
  page.evaluate(() => {
    if (!window.__vizLightTunnelControlSample) {
      throw new Error('A live Light Tunnel control sample was not armed.');
    }
    return window.__vizLightTunnelControlSample;
  });

test.skip(!ENABLED, 'Run with pnpm benchmark:light-tunnel-headed.');

test('sustains the exact Light Tunnel project with and without its graph open', async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  test.setTimeout(120_000);
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isKnownBrowserDiagnostic(message.text())
    ) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) =>
    diagnostics.push(`pageerror: ${error.message}`),
  );

  await waitForEditor(page);
  const before = (
    await readCanvasFingerprints(page, 'canvas[data-runtime-preview-canvas]')
  )[0]!;
  const thumbnailsBefore = await readCanvasFingerprints(
    page,
    'canvas[data-testid="layer-mirror-canvas"]',
  );
  const thumbnailMotion = await observeThumbnailMotion(page, thumbnailsBefore);
  const closedSample = await collectPlayback(
    page,
    WARMUP_MILLISECONDS,
    SAMPLE_MILLISECONDS,
  );
  const graphId = await page.evaluate(() => {
    const project =
      window.__vizEditorDebug?.vizSessionStore.getState().project
        .workingProject;
    const source = project?.layers.find(
      (layer) => layer.componentId === 'light-tunnel',
    )?.inputs?.['wave:triggerWave'];
    return source?.kind === 'graph-output' ? source.graphId : undefined;
  });
  if (!graphId) throw new Error('Light Tunnel trigger graph is unavailable.');
  await page.evaluate((id) => {
    const control = window.__vizEditorDebug?.editorControl;
    control?.nodeEditor.openNetwork(id);
    control?.nodeEditor.focus();
  }, graphId);
  await expect(page.getByTestId('node-network')).toBeVisible();
  const openSample = await collectPlayback(
    page,
    GRAPH_WARMUP_MILLISECONDS,
    GRAPH_SAMPLE_MILLISECONDS,
  );
  const lightTunnelCard = page.locator(
    '[data-testid="layer-card"][data-layer-id="layer-Light Tunnel-1760643746953"]',
  );
  await lightTunnelCard.getByRole('button', { name: 'Settings' }).click();
  const opacitySlider = lightTunnelCard.getByRole('slider', {
    name: 'Opacity',
  });
  await expect(opacitySlider).toBeVisible();
  await opacitySlider.scrollIntoViewIfNeeded();
  const sliderBounds = await opacitySlider.boundingBox();
  const trackBounds = await opacitySlider.evaluate((thumb) => {
    const track = thumb.parentElement?.parentElement;
    if (!track) throw new Error('Opacity slider track is unavailable.');
    const bounds = track.getBoundingClientRect();
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
  });
  if (!sliderBounds) throw new Error('Opacity slider is not visible.');
  const revisionBeforeControl = await page.evaluate(
    () =>
      window.__vizEditorDebug?.vizSessionStore.getState().project.revision ??
      -1,
  );
  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.preview.play(),
  );
  await page.mouse.move(
    sliderBounds.x + sliderBounds.width / 2,
    sliderBounds.y + sliderBounds.height / 2,
  );
  await page.mouse.down();
  await armLiveControlSample(page);
  await page.mouse.move(
    trackBounds.x + trackBounds.width * 0.9,
    trackBounds.y + trackBounds.height / 2,
  );
  await readLiveControlSample(page);
  const controlSamples: LiveControlSample[] = [];
  for (const ratio of [
    0.82, 0.68, 0.54, 0.4, 0.58, 0.76, 0.62, 0.48, 0.34, 0.52, 0.7, 0.84,
  ]) {
    await armLiveControlSample(page);
    await page.mouse.move(
      trackBounds.x + trackBounds.width * ratio,
      trackBounds.y + trackBounds.height / 2,
    );
    controlSamples.push(await readLiveControlSample(page));
    expect(
      await page.evaluate(
        () =>
          window.__vizEditorDebug?.vizSessionStore.getState().project
            .revision ?? -1,
      ),
    ).toBe(revisionBeforeControl);
  }
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__vizEditorDebug?.vizSessionStore.getState().project
            .revision ?? -1,
      ),
    )
    .toBe(revisionBeforeControl + 1);
  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.preview.pause(),
  );
  const after = (
    await readCanvasFingerprints(page, 'canvas[data-runtime-preview-canvas]')
  )[0]!;
  const thumbnailsAfter = await readCanvasFingerprints(
    page,
    'canvas[data-testid="layer-mirror-canvas"]',
  );
  const runtime = await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.preview.inspectRuntimePreview(),
  );
  const finalLayers = await page.evaluate(
    () =>
      window.__vizEditorDebug?.vizSessionStore
        .getState()
        .project.workingProject.layers.map((layer) => ({
          id: layer.id,
          enabled: layer.enabled,
        })) ?? [],
  );
  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.nodeEditor.closeNetwork(),
  );
  const closed = summarizePlayback(closedSample, SAMPLE_MILLISECONDS);
  const open = summarizePlayback(openSample, GRAPH_SAMPLE_MILLISECONDS);
  const interaction = {
    inputToTransient: summarize(
      controlSamples.map((sample) => sample.inputToTransientMs),
    ),
    inputToRuntime: summarize(
      controlSamples.map((sample) => sample.inputToRuntimeMs),
    ),
    inputToVisible: summarize(
      controlSamples.map((sample) => sample.inputToVisibleMs),
    ),
    revisionDelta:
      (await page.evaluate(
        () =>
          window.__vizEditorDebug?.vizSessionStore.getState().project
            .revision ?? -1,
      )) - revisionBeforeControl,
  };
  const report = {
    schemaVersion: 1,
    revision: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    recordedAt: new Date().toISOString(),
    environment: {
      browserName,
      browserVersion: browser.version(),
      headless: false,
      platform: platform(),
      release: release(),
      architecture: arch(),
      cpu: cpus()[0]?.model ?? 'unknown',
      viewport: await page.evaluate(() => ({
        width: innerWidth,
        height: innerHeight,
        devicePixelRatio,
      })),
    },
    fixture: {
      projectId: 'light-tunnel',
      layers: 2,
      graphs: 9,
      nodes: 57,
      quality: await page
        .getByRole('spinbutton', { name: 'Quality' })
        .inputValue(),
      layerMirrors: thumbnailsAfter.length,
      compositeMirrors: await page
        .locator('canvas[data-composite-mirror]')
        .count(),
      warmupMilliseconds: WARMUP_MILLISECONDS,
      sampleMilliseconds: SAMPLE_MILLISECONDS,
      graphWarmupMilliseconds: GRAPH_WARMUP_MILLISECONDS,
      graphSampleMilliseconds: GRAPH_SAMPLE_MILLISECONDS,
    },
    closed,
    graphOpen: open,
    interaction,
    thumbnailMotion,
    canvas: { before, after, thumbnailsBefore, thumbnailsAfter },
    finalIssues: runtime?.lastPlanIssues ?? [],
    finalLayers,
    diagnostics,
  };
  const reportJson = `${JSON.stringify(report, null, 2)}\n`;
  const attachedPath = testInfo.outputPath('light-tunnel-headed.json');
  await writeFile(attachedPath, reportJson);
  await testInfo.attach('light-tunnel-headed', {
    path: attachedPath,
    contentType: 'application/json',
  });
  if (process.env.VIZ_LIGHT_TUNNEL_HEADED_REPORT) {
    const reportPath = resolve(process.env.VIZ_LIGHT_TUNNEL_HEADED_REPORT);
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, reportJson);
  }

  expect(before.visiblePixels).toBeGreaterThan(500);
  expect(after.visiblePixels).toBeGreaterThan(500);
  expect(after.hash).not.toBe(before.hash);
  expect(thumbnailsBefore).toHaveLength(2);
  expect(thumbnailsAfter).toHaveLength(2);
  for (const thumbnail of thumbnailsAfter) {
    expect(thumbnail.visiblePixels).toBeGreaterThan(500);
  }
  expect(thumbnailMotion.some((sampleCount) => sampleCount > 1)).toBe(true);
  expect(closed.runtime.cadenceFps).toBeGreaterThanOrEqual(59);
  expect(closed.planning.p95Ms).toBeLessThanOrEqual(5);
  expect(closed.total.p95Ms).toBeLessThanOrEqual(12);
  expect(closed.display.p95Ms).toBeLessThanOrEqual(20);
  expect(closed.over33Milliseconds).toBe(0);
  expect(closed.longTasks.maximumMs).toBe(0);
  expect(closed.changingGraphStateCount).toBeGreaterThan(30);
  expect(closed.issueCodes).toEqual([]);
  expect(closed.issueFrameCount).toBe(0);
  expect(closed.renderedFrameCount).toBe(closed.renderedFrameSpan);
  expect(closed.renderedFrameSpan).toBeGreaterThanOrEqual(275);
  expect(open.runtime.cadenceFps).toBeGreaterThanOrEqual(59);
  expect(open.total.p95Ms).toBeLessThanOrEqual(12);
  expect(open.display.p95Ms).toBeLessThanOrEqual(20);
  expect(open.over33Milliseconds).toBe(0);
  expect(open.longTasks.maximumMs).toBe(0);
  expect(open.issueCodes).toEqual([]);
  expect(open.issueFrameCount).toBe(0);
  expect(open.renderedFrameCount).toBe(open.renderedFrameSpan);
  expect(open.renderedFrameSpan).toBeGreaterThanOrEqual(165);
  expect(interaction.inputToTransient.p95Ms).toBeLessThanOrEqual(2);
  expect(interaction.inputToRuntime.p95Ms).toBeLessThanOrEqual(30);
  expect(interaction.inputToVisible.p95Ms).toBeLessThanOrEqual(40);
  expect(interaction.inputToVisible.maximumMs).toBeLessThanOrEqual(80);
  expect(interaction.revisionDelta).toBe(1);
  expect(runtime?.lastPlanIssues).toEqual([]);
  expect(finalLayers).toHaveLength(2);
  expect(finalLayers.every((layer) => layer.enabled)).toBe(true);
  expect(diagnostics).toEqual([]);
});
