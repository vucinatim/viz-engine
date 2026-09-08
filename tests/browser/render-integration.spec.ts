import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

for (const production of ['signal-cathedral', 'afterlight-assembly']) {
  test(`production preview and PNG export agree for ${production}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect
      .poll(() => page.evaluate(() => Boolean(window.__vizEditorDebug)))
      .toBe(true);
    await page.evaluate(
      async ({ base, production }) => {
        const { loadBrowserVizProjectBundle } = await import(
          /* @vite-ignore */ `${base}/packages/viz-project-bundle/src/browser.ts`
        );
        const bundle = await loadBrowserVizProjectBundle(
          `/productions/${production}/`,
        );
        const debug = window.__vizEditorDebug!;
        debug.editorControl.preview.pause();
        debug.vizControl.openProject({
          project: bundle.project,
          resolvedAssets: bundle.resolvedAssets,
          resolvedArtifacts: bundle.resolvedArtifacts,
          source: {
            kind: 'bundle',
            label: bundle.project.name,
            bundleDirectory: bundle.bundleUrl,
          },
        });
      },
      { base: `/@fs${process.cwd()}`, production },
    );
    await expect(
      page.locator('canvas[data-runtime-preview-canvas]'),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(async (base) => {
          const { default: store } = await import(
            /* @vite-ignore */ `${base}/src/lib/stores/editor-runtime-preview-attachment-store.ts`
          );
          const stats = store.getState().inspectRuntimeResources();
          return stats
            ? stats.pendingImageLoads + stats.loadingModelResources
            : -1;
        }, `/@fs${process.cwd()}`),
      )
      .toBe(0);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const result = await page.evaluate(async (base) => {
      const { vizSessionActions, createVizSessionRuntimePreviewFrame } =
        await import(/* @vite-ignore */ `${base}/src/lib/viz-session/index.ts`);
      const { sampleProjectAudioFrameSnapshot } = await import(
        /* @vite-ignore */ `${base}/packages/viz-runtime/src/index.ts`
      );
      const { default: attachmentStore } = await import(
        /* @vite-ignore */ `${base}/src/lib/stores/editor-runtime-preview-attachment-store.ts`
      );
      const debug = window.__vizEditorDebug!;
      const resources = debug.vizSessionHost.getProjectResources();
      const service = debug.vizSessionHost.getServices().renderJobs!;
      const fps = resources.project.timeline.fps;
      const observations = [];
      for (const frameNumber of [0, 210, 0]) {
        const audio = sampleProjectAudioFrameSnapshot(
          resources.project,
          resources.resolvedArtifacts,
          frameNumber,
        );
        if (!audio)
          throw new Error('Production deterministic audio is missing.');
        const frame = createVizSessionRuntimePreviewFrame({
          currentFrame: frameNumber,
          time: frameNumber / fps,
          dt: 1 / fps,
          fps,
          mode: 'live',
        });
        vizSessionActions.preview.renderRuntimePreviewFrame(frame, audio);
        await attachmentStore.getState().whenPreviewReady();
        // Render and copy in the same task; no invalidation clock may replace this frame.
        vizSessionActions.preview.renderRuntimePreviewFrame(frame, audio);
        const canvas = document.querySelector<HTMLCanvasElement>(
          'canvas[data-runtime-preview-canvas]',
        )!;
        const copy = document.createElement('canvas');
        copy.width = canvas.width;
        copy.height = canvas.height;
        const context = copy.getContext('2d')!;
        context.drawImage(canvas, 0, 0);
        const expected = context.getImageData(
          0,
          0,
          copy.width,
          copy.height,
        ).data;
        const previewPng = copy.toDataURL('image/png');
        const dimensions = { width: copy.width, height: copy.height };
        const revision = debug.vizSessionHost.getSnapshot().session.revision;
        const job = service.start({
          schemaVersion: 1,
          kind: 'still',
          source: {
            projectId: resources.project.projectId,
            expectedRevision: revision,
          },
          executorId: 'browser-webgl',
          intent: 'preview',
          outputLabel: 'production-parity',
          quality: 'high',
          frame: frameNumber,
          format: 'png',
          viewport: dimensions,
        });
        const done = await service.wait(job.id);
        if (done.status !== 'succeeded' || !done.result)
          throw new Error(JSON.stringify(done));
        const output = done.result.outputs[0]!;
        const blob = await (await fetch(output.uri)).blob();
        const bitmap = await createImageBitmap(blob);
        context.clearRect(0, 0, copy.width, copy.height);
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        const actual = context.getImageData(0, 0, copy.width, copy.height).data;
        let error = 0,
          energy = 0,
          meanA = 0,
          meanB = 0;
        const n = copy.width * copy.height * 3;
        for (let i = 0; i < actual.length; i++)
          if (i % 4 !== 3) {
            error += Math.abs(actual[i]! - expected[i]!);
            energy += actual[i]!;
            meanA += expected[i]!;
            meanB += actual[i]!;
          }
        meanA /= n;
        meanB /= n;
        let varianceA = 0,
          varianceB = 0,
          covariance = 0;
        for (let i = 0; i < actual.length; i++)
          if (i % 4 !== 3) {
            const a = expected[i]! - meanA,
              b = actual[i]! - meanB;
            varianceA += a * a;
            varianceB += b * b;
            covariance += a * b;
          }
        varianceA /= n;
        varianceB /= n;
        covariance /= n;
        const c1 = (0.01 * 255) ** 2,
          c2 = (0.03 * 255) ** 2;
        const ssim =
          ((2 * meanA * meanB + c1) * (2 * covariance + c2)) /
          ((meanA ** 2 + meanB ** 2 + c1) * (varianceA + varianceB + c2));
        const exportPng = copy.toDataURL('image/png');
        const difference = context.createImageData(copy.width, copy.height);
        for (let i = 0; i < actual.length; i++)
          difference.data[i] =
            i % 4 === 3
              ? 255
              : Math.min(255, Math.abs(actual[i]! - expected[i]!) * 8);
        context.putImageData(difference, 0, 0);
        const gl = canvas.getContext('webgl2')!;
        const extension = gl.getExtension('WEBGL_debug_renderer_info');
        observations.push({
          frame: frameNumber,
          dimensions,
          revision,
          inputIdentity: done.inputIdentity,
          ssim,
          mae: error / n / 255,
          meanIntensity: energy / n,
          resources: attachmentStore.getState().inspectRuntimeResources(),
          gpu: extension
            ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER),
          components: resources.project.layers
            .filter((layer) => layer.enabled !== false)
            .map((layer) => layer.componentId),
          previewPng,
          exportPng,
          differencePng: copy.toDataURL('image/png'),
          performance: done.result.performance,
        });
        URL.revokeObjectURL(output.uri);
      }
      return {
        observations,
        dpr: devicePixelRatio,
        projectId: resources.project.projectId,
        assetIds: resources.resolvedAssets.map((asset) => asset.id),
        artifactIds: resources.resolvedArtifacts.map((artifact) => artifact.id),
      };
    }, `/@fs${process.cwd()}`);
    for (const [index, entry] of result.observations.entries()) {
      for (const field of ['previewPng', 'exportPng', 'differencePng'] as const)
        await testInfo.attach(`${index}-${entry.frame}-${field}.png`, {
          contentType: 'image/png',
          body: Buffer.from(entry[field].split(',')[1]!, 'base64'),
        });
      expect(entry.components.length).toBeGreaterThan(0);
      expect(entry.meanIntensity).toBeGreaterThan(3);
      expect(entry.mae).toBeLessThanOrEqual(0.006);
      expect(entry.ssim).toBeGreaterThanOrEqual(0.995);
    }
    await testInfo.attach('production-render-parity.json', {
      contentType: 'application/json',
      body: Buffer.from(
        JSON.stringify(
          {
            production,
            browser: page.context().browser()!.version(),
            head: execFileSync('git', ['rev-parse', 'HEAD'], {
              encoding: 'utf8',
            }).trim(),
            diffSha256: createHash('sha256')
              .update(execFileSync('git', ['diff', 'HEAD', '--binary']))
              .digest('hex'),
            ...result,
            observations: result.observations.map(
              ({
                previewPng: _preview,
                exportPng: _export,
                differencePng: _difference,
                ...entry
              }) => entry,
            ),
          },
          null,
          2,
        ),
      ),
    });
    expect(errors).toEqual([]);
  });
}

test('an in-flight Studio clip is isolated from editor content, transport and resolution changes', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__vizEditorDebug)))
    .toBe(true);
  const result = await page.evaluate(async (base) => {
    const { loadBrowserVizProjectBundle } = await import(
      /* @vite-ignore */ `${base}/packages/viz-project-bundle/src/browser.ts`
    );
    const bundle = await loadBrowserVizProjectBundle(
      '/productions/signal-cathedral/',
    );
    const debug = window.__vizEditorDebug!;
    debug.editorControl.preview.pause();
    debug.vizControl.openProject({
      project: bundle.project,
      resolvedAssets: bundle.resolvedAssets,
      resolvedArtifacts: bundle.resolvedArtifacts,
      source: {
        kind: 'bundle',
        label: bundle.project.name,
        bundleDirectory: bundle.bundleUrl,
      },
    });
    const service = debug.vizSessionHost.getServices().renderJobs!;
    const initialRevision = debug.vizSessionHost.getSnapshot().session.revision;
    const outputs = [];
    let mutation: unknown;
    let resizeObservation:
      | Promise<{
          before: number[];
          after: number[];
          status: string | undefined;
        }>
      | undefined;
    for (const phase of ['baseline', 'during', 'after']) {
      const revision = debug.vizSessionHost.getSnapshot().session.revision;
      let changed = false;
      const unsubscribe = service.subscribe(({ job }) => {
        if (
          phase !== 'during' ||
          changed ||
          !job.progress ||
          job.progress.completed !== 1
        )
          return;
        changed = true;
        for (const layer of bundle.project.layers)
          debug.editorControl.project.updateLayerSettings(layer.id, {
            visible: true,
            opacity: 0,
            background: 'rgba(0,0,0,0)',
            blendingMode: 'normal',
            freeze: true,
            showDebug: false,
          });
        debug.editorControl.preview.seekToFrame(321);
        const previewCanvas = document.querySelector<HTMLCanvasElement>(
          'canvas[data-runtime-preview-canvas]',
        )!;
        const before = [previewCanvas.width, previewCanvas.height];
        debug.editorControl.ui.setResolutionMultiplier(0.5);
        resizeObservation = new Promise((resolve) => {
          const observe = () => {
            const after = [previewCanvas.width, previewCanvas.height];
            const status = service.get(job.id)?.status;
            if (after[0] !== before[0] || status !== 'running')
              resolve({ before, after, status });
            else requestAnimationFrame(observe);
          };
          requestAnimationFrame(observe);
        });
        mutation = {
          progress: job.progress,
          revision: debug.vizSessionHost.getSnapshot().session.revision,
        };
      });
      try {
        const job = service.start({
          schemaVersion: 1,
          kind: 'clip',
          source: {
            projectId: bundle.project.projectId,
            expectedRevision: revision,
          },
          executorId: 'browser-webgl',
          intent: 'preview',
          outputLabel: phase,
          quality: 'high',
          format: 'mp4',
          startFrame: 210,
          frameCount: 12,
          fps: 30,
          viewport: { width: 320, height: 180 },
          includeAudio: false,
        });
        const done = await service.wait(job.id);
        if (done.status !== 'succeeded' || !done.result)
          throw new Error(JSON.stringify(done));
        const output = done.result.outputs[0]!;
        try {
          outputs.push({
            phase,
            inputIdentity: done.inputIdentity,
            bytes: Array.from(
              new Uint8Array(await (await fetch(output.uri)).arrayBuffer()),
            ),
            output,
          });
        } finally {
          URL.revokeObjectURL(output.uri);
        }
      } finally {
        unsubscribe();
      }
    }
    const directory = await navigator.storage.getDirectory();
    const temporaryFiles: string[] = [];
    for await (const [name] of directory as unknown as AsyncIterable<
      [string, unknown]
    >)
      if (name.startsWith('viz-render-')) temporaryFiles.push(name);
    return {
      outputs,
      mutation,
      resize: await resizeObservation,
      initialRevision,
      finalRevision: debug.vizSessionHost.getSnapshot().session.revision,
      preview: debug.vizSessionStore.getState().preview,
      resolution: debug.editorStore.getState().resolutionMultiplier,
      temporaryFiles,
    };
  }, `/@fs${process.cwd()}`);
  const { writeFile } = await import('node:fs/promises');
  const decoded: Buffer[] = [];
  for (const output of result.outputs) {
    const path = testInfo.outputPath(`${output.phase}.mp4`);
    await writeFile(path, Buffer.from(output.bytes));
    await testInfo.attach(`${output.phase}.mp4`, {
      path,
      contentType: 'video/mp4',
    });
    decoded.push(
      execFileSync(
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
      ),
    );
  }
  expect(decoded[0]!.length).toBe(320 * 180 * 3 * 12);
  expect(decoded[1]!.equals(decoded[0]!)).toBe(true);
  const changedMean =
    decoded[2]!.reduce((sum, v, i) => sum + Math.abs(v - decoded[0]![i]!), 0) /
    decoded[0]!.length;
  expect(changedMean).toBeGreaterThan(3);
  expect(result.outputs[1]!.inputIdentity).toEqual(
    result.outputs[0]!.inputIdentity,
  );
  expect(result.outputs[2]!.inputIdentity).not.toEqual(
    result.outputs[0]!.inputIdentity,
  );
  expect(result.mutation).toBeTruthy();
  expect(result.finalRevision).toBeGreaterThan(result.initialRevision);
  expect(result.preview.transport.currentFrame).toBe(321);
  expect(result.resolution).toBe(0.5);
  expect(result.resize?.status).toBe('running');
  expect(result.resize!.after).toEqual(
    result.resize!.before.map((value) => Math.floor(value * 0.5)),
  );
  expect(result.temporaryFiles).toEqual([]);
  await testInfo.attach('editor-isolation.json', {
    contentType: 'application/json',
    body: Buffer.from(
      JSON.stringify(
        {
          ...result,
          changedMean,
          outputs: result.outputs.map(({ bytes, ...rest }) => ({
            ...rest,
            sha256: createHash('sha256')
              .update(Buffer.from(bytes))
              .digest('hex'),
          })),
        },
        null,
        2,
      ),
    ),
  });
});
