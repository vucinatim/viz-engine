import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const waitForAudioEditor = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('vizengine-has-seen-tutorial', 'true');
  });
  await page.goto('/?allowSmallViewport=1');
  await expect(page.getByTestId('viz-editor')).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => Boolean(window.__vizEditorDebug)))
    .toBe(true);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const audio = document.querySelector('audio');
        return Boolean(audio && Number.isFinite(audio.duration));
      }),
    )
    .toBe(true);
};

test('keeps waveform gestures live and Rhythm Lab analysis coherent', async ({
  page,
}) => {
  test.setTimeout(90_000);
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
  const revisionBefore = await page.evaluate(
    () => window.__vizEditorDebug!.vizSessionStore.getState().project.revision,
  );
  const initialSelection = await page.evaluate(
    () => window.__vizEditorDebug!.editorStore.getState().rhythmSelection,
  );
  await page.evaluate(() => {
    const debug = window.__vizEditorDebug!;
    (window as any).__rhythmSelectionUpdates = 0;
    (window as any).__rhythmSelectionUnsubscribe = debug.editorStore.subscribe(
      (state, previous) => {
        if (state.rhythmSelection !== previous.rhythmSelection) {
          (window as any).__rhythmSelectionUpdates += 1;
        }
      },
    );
    const overlay = document.querySelector(
      '[data-testid="waveform-selection-window"]',
    )!;
    (window as any).__waveformPresentationSamples = [];
    (window as any).__waveformPresentationObserver = new MutationObserver(
      () => {
        (window as any).__waveformPresentationSamples.push({
          time: performance.now(),
          left: (overlay as HTMLElement).style.left,
          width: (overlay as HTMLElement).style.width,
        });
      },
    );
    (window as any).__waveformPresentationObserver.observe(overlay, {
      attributes: true,
      attributeFilter: ['style'],
    });
  });

  const viewWindow = page.getByTestId('waveform-view-window');
  const selectionOverlay = page.getByTestId('waveform-selection-window');
  const viewBounds = await viewWindow.boundingBox();
  expect(viewBounds).not.toBeNull();
  const startX = viewBounds!.x + viewBounds!.width * 0.1;
  const endX = viewBounds!.x + viewBounds!.width * 0.36;
  const y = viewBounds!.y + viewBounds!.height / 2;
  const leftBeforeDrag = await selectionOverlay.evaluate(
    (element) => (element as HTMLElement).style.left,
  );

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 24 });
  expect(
    await page.evaluate(() => (window as any).__rhythmSelectionUpdates),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => window.__vizEditorDebug!.editorStore.getState().rhythmSelection,
    ),
  ).toEqual(initialSelection);
  expect(
    await selectionOverlay.evaluate(
      (element) => (element as HTMLElement).style.left,
    ),
  ).not.toBe(leftBeforeDrag);
  await page.mouse.up();

  await expect
    .poll(async () =>
      page.evaluate(() => (window as any).__rhythmSelectionUpdates),
    )
    .toBe(1);
  const draggedSelection = await page.evaluate(
    () => window.__vizEditorDebug!.editorStore.getState().rhythmSelection,
  );
  expect(draggedSelection.start).toBeGreaterThan(initialSelection.start);
  const pointerPresentationSamples = await page.evaluate(() => {
    const samples = [
      ...((window as any).__waveformPresentationSamples as Array<{
        time: number;
        left: string;
        width: string;
      }>),
    ];
    (window as any).__waveformPresentationSamples = [];
    return samples;
  });
  expect(
    new Set(pointerPresentationSamples.map((sample) => sample.left)).size,
  ).toBeGreaterThan(10);

  const widthBeforeWheel = draggedSelection.end - draggedSelection.start;
  await viewWindow.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    for (let index = 0; index < 6; index += 1) {
      element.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          deltaY: -100,
        }),
      );
    }
  });
  expect(
    await page.evaluate(() => (window as any).__rhythmSelectionUpdates),
  ).toBe(1);
  await expect
    .poll(async () =>
      page.evaluate(() => (window as any).__rhythmSelectionUpdates),
    )
    .toBe(2);
  const zoomedSelection = await page.evaluate(
    () => window.__vizEditorDebug!.editorStore.getState().rhythmSelection,
  );
  expect(zoomedSelection.end - zoomedSelection.start).toBeLessThan(
    widthBeforeWheel,
  );

  await viewWindow.focus();
  await viewWindow.press('ArrowRight');
  await expect
    .poll(async () =>
      page.evaluate(() => (window as any).__rhythmSelectionUpdates),
    )
    .toBe(3);

  expect(
    await page.evaluate(
      () =>
        window.__vizEditorDebug!.vizSessionStore.getState().project.revision,
    ),
  ).toBe(revisionBefore);

  await page.getByRole('button', { name: 'Rhythm Lab' }).click();
  await expect(page.getByTestId('rhythm-stage-card')).toHaveCount(5);
  await expect(page.getByTestId('rhythm-analysis-status')).toHaveText(
    /Ready to analyze|Analysis ready/,
  );
  await expect(page.getByTestId('rhythm-selection-info')).not.toHaveText(
    '0.00s - 0.00s (0.00s)',
  );

  const analyze = page.getByRole('button', { name: /Analyze|Recompute/ });
  await analyze.click();
  await expect(page.getByTestId('rhythm-analysis-status')).toHaveText(
    'Analysis ready',
    { timeout: 30_000 },
  );
  const firstAnalysis = await page.evaluate(() => {
    const state = window.__vizEditorDebug!.rhythmLabStore.getState();
    (window as any).__firstRhythmAnalysisSource = state.analysisSource;
    return {
      frames: state.stats.frames,
      onsetPoints: state.onsetEnv?.length ?? 0,
      sampleCount: state.analysisMeta?.sampleCount ?? 0,
    };
  });
  expect(firstAnalysis.frames).toBeGreaterThan(0);
  expect(firstAnalysis.onsetPoints).toBeGreaterThan(0);
  expect(firstAnalysis.sampleCount).toBeGreaterThan(0);
  await expect
    .poll(async () =>
      page.getByTestId('rhythm-analysis-canvas').evaluate((canvas) => {
        const context = (canvas as HTMLCanvasElement).getContext('2d');
        if (!context) return false;
        return context
          .getImageData(
            0,
            0,
            (canvas as HTMLCanvasElement).width,
            (canvas as HTMLCanvasElement).height,
          )
          .data.some((channel) => channel > 0);
      }),
    )
    .toBe(true);

  await page.getByRole('button', { name: 'Disable Onset' }).click();
  await expect(
    page.getByRole('button', { name: 'Enable Onset' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        window.__vizEditorDebug!.vizSessionStore.getState().project.revision,
    ),
  ).toBe(revisionBefore);

  await page.getByRole('button', { name: 'Close rhythm lab' }).click();
  await page.getByRole('button', { name: 'Rhythm Lab' }).click();
  await expect(page.getByTestId('rhythm-analysis-status')).toHaveText(
    'Analysis ready',
  );
  expect(
    await page.evaluate(
      () =>
        window.__vizEditorDebug!.rhythmLabStore.getState().analysisSource ===
        (window as any).__firstRhythmAnalysisSource,
    ),
  ).toBe(true);

  const firstTrack = await page.evaluate(
    () =>
      window.__vizEditorDebug!.vizSessionHost.getSnapshot().audioSession.source
        ?.uri,
  );
  await page.evaluate(() => {
    (window as any).__rhythmSourceInvalidated = false;
    (window as any).__rhythmSourceUnsubscribe =
      window.__vizEditorDebug!.rhythmLabStore.subscribe((state) => {
        if (state.analysisSource === null) {
          (window as any).__rhythmSourceInvalidated = true;
        }
      });
  });
  await page.getByRole('button', { name: 'Next track' }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug!.vizSessionHost.getSnapshot().audioSession
            .source?.uri,
      ),
    )
    .not.toBe(firstTrack);
  await expect
    .poll(async () =>
      page.evaluate(() => (window as any).__rhythmSourceInvalidated),
    )
    .toBe(true);
  await expect(page.getByTestId('rhythm-analysis-status')).toHaveText(
    'Analysis ready',
    { timeout: 30_000 },
  );
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug!.rhythmLabStore.getState().analysisSource !==
          (window as any).__firstRhythmAnalysisSource,
      ),
    )
    .toBe(true);
  const replacementAnalysis = await page.evaluate(() => {
    const state = window.__vizEditorDebug!.rhythmLabStore.getState();
    return {
      invalidated: (window as any).__rhythmSourceInvalidated,
      changedSource:
        state.analysisSource !== (window as any).__firstRhythmAnalysisSource,
      onsetPoints: state.onsetEnv?.length ?? 0,
    };
  });
  expect(replacementAnalysis).toMatchObject({
    invalidated: true,
    changedSource: true,
  });
  expect(replacementAnalysis.onsetPoints).toBeGreaterThan(0);

  const screenshotPath = process.env.VIZ_WAVEFORM_SCREENSHOT;
  if (screenshotPath) {
    const absolutePath = resolve(screenshotPath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await page.screenshot({ path: absolutePath, fullPage: true });
  }

  await page.evaluate(() => {
    (window as any).__waveformPresentationObserver?.disconnect();
    (window as any).__rhythmSelectionUnsubscribe?.();
    (window as any).__rhythmSourceUnsubscribe?.();
  });
  expect(diagnostics).toEqual([]);

  const reportPath = process.env.VIZ_WAVEFORM_PERFORMANCE_REPORT;
  if (reportPath) {
    const intervals = pointerPresentationSamples
      .slice(1)
      .map(
        (sample, index) =>
          sample.time - pointerPresentationSamples[index]!.time,
      )
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
          scenario: 'waveform-rhythm-workflow',
          liveSelection: {
            presentationSamples: pointerPresentationSamples.length,
            durableCommits: 3,
            medianUpdateIntervalMs: percentile(0.5),
            p95UpdateIntervalMs: percentile(0.95),
            maximumUpdateIntervalMs: intervals.at(-1) ?? 0,
            projectRevisionDelta: 0,
          },
          rhythmAnalysis: {
            firstAnalysis,
            invalidatedOnSourceChange: replacementAnalysis.invalidated,
            replacementSourceAnalyzed: replacementAnalysis.changedSource,
          },
          diagnostics,
        },
        null,
        2,
      )}\n`,
    );
  }
});
