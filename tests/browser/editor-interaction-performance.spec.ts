import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, release } from 'node:os';
import { dirname, resolve } from 'node:path';

interface LiveInteractionSample {
  inputToTransientMs: number;
  inputToRuntimeMs: number;
  inputToVisibleMs: number;
}

interface CommitInteractionSample {
  releaseToMutationMs: number;
  releaseToEventCompleteMs: number;
  releaseToNextDisplayMs: number;
  releaseToRuntimeMs: number;
  releaseToVisibleMs: number;
  revisionDelta: number;
  runtimeEvents: Array<{
    elapsedMs: number;
    renderCycle: number;
    timings: {
      planMilliseconds: number;
      attachmentMilliseconds: number;
      totalMilliseconds: number;
    } | null;
  }>;
}

interface VisibleMovementSample {
  inputToVisibleMs: number;
}

interface MetricSummary {
  count: number;
  meanMs: number;
  minMs: number;
  medianMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
}

declare global {
  interface Window {
    __vizLivePerformanceSample?: Promise<LiveInteractionSample>;
    __vizCommitPerformanceSample?: Promise<CommitInteractionSample>;
    __vizMovementPerformanceSample?: Promise<VisibleMovementSample>;
  }
}

const PERFORMANCE_ENABLED = process.env.VIZ_PERFORMANCE === '1';
const ITERATIONS = Math.max(
  4,
  Number.parseInt(process.env.VIZ_PERFORMANCE_ITERATIONS ?? '20', 10),
);
const WARMUP_MILLISECONDS = 3_000;
const FRAME_SAMPLE_MILLISECONDS = 5_000;
const SAMPLE_TIMEOUT_MILLISECONDS = 2_000;

const isKnownBrowserDiagnostic = (message: string): boolean =>
  message.includes('GL Driver Message') &&
  message.includes('GPU stall due to ReadPixels');

const percentile = (samples: readonly number[], ratio: number): number => {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[
    Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))
  ]!;
};

const summarize = (samples: readonly number[]): MetricSummary => ({
  count: samples.length,
  meanMs: samples.reduce((total, sample) => total + sample, 0) / samples.length,
  minMs: Math.min(...samples),
  medianMs: percentile(samples, 0.5),
  p95Ms: percentile(samples, 0.95),
  p99Ms: percentile(samples, 0.99),
  maxMs: Math.max(...samples),
});

const waitForEditor = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    localStorage.setItem('vizengine-has-seen-tutorial', 'true');
  });
  await page.goto('/?allowSmallViewport=1');
  await expect(page.getByTestId('viz-editor')).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => Boolean(window.__vizEditorDebug)))
    .toBe(true);
  await page.getByRole('menuitem', { name: 'Examples', exact: true }).click();
  await page.getByRole('menuitem', { name: 'simple-example' }).click();
  await expect(page.getByTestId('layer-card')).toHaveCount(3);
  await expect(page.locator('[data-renderer-container]')).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__vizEditorDebug?.editorControl.preview.inspectRuntimePreview()
            .lastRenderedLayerIds.length ?? 0,
      ),
    )
    .toBe(3);
};

const getProjectRevision = (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      window.__vizEditorDebug?.vizSessionStore.getState().project.revision ??
      -1,
  );

const armLiveInteractionSample = async (page: Page): Promise<void> => {
  await page.evaluate((timeoutMilliseconds) => {
    const debug = window.__vizEditorDebug;
    if (!debug) {
      throw new Error('Viz editor debug control is not mounted.');
    }
    const beforeCycle =
      debug.editorControl.preview.inspectRuntimePreview().renderCycle;

    window.__vizLivePerformanceSample = new Promise((resolveSample, reject) => {
      let inputAt: number | undefined;
      let transientAt: number | undefined;
      let paintScheduled = false;
      let settled = false;
      const pointerListener = () => {
        inputAt = performance.now();
      };
      const cleanup = () => {
        window.removeEventListener('pointermove', pointerListener, true);
        unsubscribeLive();
        unsubscribeRuntime();
        window.clearTimeout(timeout);
      };
      const finish = (sample: LiveInteractionSample) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolveSample(sample);
      };
      window.addEventListener('pointermove', pointerListener, {
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
            paintScheduled ||
            inputAt === undefined ||
            transientAt === undefined ||
            runtime.renderCycle <= beforeCycle
          ) {
            return;
          }
          paintScheduled = true;
          const runtimeAt = performance.now();
          requestAnimationFrame(() => {
            finish({
              inputToTransientMs: transientAt! - inputAt!,
              inputToRuntimeMs: runtimeAt - inputAt!,
              inputToVisibleMs: performance.now() - inputAt!,
            });
          });
        });
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error('Timed out measuring a live interaction sample.'));
      }, timeoutMilliseconds);
    });
  }, SAMPLE_TIMEOUT_MILLISECONDS);
};

const readLiveInteractionSample = (
  page: Page,
): Promise<LiveInteractionSample> =>
  page.evaluate(async () => {
    if (!window.__vizLivePerformanceSample) {
      throw new Error('A live performance sample was not armed.');
    }
    return window.__vizLivePerformanceSample;
  });

const armCommitInteractionSample = async (page: Page): Promise<void> => {
  await page.evaluate((timeoutMilliseconds) => {
    const debug = window.__vizEditorDebug;
    if (!debug) {
      throw new Error('Viz editor debug control is not mounted.');
    }
    const beforeRevision = debug.vizSessionHost.getProjectRevision();
    const beforeCycle =
      debug.editorControl.preview.inspectRuntimePreview().renderCycle;

    window.__vizCommitPerformanceSample = new Promise(
      (resolveSample, reject) => {
        let inputAt: number | undefined;
        let mutationAt: number | undefined;
        let eventCompletedAt: number | undefined;
        let nextDisplayAt: number | undefined;
        let revisionDelta = 0;
        let paintScheduled = false;
        let settled = false;
        const runtimeEvents: CommitInteractionSample['runtimeEvents'] = [];
        const pointerListener = () => {
          inputAt = performance.now();
          requestAnimationFrame(() => {
            nextDisplayAt = performance.now();
          });
        };
        const completionListener = () => {
          eventCompletedAt = performance.now();
        };
        const cleanup = () => {
          window.removeEventListener('pointerup', pointerListener, true);
          window.removeEventListener('pointerup', completionListener);
          unsubscribeHost();
          unsubscribeRuntime();
          window.clearTimeout(timeout);
        };
        const finish = (sample: CommitInteractionSample) => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          resolveSample(sample);
        };
        window.addEventListener('pointerup', pointerListener, {
          capture: true,
          once: true,
        });
        window.addEventListener('pointerup', completionListener, {
          once: true,
        });
        const unsubscribeHost = debug.vizSessionHost.subscribeChanges(() => {
          const revision = debug.vizSessionHost.getProjectRevision();
          if (
            inputAt === undefined ||
            mutationAt !== undefined ||
            revision <= beforeRevision
          ) {
            return;
          }
          mutationAt = performance.now();
          revisionDelta = revision - beforeRevision;
        });
        const unsubscribeRuntime =
          debug.editorControl.preview.subscribeRuntimePreview((runtime) => {
            if (inputAt !== undefined) {
              runtimeEvents.push({
                elapsedMs: performance.now() - inputAt,
                renderCycle: runtime.renderCycle,
                timings: runtime.lastTimings,
              });
            }
            if (
              paintScheduled ||
              inputAt === undefined ||
              mutationAt === undefined ||
              runtime.renderCycle <= beforeCycle
            ) {
              return;
            }
            paintScheduled = true;
            const runtimeAt = performance.now();
            requestAnimationFrame(() => {
              finish({
                releaseToMutationMs: mutationAt! - inputAt!,
                releaseToEventCompleteMs:
                  (eventCompletedAt ?? runtimeAt) - inputAt!,
                releaseToNextDisplayMs: (nextDisplayAt ?? runtimeAt) - inputAt!,
                releaseToRuntimeMs: runtimeAt - inputAt!,
                releaseToVisibleMs: performance.now() - inputAt!,
                revisionDelta,
                runtimeEvents,
              });
            });
          });
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error('Timed out measuring an interaction commit.'));
        }, timeoutMilliseconds);
      },
    );
  }, SAMPLE_TIMEOUT_MILLISECONDS);
};

const readCommitInteractionSample = (
  page: Page,
): Promise<CommitInteractionSample> =>
  page.evaluate(async () => {
    if (!window.__vizCommitPerformanceSample) {
      throw new Error('A commit performance sample was not armed.');
    }
    return window.__vizCommitPerformanceSample;
  });

const armVisibleMovementSample = async (
  node: Locator,
  page: Page,
): Promise<void> => {
  const nodeId = await node.getAttribute('data-id');
  if (!nodeId) {
    throw new Error('React Flow node does not expose a stable data-id.');
  }
  await page.evaluate(
    ({ id, timeoutMilliseconds }) => {
      const element = document.querySelector<HTMLElement>(
        `.react-flow__node[data-id="${CSS.escape(id)}"]`,
      );
      if (!element) {
        throw new Error(`Cannot measure missing React Flow node "${id}".`);
      }
      const initial = element.getBoundingClientRect();
      window.__vizMovementPerformanceSample = new Promise(
        (resolveSample, reject) => {
          let inputAt: number | undefined;
          let settled = false;
          const pointerListener = () => {
            inputAt = performance.now();
          };
          const cleanup = () => {
            window.removeEventListener('pointermove', pointerListener, true);
            window.clearTimeout(timeout);
          };
          const observe = () => {
            if (settled) {
              return;
            }
            const current = element.getBoundingClientRect();
            if (
              inputAt !== undefined &&
              (Math.abs(current.x - initial.x) > 0.5 ||
                Math.abs(current.y - initial.y) > 0.5)
            ) {
              settled = true;
              cleanup();
              resolveSample({
                inputToVisibleMs: performance.now() - inputAt,
              });
              return;
            }
            requestAnimationFrame(observe);
          };
          window.addEventListener('pointermove', pointerListener, {
            capture: true,
            once: true,
          });
          const timeout = window.setTimeout(() => {
            settled = true;
            cleanup();
            reject(new Error('Timed out measuring visible node movement.'));
          }, timeoutMilliseconds);
          requestAnimationFrame(observe);
        },
      );
    },
    { id: nodeId, timeoutMilliseconds: SAMPLE_TIMEOUT_MILLISECONDS },
  );
};

const readVisibleMovementSample = (
  page: Page,
): Promise<VisibleMovementSample> =>
  page.evaluate(async () => {
    if (!window.__vizMovementPerformanceSample) {
      throw new Error('A movement performance sample was not armed.');
    }
    return window.__vizMovementPerformanceSample;
  });

const collectFrameIntervals = (
  page: Page,
  warmupMilliseconds: number,
  sampleMilliseconds: number,
): Promise<{
  display: number[];
  runtime: number[];
}> =>
  page.evaluate(
    ({ warmup, sample }) =>
      new Promise<{ display: number[]; runtime: number[] }>((resolveSample) => {
        const debug = window.__vizEditorDebug;
        if (!debug) {
          throw new Error('Viz editor debug control is not mounted.');
        }
        const displayIntervals: number[] = [];
        const runtimeIntervals: number[] = [];
        const startedAt = performance.now();
        let previousDisplay = startedAt;
        let previousRuntime: number | undefined;
        const unsubscribeRuntime =
          debug.editorControl.preview.subscribeRuntimePreview(() => {
            const now = performance.now();
            if (now - startedAt >= warmup && previousRuntime !== undefined) {
              runtimeIntervals.push(now - previousRuntime);
            }
            previousRuntime = now;
          });
        debug.editorControl.preview.play();
        const collect = (now: number) => {
          if (now - startedAt >= warmup) {
            displayIntervals.push(now - previousDisplay);
          }
          previousDisplay = now;
          if (now - startedAt < warmup + sample) {
            requestAnimationFrame(collect);
          } else {
            debug.editorControl.preview.pause();
            unsubscribeRuntime();
            resolveSample({
              display: displayIntervals,
              runtime: runtimeIntervals,
            });
          }
        };
        requestAnimationFrame(collect);
      }),
    { warmup: warmupMilliseconds, sample: sampleMilliseconds },
  );

test.skip(!PERFORMANCE_ENABLED, 'Run with pnpm benchmark:editor-interaction.');

test('records fixed-device editor interaction performance', async ({
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
  page.on('pageerror', (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  await waitForEditor(page);
  const identity = await page.evaluate(() => {
    const debug = window.__vizEditorDebug!;
    const state = debug.vizSessionStore.getState();
    const project = state.project.workingProject;
    const runtime = debug.editorControl.preview.inspectRuntimePreview();
    const graphBinding = project.layers
      .flatMap((layer) =>
        Object.entries(layer.inputs ?? {}).map(([inputKey, source]) => ({
          parameterId: `${layer.id}:${inputKey}`,
          source,
        })),
      )
      .find(({ source }) => source.kind === 'graph-output');
    return {
      projectId: project.projectId,
      projectName: project.name,
      projectRevision: state.project.revision,
      layerCount: project.layers.length,
      graphCount: project.graphs?.length ?? 0,
      componentIds: project.layers.map((layer) => layer.componentId),
      assetIds: project.assetRefs?.map((asset) => asset.id) ?? [],
      artifactIds: project.artifactRefs?.map((artifact) => artifact.id) ?? [],
      audioSourceKind: state.audio.session.source?.kind ?? null,
      renderedLayerIds: runtime.lastRenderedLayerIds,
      graphParameterId: graphBinding?.parameterId,
      graphId:
        graphBinding?.source.kind === 'graph-output'
          ? graphBinding.source.graphId
          : undefined,
    };
  });

  const frameIntervals = await collectFrameIntervals(
    page,
    WARMUP_MILLISECONDS,
    FRAME_SAMPLE_MILLISECONDS,
  );
  await page.waitForTimeout(50);

  const shaderCard = page
    .getByTestId('layer-card')
    .filter({ hasText: 'Fullscreen Shader' });
  await shaderCard.getByRole('button', { name: 'Settings' }).click();
  const speedField = shaderCard
    .getByText('Animation Speed', { exact: true })
    .locator('..');
  const slider = speedField.getByRole('slider');
  const valueInput = speedField.locator('input[type="number"]');
  await expect(slider).toBeVisible();
  await expect(valueInput).toBeVisible();

  const sliderLiveSamples: LiveInteractionSample[] = [];
  const sliderCommitSamples: CommitInteractionSample[] = [];
  for (let index = 0; index < ITERATIONS; index += 1) {
    const thumbBox = await slider.boundingBox();
    const trackBox = await slider.evaluate((thumb) => {
      const track = thumb.parentElement?.parentElement;
      if (!track) {
        throw new Error('Slider thumb is missing its track.');
      }
      const bounds = track.getBoundingClientRect();
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };
    });
    if (!thumbBox) {
      throw new Error('Slider thumb does not have a visible bounding box.');
    }
    const targetRatio = index % 2 === 0 ? 0.72 : 0.28;
    const revisionBefore = await getProjectRevision(page);
    await page.mouse.move(
      thumbBox.x + thumbBox.width / 2,
      thumbBox.y + thumbBox.height / 2,
    );
    await page.mouse.down();
    await page.waitForTimeout(20);
    await armLiveInteractionSample(page);
    await page.mouse.move(
      trackBox.x + trackBox.width * targetRatio,
      trackBox.y + trackBox.height / 2,
    );
    sliderLiveSamples.push(await readLiveInteractionSample(page));
    expect(await getProjectRevision(page)).toBe(revisionBefore);
    const liveReadout = Number.parseFloat(await valueInput.inputValue());
    expect(liveReadout).toBeCloseTo(0.1 + 4.9 * targetRatio, 0);

    await armCommitInteractionSample(page);
    await page.mouse.up();
    const commit = await readCommitInteractionSample(page);
    sliderCommitSamples.push(commit);
    expect(commit.revisionDelta).toBe(1);
  }

  if (!identity.graphParameterId || !identity.graphId) {
    throw new Error('The performance fixture is missing its editable graph.');
  }
  await page.evaluate((parameterId) => {
    window.__vizEditorDebug?.editorControl.nodeEditor.openNetwork(parameterId);
    window.__vizEditorDebug?.editorControl.nodeEditor.focus();
  }, identity.graphParameterId);
  await expect(page.getByTestId('node-network')).toBeVisible();
  const mathNodeId = await page.evaluate((graphId) => {
    const graph = window.__vizEditorDebug?.vizSessionStore
      .getState()
      .project.workingProject.graphs?.find(
        (candidate) => candidate.id === graphId,
      );
    return graph?.nodes.find((node) => node.type === 'Math')?.id;
  }, identity.graphId);
  if (!mathNodeId) {
    throw new Error('The performance fixture is missing its Math graph node.');
  }
  const mathNode = page.locator(`.react-flow__node[data-id="${mathNodeId}"]`);
  await expect(mathNode).toBeVisible();

  const nodeMoveSamples: VisibleMovementSample[] = [];
  const nodeCommitSamples: CommitInteractionSample[] = [];
  for (let index = 0; index < ITERATIONS; index += 1) {
    const nodeBox = await mathNode.boundingBox();
    if (!nodeBox) {
      throw new Error('Math node does not have a visible bounding box.');
    }
    const start = {
      x: nodeBox.x + Math.min(24, nodeBox.width / 4),
      y: nodeBox.y + 6,
    };
    const delta = index % 2 === 0 ? 24 : -24;
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.waitForTimeout(20);
    await armVisibleMovementSample(mathNode, page);
    await page.mouse.move(start.x + delta, start.y + 8, { steps: 4 });
    nodeMoveSamples.push(await readVisibleMovementSample(page));

    await armCommitInteractionSample(page);
    await page.mouse.up();
    const commit = await readCommitInteractionSample(page);
    nodeCommitSamples.push(commit);
    expect(commit.revisionDelta).toBe(1);
  }

  const browserState = await page.evaluate(() => {
    const memory = (
      performance as Performance & {
        memory?: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      }
    ).memory;
    return {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      memory: memory
        ? {
            usedJSHeapBytes: memory.usedJSHeapSize,
            totalJSHeapBytes: memory.totalJSHeapSize,
            heapLimitBytes: memory.jsHeapSizeLimit,
          }
        : null,
    };
  });
  const report = {
    schemaVersion: 1,
    recordedAt: new Date().toISOString(),
    environment: {
      browserName,
      browserVersion: browser.version(),
      userAgent: browserState.userAgent,
      headless: false,
      platform: platform(),
      release: release(),
      architecture: arch(),
      cpu: cpus()[0]?.model ?? 'unknown',
      viewport: browserState.viewport,
    },
    fixture: {
      ...identity,
      warmupMilliseconds: WARMUP_MILLISECONDS,
      frameSampleMilliseconds: FRAME_SAMPLE_MILLISECONDS,
      interactionIterations: ITERATIONS,
    },
    framePacing: {
      display: {
        ...summarize(frameIntervals.display),
        estimatedRefreshRateHz: 1_000 / percentile(frameIntervals.display, 0.5),
        longFrameThresholdMs: 25,
        longFrameCount: frameIntervals.display.filter((sample) => sample > 25)
          .length,
      },
      runtime: {
        ...summarize(frameIntervals.runtime),
        longFrameThresholdMs: 25,
        longFrameCount: frameIntervals.runtime.filter((sample) => sample > 25)
          .length,
      },
    },
    continuousParameter: {
      inputToTransient: summarize(
        sliderLiveSamples.map((sample) => sample.inputToTransientMs),
      ),
      inputToRuntime: summarize(
        sliderLiveSamples.map((sample) => sample.inputToRuntimeMs),
      ),
      inputToVisible: summarize(
        sliderLiveSamples.map((sample) => sample.inputToVisibleMs),
      ),
      releaseToMutation: summarize(
        sliderCommitSamples.map((sample) => sample.releaseToMutationMs),
      ),
      releaseToEventComplete: summarize(
        sliderCommitSamples.map((sample) => sample.releaseToEventCompleteMs),
      ),
      releaseToNextDisplay: summarize(
        sliderCommitSamples.map((sample) => sample.releaseToNextDisplayMs),
      ),
      releaseToRuntime: summarize(
        sliderCommitSamples.map((sample) => sample.releaseToRuntimeMs),
      ),
      releaseToVisible: summarize(
        sliderCommitSamples.map((sample) => sample.releaseToVisibleMs),
      ),
    },
    graphNodeMove: {
      inputToVisible: summarize(
        nodeMoveSamples.map((sample) => sample.inputToVisibleMs),
      ),
      releaseToMutation: summarize(
        nodeCommitSamples.map((sample) => sample.releaseToMutationMs),
      ),
      releaseToEventComplete: summarize(
        nodeCommitSamples.map((sample) => sample.releaseToEventCompleteMs),
      ),
      releaseToNextDisplay: summarize(
        nodeCommitSamples.map((sample) => sample.releaseToNextDisplayMs),
      ),
      releaseToRuntime: summarize(
        nodeCommitSamples.map((sample) => sample.releaseToRuntimeMs),
      ),
      releaseToVisible: summarize(
        nodeCommitSamples.map((sample) => sample.releaseToVisibleMs),
      ),
    },
    memory: browserState.memory,
    diagnostics,
    rawCommitSamples: {
      continuousParameter: sliderCommitSamples,
      graphNodeMove: nodeCommitSamples,
    },
    scope:
      'Fixed-device simple-example interaction baseline. V1 comparison and broader workloads are recorded separately.',
  };

  const reportJson = `${JSON.stringify(report, null, 2)}\n`;
  const attachedReportPath = testInfo.outputPath(
    'editor-interaction-performance.json',
  );
  await writeFile(attachedReportPath, reportJson);
  await testInfo.attach('editor-interaction-performance', {
    path: attachedReportPath,
    contentType: 'application/json',
  });
  if (process.env.VIZ_PERFORMANCE_REPORT) {
    const reportPath = resolve(process.env.VIZ_PERFORMANCE_REPORT);
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, reportJson);
  }

  expect(frameIntervals.display.length).toBeGreaterThan(30);
  expect(frameIntervals.runtime.length).toBeGreaterThan(30);
  expect(diagnostics).toEqual([]);
});
