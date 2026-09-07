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
