import { expect, test } from '@playwright/test';
import type { VizRenderPlan } from '@viz-engine/contracts';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

test.use({ deviceScaleFactor: 2 });

test('detached host renders exact drawing buffers and fine detail independently of DOM size and DPR', async ({
  page,
}, testInfo) => {
  await page.route('**/__render_host_proof__', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body></body></html>',
    }),
  );
  await page.goto('/__render_host_proof__');
  const plan: VizRenderPlan = {
    frameContext: {
      frame: 0,
      fps: 60,
      durationInFrames: 60,
      timeInSeconds: 0,
      deltaTimeSeconds: 1 / 60,
      isFirstFrame: true,
      isLastFrame: false,
      mode: 'render',
      seed: 'resolution-proof',
    },
    viewport: { width: 257, height: 131, backgroundColor: '#000000' },
    materializedAssets: [],
    issues: [],
    layers: [
      {
        layerId: 'detail',
        componentId: 'proof',
        rendererFamily: 'three',
        enabled: true,
        opacity: 1,
        blendMode: 'normal',
        resolvedInputs: {},
        node: {
          kind: 'group',
          children: Array.from({ length: 64 }, (_, index) => ({
            kind: 'rect' as const,
            x: index * 4,
            y: 0,
            width: 2,
            height: 131,
            style: { fill: '#ffffff' },
          })),
        },
      },
    ],
  };
  const result = await page.evaluate(
    async ({ modulePath, plan }) => {
      const { createVizThreeRenderHost } = await import(
        /* @vite-ignore */ modulePath
      );
      const canvas = document.createElement('canvas');
      canvas.style.width = '32px';
      canvas.style.height = '16px';
      const host = createVizThreeRenderHost({
        canvas,
        renderPlan: plan,
        releaseContextOnDispose: true,
      });
      try {
        await host.whenReady();
        host.render();
        const dimensions = host.getOutputDimensions();
        const copy = document.createElement('canvas');
        copy.width = plan.viewport.width;
        copy.height = plan.viewport.height;
        const context = copy.getContext('2d')!;
        context.drawImage(canvas, 0, 0);
        const row = context.getImageData(0, 65, 257, 1).data;
        // Adjacent authored bright/dark two-pixel bands cannot survive a 32px
        // preview enlarged to 257px. This observes pixels, not just metadata.
        const bands = Array.from({ length: 60 }, (_, index) => ({
          bright: row[(index * 4 + 1) * 4]!,
          dark: row[(index * 4 + 3) * 4]!,
        }));
        const resized = {
          ...plan,
          viewport: { ...plan.viewport, width: 513, height: 263 },
        };
        host.update(resized);
        const gl = canvas.getContext('webgl2')!;
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          dpr: devicePixelRatio,
          gpu: debug
            ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER),
          dimensions,
          resized: host.getOutputDimensions(),
          bands,
          mountedCanvases: document.querySelectorAll('canvas').length,
        };
      } finally {
        host.dispose();
        host.dispose();
      }
    },
    {
      modulePath: `/@fs/${process.cwd()}/packages/viz-renderer-three/src/index.ts`,
      plan,
    },
  );
  await testInfo.attach('render-host-observation.json', {
    contentType: 'application/json',
    body: Buffer.from(
      JSON.stringify(
        {
          browser: page.context().browser()!.version(),
          platform: process.platform,
          architecture: process.arch,
          head: execFileSync('git', ['rev-parse', 'HEAD'], {
            encoding: 'utf8',
          }).trim(),
          diffSha256: createHash('sha256')
            .update(execFileSync('git', ['diff', 'HEAD', '--binary']))
            .digest('hex'),
          request: plan.viewport,
          ...result,
        },
        null,
        2,
      ),
    ),
  });
  expect(result.dpr).toBe(2);
  expect(result.mountedCanvases).toBe(0);
  expect(result.dimensions).toEqual({
    width: 257,
    height: 131,
    layers: [{ width: 257, height: 131 }],
  });
  expect(result.resized).toEqual({
    width: 513,
    height: 263,
    layers: [{ width: 513, height: 263 }],
  });
  for (const band of result.bands) {
    expect(band.bright).toBeGreaterThan(200);
    expect(band.dark).toBeLessThan(30);
  }
});

test('obsolete readiness waits settle and never resubscribe to a held resource', async ({
  page,
}) => {
  await page.route('**/__readiness_proof__', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
  await page.goto('/__readiness_proof__');
  const results = await page.evaluate(async (base) => {
    const { createVizThreeRenderHost } = await import(
      /* @vite-ignore */ `${base}/packages/viz-renderer-three/src/index.ts`
    );
    const { Scene, Group, PerspectiveCamera } = await import(
      /* @vite-ignore */ `${base}/node_modules/three/build/three.module.js`
    );
    const outcomes = [];
    for (const action of ['update', 'resize', 'dispose']) {
      let calls = 0,
        disposed = 0;
      const held = new Promise<void>(() => {});
      const definition = {
        id: 'held',
        implementationVersion: '1',
        capabilityPack: { id: 'proof', version: '1' },
        factory: () => ({
          programId: 'held',
          scene: new Scene(),
          root: new Group(),
          camera: new PerspectiveCamera(),
          update() {},
          resize() {},
          render() {},
          whenReady() {
            calls++;
            return held;
          },
          dispose() {
            disposed++;
          },
        }),
      };
      const plan = {
        frameContext: {
          frame: 0,
          fps: 60,
          durationInFrames: 60,
          timeInSeconds: 0,
          deltaTimeSeconds: 1 / 60,
          isFirstFrame: true,
          isLastFrame: false,
          mode: 'render',
          seed: 'readiness',
        },
        viewport: { width: 16, height: 16, backgroundColor: '#000000' },
        materializedAssets: [],
        issues: [],
        layers: [
          {
            layerId: 'held',
            componentId: 'proof',
            rendererFamily: 'three',
            enabled: true,
            opacity: 1,
            blendMode: 'normal',
            resolvedInputs: {},
            node: { kind: 'three-program', programId: 'held', parameters: {} },
          },
        ],
      };
      const host = createVizThreeRenderHost({
        canvas: document.createElement('canvas'),
        renderPlan: plan,
        releaseContextOnDispose: true,
        programRegistry: { get: () => definition, list: () => [definition] },
      });
      const ready = host.whenReady().then(
        () => 'resolved',
        (error: Error) => error.message,
      );
      if (action === 'dispose') host.dispose();
      else if (action === 'resize') host.resize(32, 32);
      else host.update(plan);
      const outcome = await ready;
      if (action !== 'dispose') {
        for (let i = 0; i < 20; i++) {
          host.update(plan);
          await Promise.resolve();
        }
        host.dispose();
      }
      outcomes.push({ action, outcome, calls, disposed });
    }
    return outcomes;
  }, `/@fs${process.cwd()}`);
  for (const result of results) {
    expect(result.outcome).toMatch(/changed|disposed/i);
    expect(result.calls).toBe(1);
    expect(result.disposed).toBe(1);
  }
});

for (const outcome of ['loaded', 'failed'] as const) {
  test(`shared host waits for a held real image and reports ${outcome}`, async ({
    page,
  }) => {
    await page.route('**/__image_ready__', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
    );
    await page.goto('/__image_ready__');
    let release!: () => Promise<void>;
    let requested = false;
    await page.route('**/held-image.svg', async (route) => {
      release = () =>
        outcome === 'loaded'
          ? route.fulfill({
              contentType: 'image/svg+xml',
              body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="red"/></svg>',
            })
          : route.abort();
      requested = true;
    });
    let settled = false;
    const observation = page
      .evaluate(async (base) => {
        const { createVizThreeRenderHost } = await import(
          /* @vite-ignore */ `${base}/packages/viz-renderer-three/src/index.ts`
        );
        const canvas = document.createElement('canvas');
        const host = createVizThreeRenderHost({
          canvas,
          releaseContextOnDispose: true,
          renderPlan: {
            frameContext: {
              frame: 0,
              fps: 60,
              durationInFrames: 60,
              timeInSeconds: 0,
              deltaTimeSeconds: 1 / 60,
              isFirstFrame: true,
              isLastFrame: false,
              mode: 'render',
              seed: 'image',
            },
            viewport: { width: 16, height: 16, backgroundColor: '#000000' },
            materializedAssets: [
              {
                id: 'image',
                kind: 'image',
                imageSourceUri: '/held-image.svg',
                width: 16,
                height: 16,
              },
            ],
            issues: [],
            layers: [
              {
                layerId: 'image',
                componentId: 'proof',
                rendererFamily: 'three',
                enabled: true,
                opacity: 1,
                blendMode: 'normal',
                resolvedInputs: {},
                node: {
                  kind: 'image',
                  assetId: 'image',
                  x: 0,
                  y: 0,
                  width: 16,
                  height: 16,
                },
              },
            ],
          },
        });
        try {
          const pendingLoads = host.getResourceStats().pendingImageLoads;
          try {
            await host.whenReady();
            host.render();
            const target = document.createElement('canvas');
            target.width = 16;
            target.height = 16;
            const context = target.getContext('2d')!;
            context.drawImage(canvas, 0, 0);
            return {
              pendingLoads,
              ready: true,
              pixel: [...context.getImageData(8, 8, 1, 1).data],
            };
          } catch (error) {
            return { pendingLoads, ready: false, error: String(error) };
          }
        } finally {
          host.dispose();
        }
      }, `/@fs${process.cwd()}`)
      .then((value) => {
        settled = true;
        return value;
      });
    await expect.poll(() => requested).toBe(true);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    expect(settled).toBe(false);
    await release();
    const result = await observation;
    expect(result.pendingLoads).toBe(1);
    expect(result.ready).toBe(outcome === 'loaded');
    if (outcome === 'loaded') expect(result.pixel).toEqual([255, 0, 0, 255]);
    else expect(result.error).toMatch(/Could not load render image/);
  });
}
