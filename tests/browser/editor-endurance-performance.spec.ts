import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, release } from 'node:os';
import { dirname, resolve } from 'node:path';

const ENDURANCE_ENABLED = process.env.VIZ_ENDURANCE === '1';
const CYCLES = Math.max(
  2,
  Number.parseInt(process.env.VIZ_ENDURANCE_CYCLES ?? '6', 10),
);
const PLAYBACK_MILLISECONDS = Math.max(
  250,
  Number.parseInt(process.env.VIZ_ENDURANCE_PLAYBACK_MS ?? '750', 10),
);

declare global {
  interface Window {
    gc?: () => void;
  }
}

const isKnownBrowserDiagnostic = (message: string) =>
  (message.includes('GL Driver Message') &&
    message.includes('GPU stall due to ReadPixels')) ||
  (message.startsWith('THREE.FBXLoader:') &&
    (message.includes('map is not supported in three.js') ||
      message.includes('more than 4 skinning weights')));

const waitForEditor = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('vizengine-has-seen-tutorial', 'true');
  });
  await page.goto('/?allowSmallViewport=1');
  await expect(page.getByTestId('viz-editor')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__vizEditorDebug)))
    .toBe(true);
  await loadSimpleProject(page);
};

const loadSimpleProject = async (page: Page) => {
  await page.evaluate(async () => {
    await window.__vizEditorDebug?.editorControl.persistence.loadProjectFromUrl(
      '/projects/simple-example.vizengine.json',
    );
  });
  await expect(page.getByTestId('layer-card')).toHaveCount(3);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const debug = window.__vizEditorDebug;
        const runtime = debug?.editorControl.preview.inspectRuntimePreview();
        const resources =
          debug?.editorControl.preview.inspectRuntimeResources();
        return {
          projectId:
            debug?.vizSessionStore.getState().project.workingProject.projectId,
          renderedLayers: runtime?.lastRenderedLayerIds.length,
          resourceLayers: resources?.layers,
          pendingImages: resources?.pendingImageLoads,
        };
      }),
    )
    .toEqual({
      projectId: 'simple-example',
      renderedLayers: 3,
      resourceLayers: 3,
      pendingImages: 0,
    });
};

const addStageLayer = async (page: Page) => {
  const previousIds = await page.evaluate(
    () =>
      window.__vizEditorDebug?.vizSessionStore
        .getState()
        .project.workingProject.layers.map((layer) => layer.id) ?? [],
  );
  await page.getByText('Add New Layer', { exact: true }).click();
  await page
    .getByPlaceholder('Search visual compositions...')
    .fill('Stage Scene');
  await page.getByText('Stage Scene', { exact: true }).click();
  await expect(page.getByTestId('layer-card')).toHaveCount(4);
  const layerId = await page.evaluate(
    (before) =>
      window.__vizEditorDebug?.vizSessionStore
        .getState()
        .project.workingProject.layers.find(
          (layer) => !before.includes(layer.id),
        )?.id,
    previousIds,
  );
  if (!layerId) throw new Error('Could not identify the Stage layer.');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__vizEditorDebug?.editorControl.preview.inspectRuntimeResources()
            ?.loadingModelResources,
      ),
    )
    .toBe(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__vizEditorDebug?.editorControl.preview.inspectRuntimeResources()
            ?.activeModelReferences,
      ),
    )
    .toBeGreaterThan(0);
  return layerId;
};

const importSignalCathedral = async (page: Page) => {
  await page.evaluate(async () => {
    const response = await fetch('/productions/signal-cathedral/project.json');
    if (!response.ok) throw new Error(`Signal Cathedral: ${response.status}`);
    window.__vizEditorDebug?.editorControl.project.importWorkingProject(
      await response.json(),
    );
  });
  await expect(page.getByTestId('layer-card')).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__vizEditorDebug?.editorControl.preview.inspectRuntimePreview()
            .lastRenderedLayerIds.length,
      ),
    )
    .toBe(1);
};

const loadLightTunnel = async (page: Page) => {
  await page.evaluate(async () => {
    await window.__vizEditorDebug?.editorControl.persistence.loadProjectFromUrl(
      '/projects/light-tunnel.vizengine.json',
    );
  });
  await expect(page.getByTestId('layer-card')).toHaveCount(2);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const debug = window.__vizEditorDebug;
        const runtime = debug?.editorControl.preview.inspectRuntimePreview();
        return {
          projectId:
            debug?.vizSessionStore.getState().project.workingProject.projectId,
          renderedLayers: runtime?.lastRenderedLayerIds.length,
          graphResults: runtime?.lastGraphResults.length,
        };
      }),
    )
    .toEqual({
      projectId: 'light-tunnel',
      renderedLayers: 2,
      graphResults: 9,
    });
};

const readCanvasFingerprint = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      'canvas[data-runtime-preview-canvas]',
    );
    if (!canvas) throw new Error('Runtime preview canvas is not mounted.');
    const sample = document.createElement('canvas');
    sample.width = 64;
    sample.height = 36;
    const context = sample.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Cannot inspect runtime preview pixels.');
    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
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

const forceGc = (page: Page) =>
  page.evaluate(async () => {
    window.gc?.();
    await new Promise((resolve) => setTimeout(resolve, 100));
    window.gc?.();
  });

const readSnapshot = async (page: Page, cycle: number) => {
  await forceGc(page);
  return page.evaluate((completedCycle) => {
    const debug = window.__vizEditorDebug!;
    const project = debug.vizSessionStore.getState().project.workingProject;
    const runtime = debug.editorControl.preview.inspectRuntimePreview();
    const memory = (
      performance as Performance & {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
      }
    ).memory;
    return {
      cycle: completedCycle,
      projectId: project.projectId,
      revision: debug.vizSessionStore.getState().project.revision,
      layers: project.layers.length,
      graphs: project.graphs?.length ?? 0,
      renderedLayers: runtime.lastRenderedLayerIds.length,
      renderCycle: runtime.renderCycle,
      resources: debug.editorControl.preview.inspectRuntimeResources(),
      subscribers: debug.editorControl.inspect.subscribers(),
      audio: debug.editorControl.audio.inspectEngine(),
      dom: {
        runtimeCanvases: document.querySelectorAll(
          'canvas[data-runtime-preview-canvas]',
        ).length,
        audioElements: document.querySelectorAll('audio').length,
        graphOverlays: document.querySelectorAll('[data-testid="node-network"]')
          .length,
        profilerButtons: document.querySelectorAll(
          '[aria-label="Open performance profiler"]',
        ).length,
      },
      memory: memory
        ? {
            usedJSHeapBytes: memory.usedJSHeapSize,
            totalJSHeapBytes: memory.totalJSHeapSize,
          }
        : null,
    };
  }, cycle);
};

const collectFramePacing = (
  page: Page,
  warmupMilliseconds: number,
  sampleMilliseconds: number,
): Promise<number[]> =>
  page.evaluate(
    ({ sample, warmup }) =>
      new Promise<number[]>((resolve) => {
        const samples: number[] = [];
        const startedAt = performance.now();
        let previous = startedAt;
        window.__vizEditorDebug?.editorControl.preview.play();
        const collect = (now: number) => {
          if (now - startedAt >= warmup) samples.push(now - previous);
          previous = now;
          if (now - startedAt < warmup + sample) {
            requestAnimationFrame(collect);
          } else {
            window.__vizEditorDebug?.editorControl.preview.pause();
            resolve(samples);
          }
        };
        requestAnimationFrame(collect);
      }),
    { sample: sampleMilliseconds, warmup: warmupMilliseconds },
  );

const percentile = (values: number[], ratio: number) => {
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[
    Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))
  ]!;
};

const summarize = (values: number[]) => ({
  count: values.length,
  medianMs: percentile(values, 0.5),
  p95Ms: percentile(values, 0.95),
  p99Ms: percentile(values, 0.99),
  maxMs: Math.max(...values),
  over25Ms: values.filter((value) => value > 25).length,
});

const runCycle = async (page: Page) => {
  const initialAudio = await page.evaluate(
    () =>
      window.__vizEditorDebug?.vizSessionHost.getSnapshot().audioSession.source
        ?.uri,
  );
  await page.getByRole('button', { name: 'Next track' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__vizEditorDebug?.vizSessionHost.getSnapshot().audioSession
            .source?.uri,
      ),
    )
    .not.toBe(initialAudio);
  await page.getByRole('button', { name: 'Previous track' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__vizEditorDebug?.vizSessionHost.getSnapshot().audioSession
            .source?.uri,
      ),
    )
    .toBe(initialAudio);

  const beforeIds = await page.evaluate(
    () =>
      window.__vizEditorDebug?.vizSessionStore
        .getState()
        .project.workingProject.layers.map((layer) => layer.id) ?? [],
  );
  await page
    .getByTestId('layer-card')
    .first()
    .getByTestId('duplicate-layer')
    .click();
  await expect(page.getByTestId('layer-card')).toHaveCount(4);
  const duplicateId = await page.evaluate(
    (ids) =>
      window.__vizEditorDebug?.vizSessionStore
        .getState()
        .project.workingProject.layers.find((layer) => !ids.includes(layer.id))
        ?.id,
    beforeIds,
  );
  if (!duplicateId) throw new Error('Could not identify duplicated layer.');
  await page
    .locator(`[data-layer-id="${duplicateId}"]`)
    .getByTestId('delete-layer')
    .click();
  await expect(page.getByTestId('layer-card')).toHaveCount(3);

  await page.getByRole('button', { name: 'Rhythm Lab', exact: true }).click();
  await expect(
    page.getByText('DSP debug surface for rhythm-core'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Rhythm Lab', exact: true }).click();
  await expect(
    page.getByText('DSP debug surface for rhythm-core'),
  ).not.toBeVisible();

  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.ui.toggleProfiler(),
  );
  await expect(
    page.getByRole('button', { name: 'Open performance profiler' }),
  ).toBeVisible();
  await page.evaluate(() =>
    window.__vizEditorDebug?.editorControl.ui.toggleProfiler(),
  );

  const stageId = await addStageLayer(page);
  await page.evaluate(
    ({ milliseconds }) => {
      window.__vizEditorDebug?.editorControl.preview.play();
      return new Promise<void>((resolve) =>
        setTimeout(() => {
          window.__vizEditorDebug?.editorControl.preview.pause();
          resolve();
        }, milliseconds),
      );
    },
    { milliseconds: PLAYBACK_MILLISECONDS },
  );
  await page
    .locator(`[data-layer-id="${stageId}"]`)
    .getByTestId('delete-layer')
    .click();
  await expect(page.getByTestId('layer-card')).toHaveCount(3);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__vizEditorDebug?.editorControl.preview.inspectRuntimeResources()
            ?.activeModelReferences,
      ),
    )
    .toBe(0);

  await importSignalCathedral(page);
  await page.evaluate(() => {
    const control = window.__vizEditorDebug?.editorControl;
    control?.nodeEditor.openNetwork(
      'layer-signal-cathedral:reactivity:structurePulse',
    );
    control?.nodeEditor.focus();
  });
  await expect(page.getByTestId('node-network')).toBeVisible();
  await page.evaluate(
    ({ milliseconds }) => {
      window.__vizEditorDebug?.editorControl.preview.play();
      return new Promise<void>((resolve) =>
        setTimeout(() => {
          const control = window.__vizEditorDebug?.editorControl;
          control?.preview.pause();
          control?.nodeEditor.closeNetwork();
          resolve();
        }, milliseconds),
      );
    },
    { milliseconds: PLAYBACK_MILLISECONDS },
  );
  await loadLightTunnel(page);
  await page.evaluate(() => {
    const control = window.__vizEditorDebug?.editorControl;
    control?.nodeEditor.openNetwork(
      'layer-Light Tunnel-1760643746953:wave:triggerWave',
    );
    control?.nodeEditor.focus();
  });
  await expect(page.getByTestId('node-network')).toBeVisible();
  await page.evaluate(
    ({ milliseconds }) => {
      window.__vizEditorDebug?.editorControl.preview.play();
      return new Promise<void>((resolve) =>
        setTimeout(() => {
          const control = window.__vizEditorDebug?.editorControl;
          control?.preview.pause();
          control?.nodeEditor.closeNetwork();
          resolve();
        }, milliseconds),
      );
    },
    { milliseconds: PLAYBACK_MILLISECONDS },
  );
  await loadSimpleProject(page);
};

test.skip(!ENDURANCE_ENABLED, 'Run with pnpm benchmark:endurance.');

test('keeps playback, editing, audio, panels, graphs, models, and responsiveness bounded', async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  test.setTimeout(600_000);
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
  const beforePacing = summarize(await collectFramePacing(page, 3_000, 5_000));
  await runCycle(page);
  const baseline = await readSnapshot(page, 0);
  const snapshots = [];
  for (let cycle = 1; cycle <= CYCLES; cycle += 1) {
    await runCycle(page);
    snapshots.push(await readSnapshot(page, cycle));
  }
  const beforeFingerprint = await readCanvasFingerprint(page);
  const afterPacing = summarize(await collectFramePacing(page, 3_000, 5_000));
  const afterFingerprint = await readCanvasFingerprint(page);
  const finalSnapshot = await readSnapshot(page, CYCLES);

  const heapSamples = [baseline, ...snapshots, finalSnapshot]
    .map((snapshot) => snapshot.memory?.usedJSHeapBytes)
    .filter((value): value is number => value !== undefined);
  const report = {
    schemaVersion: 1,
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
      cycles: CYCLES,
      warmupCycles: 1,
      playbackMillisecondsPerStage: PLAYBACK_MILLISECONDS,
      workloads: [
        'simple-example',
        'stage-scene-with-bundled-models',
        'signal-cathedral-with-live-graph',
        'light-tunnel-with-live-graph',
      ],
      operations: [
        'bundled-audio-next-previous',
        'duplicate-delete-layer',
        'rhythm-lab-open-close',
        'profiler-open-close',
        'stage-model-load-play-delete',
        'signal-cathedral-import-graph-play-close',
        'light-tunnel-load-graph-play-close',
        'simple-project-reopen',
      ],
    },
    framePacing: { before: beforePacing, after: afterPacing },
    canvas: { before: beforeFingerprint, after: afterFingerprint },
    baseline,
    snapshots,
    final: finalSnapshot,
    heap: {
      samples: heapSamples,
      growthBytes:
        heapSamples.length > 0 ? heapSamples.at(-1)! - heapSamples[0]! : null,
      rangeBytes:
        heapSamples.length > 0
          ? Math.max(...heapSamples) - Math.min(...heapSamples)
          : null,
    },
    diagnostics,
  };
  const reportJson = `${JSON.stringify(report, null, 2)}\n`;
  const attachedPath = testInfo.outputPath('editor-endurance.json');
  await writeFile(attachedPath, reportJson);
  await testInfo.attach('editor-endurance', {
    path: attachedPath,
    contentType: 'application/json',
  });
  if (process.env.VIZ_ENDURANCE_REPORT) {
    const reportPath = resolve(process.env.VIZ_ENDURANCE_REPORT);
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, reportJson);
  }

  expect(beforeFingerprint.visiblePixels).toBeGreaterThan(500);
  expect(afterFingerprint.visiblePixels).toBeGreaterThan(500);
  expect(afterFingerprint.hash).not.toBe(beforeFingerprint.hash);
  expect(finalSnapshot.projectId).toBe('simple-example');
  expect(finalSnapshot.layers).toBe(3);
  expect(finalSnapshot.renderedLayers).toBe(3);
  expect(finalSnapshot.resources).toEqual(baseline.resources);
  expect(finalSnapshot.subscribers).toEqual(baseline.subscribers);
  expect(finalSnapshot.audio).toEqual(baseline.audio);
  expect(finalSnapshot.dom).toEqual(baseline.dom);
  expect(finalSnapshot.renderCycle).toBeGreaterThan(baseline.renderCycle);
  expect(afterPacing.p95Ms).toBeLessThanOrEqual(
    Math.max(25, beforePacing.p95Ms * 1.25),
  );
  expect(afterPacing.maxMs).toBeLessThan(50);
  if (heapSamples.length > 0) {
    expect(heapSamples.at(-1)! - heapSamples[0]!).toBeLessThan(32 * 1024 ** 2);
    expect(Math.max(...heapSamples) - Math.min(...heapSamples)).toBeLessThan(
      64 * 1024 ** 2,
    );
  }
  expect(diagnostics).toEqual([]);
});
