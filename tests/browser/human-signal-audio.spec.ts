import { expect, test } from '@playwright/test';
import type { VizAudioFeatureTimelineArtifact } from '@viz-engine/contracts';
import { writeHumanSignalBundle } from '@viz-engine/production-human-signal/node';
import { loadLocalVizProjectBundle } from '@viz-engine/project-bundle/node';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let directory: string;
let expected: { frequency: string; timeDomain: string; features: string };
const digest = (bytes: Uint8Array | string) =>
  createHash('sha256').update(bytes).digest('hex');
test.beforeAll(async () => {
  mkdirSync(resolve('.artifacts/browser-fixtures'), { recursive: true });
  const workspace = mkdtempSync(
    resolve('.artifacts/browser-fixtures/human-signal-'),
  );
  directory = resolve(workspace, 'bundle');
  await writeHumanSignalBundle({
    repositoryRoot: process.cwd(),
    bundleDirectory: directory,
  });
  const reopened = loadLocalVizProjectBundle(directory);
  const artifact = reopened.resolvedArtifacts[0]!
    .payload as VizAudioFeatureTimelineArtifact;
  expected = {
    frequency: digest(artifact.packedFrames!.frequency.data as Uint8Array),
    timeDomain: digest(artifact.packedFrames!.timeDomain.data as Uint8Array),
    features: digest(JSON.stringify(artifact.featureSeries)),
  };
});
test.afterAll(() => {
  if (directory)
    rmSync(resolve(directory, '..'), { recursive: true, force: true });
});

test('Human Signal ordinary preview, seeks, still and actual video consume the portable bake', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__vizEditorDebug)))
    .toBe(true);
  await page.evaluate(
    async ({ base, directory }) => {
      const { loadBrowserVizProjectBundle } = await import(
        /* @vite-ignore */ `${base}/packages/viz-project-bundle/src/browser.ts`
      );
      const bundle = await loadBrowserVizProjectBundle(`/@fs${directory}/`);
      const debug = window.__vizEditorDebug!;
      debug.editorControl.preview.pause();
      debug.vizControl.openProject({
        project: bundle.project,
        resolvedAssets: bundle.resolvedAssets,
        resolvedArtifacts: bundle.resolvedArtifacts,
        source: {
          kind: 'bundle',
          label: 'Human Signal',
          bundleDirectory: bundle.bundleUrl,
        },
      });
    },
    { base: `/@fs${process.cwd()}`, directory },
  );
  await expect(
    page.locator('canvas[data-runtime-preview-canvas]'),
  ).toBeVisible();
  const result = await page.evaluate(async (base) => {
    const { vizSessionActions, createVizSessionRuntimePreviewFrame } =
      await import(/* @vite-ignore */ `${base}/src/lib/viz-session/index.ts`);
    const { sampleProjectAudioFrameSnapshot } = await import(
      /* @vite-ignore */ `${base}/packages/viz-runtime/src/index.ts`
    );
    const { default: attachment } = await import(
      /* @vite-ignore */ `${base}/src/lib/stores/editor-runtime-preview-attachment-store.ts`
    );
    const { createVizRenderFrameSession } = await import(
      /* @vite-ignore */ `${base}/packages/viz-render/src/index.ts`
    );
    const { studioComponentRegistry, studioNodeRegistry } = await import(
      /* @vite-ignore */ `${base}/src/lib/viz-capabilities.ts`
    );
    const debug = window.__vizEditorDebug!;
    const resources = debug.vizSessionHost.getProjectResources();
    const service = debug.vizSessionHost.getServices().renderJobs!;
    const source = {
      project: resources.project,
      resolvedAssets: resources.resolvedAssets,
      resolvedArtifacts: resources.resolvedArtifacts,
      contentIdentity: 'human-signal-observation',
    };
    const frameSession = createVizRenderFrameSession({
      source,
      request: {
        schemaVersion: 1,
        kind: 'still',
        source: { projectId: resources.project.projectId },
        executorId: 'browser-webgl',
        intent: 'preview',
        outputLabel: 'audio-observation',
        quality: 'high',
        format: 'png',
        frame: 2879,
      },
      registry: studioComponentRegistry,
      nodeRegistry: studioNodeRegistry,
      runtimeInputProvider: (frame: number) => ({
        audio: sampleProjectAudioFrameSnapshot(
          resources.project,
          resources.resolvedArtifacts,
          frame,
        )!,
      }),
    });
    const hash = async (bytes: Uint8Array) =>
      Array.from(
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', bytes.slice().buffer),
        ),
        (b) => b.toString(16).padStart(2, '0'),
      ).join('');
    const artifact = resources.resolvedArtifacts[0]!
      .payload as import('@viz-engine/contracts').VizAudioFeatureTimelineArtifact;
    const artifactHashes = {
      frequency: await hash(
        artifact.packedFrames!.frequency.data as Uint8Array,
      ),
      timeDomain: await hash(
        artifact.packedFrames!.timeDomain.data as Uint8Array,
      ),
      features: await hash(
        new TextEncoder().encode(JSON.stringify(artifact.featureSeries)),
      ),
    };
    const observations = [];
    let previewPng = '';
    let previewPixels = new Uint8ClampedArray();
    let dimensions = { width: 0, height: 0 };
    for (const frameNumber of [
      0, 404, 405, 1124, 1125, 1604, 1605, 2204, 2205, 2879, 405,
    ]) {
      const frame = createVizSessionRuntimePreviewFrame({
        currentFrame: frameNumber,
        time: frameNumber / 60,
        dt: 1 / 60,
        fps: 60,
        mode: 'live',
      });
      vizSessionActions.preview.renderRuntimePreviewFrame(frame);
      await attachment.getState().whenPreviewReady();
      vizSessionActions.preview.renderRuntimePreviewFrame(frame);
      const inspection = vizSessionActions.preview.inspectRuntimePreview();
      const plan = frameSession.evaluate(frameNumber);
      const previewLayer = inspection.lastLayerSnapshots.find(
        (layer) => layer.componentId === 'curve-spectrum',
      )!;
      const renderedLayer = plan.layers.find(
        (layer) => layer.componentId === 'curve-spectrum',
      )!;
      const sampled = sampleProjectAudioFrameSnapshot(
        resources.project,
        resources.resolvedArtifacts,
        frameNumber,
      )!;
      observations.push({
        frame: frameNumber,
        expected: await hash(sampled.frequencyData),
        preview: await hash(
          previewLayer.resolvedInputs.spectrum!.value as Uint8Array,
        ),
        directRender: await hash(
          renderedLayer.resolvedInputs.spectrum!.value as Uint8Array,
        ),
        issues: [...inspection.lastPlanIssues, ...plan.issues],
        provenance: sampled.provenance,
        sampleRate: sampled.sampleRate,
      });
      if (frameNumber === 405) {
        const canvas = document.querySelector<HTMLCanvasElement>(
          'canvas[data-runtime-preview-canvas]',
        )!;
        const copy = document.createElement('canvas');
        copy.width = canvas.width;
        copy.height = canvas.height;
        copy.getContext('2d')!.drawImage(canvas, 0, 0);
        dimensions = { width: copy.width, height: copy.height };
        previewPng = copy.toDataURL('image/png');
        previewPixels = copy
          .getContext('2d')!
          .getImageData(0, 0, copy.width, copy.height).data;
      }
    }
    const revision = debug.vizSessionHost.getSnapshot().session.revision;
    const common = {
      schemaVersion: 1 as const,
      source: {
        projectId: resources.project.projectId,
        expectedRevision: revision,
      },
      executorId: 'browser-webgl',
      intent: 'preview' as const,
      outputLabel: 'human-signal-audio-proof',
      quality: 'high' as const,
    };
    const still = await service.wait(
      service.start({
        ...common,
        kind: 'still',
        format: 'png',
        frame: 405,
        viewport: dimensions,
      }).id,
    );
    if (still.status !== 'succeeded' || !still.result)
      throw new Error(JSON.stringify(still));
    const stillBlob = await (await fetch(still.result.outputs[0]!.uri)).blob();
    const bitmap = await createImageBitmap(stillBlob);
    const copy = document.createElement('canvas');
    copy.width = bitmap.width;
    copy.height = bitmap.height;
    const context = copy.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const stillPixels = context.getImageData(
      0,
      0,
      copy.width,
      copy.height,
    ).data;
    let error = 0;
    for (let i = 0; i < stillPixels.length; i++)
      if (i % 4 !== 3) error += Math.abs(stillPixels[i]! - previewPixels[i]!);
    const stillMae = error / (copy.width * copy.height * 3 * 255);
    const stillPng = copy.toDataURL('image/png');
    const videoReference = await service.wait(
      service.start({
        ...common,
        kind: 'still',
        format: 'png',
        frame: 405,
        viewport: { width: 640, height: 360 },
      }).id,
    );
    if (videoReference.status !== 'succeeded' || !videoReference.result)
      throw new Error(JSON.stringify(videoReference));
    const videoReferenceBlob = await (
      await fetch(videoReference.result.outputs[0]!.uri)
    ).blob();
    const videoReferencePng = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(videoReferenceBlob);
    });
    URL.revokeObjectURL(videoReference.result.outputs[0]!.uri);
    const clip = await service.wait(
      service.start({
        ...common,
        kind: 'clip',
        format: 'mp4',
        startFrame: 400,
        frameCount: 12,
        fps: 60,
        viewport: { width: 640, height: 360 },
        includeAudio: true,
      }).id,
    );
    if (clip.status !== 'succeeded' || !clip.result)
      throw new Error(JSON.stringify(clip));
    const clipBlob = await (await fetch(clip.result.outputs[0]!.uri)).blob();
    const clipData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(clipBlob);
    });
    // A valid-shape counterfactual tests whether visible output actually depends
    // on baked frequency frames, rather than passing on a mostly static scene.
    const wrongArtifact = structuredClone(artifact);
    wrongArtifact.packedFrames!.frequency.data = new Uint8Array(
      (artifact.packedFrames!.frequency.data as Uint8Array).length,
    );
    const wrongResources = resources.resolvedArtifacts.map((entry) =>
      entry.id === artifact.id ? { ...entry, payload: wrongArtifact } : entry,
    );
    debug.vizControl.openProject({
      project: resources.project,
      resolvedAssets: resources.resolvedAssets,
      resolvedArtifacts: wrongResources,
    });
    const wrongRevision = debug.vizSessionHost.getSnapshot().session.revision;
    const wrong = await service.wait(
      service.start({
        ...common,
        source: {
          projectId: resources.project.projectId,
          expectedRevision: wrongRevision,
        },
        kind: 'still',
        format: 'png',
        frame: 405,
        viewport: { width: 640, height: 360 },
      }).id,
    );
    if (wrong.status !== 'succeeded' || !wrong.result)
      throw new Error(JSON.stringify(wrong));
    const wrongBlob = await (await fetch(wrong.result.outputs[0]!.uri)).blob();
    const wrongPng = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(wrongBlob);
    });
    URL.revokeObjectURL(wrong.result.outputs[0]!.uri);
    URL.revokeObjectURL(still.result.outputs[0]!.uri);
    URL.revokeObjectURL(clip.result.outputs[0]!.uri);
    return {
      wrongPng,
      videoReferencePng,
      artifactHashes,
      observations,
      stillMae,
      previewPng,
      stillPng,
      dimensions,
      clipData,
      clipProbe: clip.result.mediaProbe,
      clipPerformance: clip.result.performance,
      bakeDescriptor: artifact.metadata,
      artifactFrames: artifact.frameAlignment.frameCount,
      featureCount: artifact.featureSeries.length,
    };
  }, `/@fs${process.cwd()}`);
  expect(result.artifactHashes).toEqual(expected);
  expect(result.artifactFrames).toBe(2880);
  expect(result.featureCount).toBe(9);
  for (const observation of result.observations) {
    expect(observation.preview).toBe(observation.expected);
    expect(observation.directRender).toBe(observation.expected);
    expect(observation.issues).toEqual([]);
    expect(observation.provenance).toBe('baked');
    expect(observation.sampleRate).toBe(48000);
  }
  expect(
    new Set(result.observations.map((value) => value.expected)).size,
  ).toBeGreaterThan(3);
  expect(result.stillMae).toBeLessThanOrEqual(0.006);
  for (const name of ['previewPng', 'stillPng'] as const)
    await testInfo.attach(`${name}.png`, {
      contentType: 'image/png',
      body: Buffer.from(result[name].split(',')[1]!, 'base64'),
    });
  const clipPath = testInfo.outputPath('human-signal-boundary-400-412.mp4');
  const referencePath = testInfo.outputPath('video-reference-frame-405.png');
  const wrongPath = testInfo.outputPath('wrong-baked-frequency-frame-405.png');
  await writeFile(
    clipPath,
    Buffer.from(result.clipData.split(',')[1]!, 'base64'),
  );
  await writeFile(
    referencePath,
    Buffer.from(result.videoReferencePng.split(',')[1]!, 'base64'),
  );
  await writeFile(
    wrongPath,
    Buffer.from(result.wrongPng.split(',')[1]!, 'base64'),
  );
  await testInfo.attach('human-signal-boundary-400-412.mp4', {
    contentType: 'video/mp4',
    path: clipPath,
  });
  await testInfo.attach('video-reference-frame-405.png', {
    contentType: 'image/png',
    path: referencePath,
  });
  const decode = (path: string, video: boolean) =>
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-i',
      path,
      ...(video ? ['-vf', 'select=eq(n\\,5)'] : []),
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      'pipe:1',
    ]);
  const videoFrame = decode(clipPath, true),
    referenceFrame = decode(referencePath, false),
    wrongFrame = decode(wrongPath, false);
  expect(videoFrame.length).toBe(640 * 360 * 3);
  expect(referenceFrame.length).toBe(videoFrame.length);
  let difference = 0,
    energy = 0;
  for (let i = 0; i < videoFrame.length; i++) {
    difference += Math.abs(videoFrame[i]! - referenceFrame[i]!);
    energy += referenceFrame[i]!;
  }
  const videoMae = difference / (videoFrame.length * 255);
  expect(energy / videoFrame.length).toBeGreaterThan(3);
  let wrongDifference = 0;
  for (let i = 0; i < videoFrame.length; i++)
    wrongDifference += Math.abs(videoFrame[i]! - wrongFrame[i]!);
  const wrongVideoMae = wrongDifference / (videoFrame.length * 255);
  const bundle = loadLocalVizProjectBundle(directory);
  const wav = fileURLToPath(
    bundle.resolvedAssets.find(
      (asset) => asset.id === 'asset-human-signal-approved-window',
    )!.uri,
  );
  const original = fileURLToPath(
    bundle.resolvedAssets.find(
      (asset) => asset.id === 'asset-human-signal-source-audio',
    )!.uri,
  );
  const pcm = (path: string, window: boolean) => {
    const bytes = execFileSync('ffmpeg', [
      '-v',
      'error',
      '-i',
      path,
      ...(window ? ['-ss', String(400 / 60), '-t', String(12 / 60)] : []),
      '-vn',
      '-ar',
      '48000',
      '-ac',
      '1',
      '-f',
      'f32le',
      'pipe:1',
    ]);
    return Array.from({ length: bytes.length / 4 }, (_, i) =>
      bytes.readFloatLE(i * 4),
    );
  };
  const decodedAudio = pcm(clipPath, false),
    expectedAudio = pcm(wav, true),
    wrongAudio = pcm(original, true);
  const correlate = (reference: number[]) => {
    let correlation = -1,
      lag = 0;
    for (let offset = -800; offset <= 800; offset++) {
      let ab = 0,
        aa = 0,
        bb = 0;
      const begin = Math.max(0, -offset),
        end = Math.min(reference.length, decodedAudio.length - offset);
      for (let i = begin; i < end; i++) {
        const a = reference[i]!,
          b = decodedAudio[i + offset]!;
        ab += a * b;
        aa += a * a;
        bb += b * b;
      }
      const value = ab / Math.sqrt(aa * bb);
      if (value > correlation) {
        correlation = value;
        lag = offset;
      }
    }
    return { correlation, lagSamples: lag };
  };
  const audioCorrelation = correlate(expectedAudio),
    wrongSourceCorrelation = correlate(wrongAudio);
  const {
    previewPng: _preview,
    stillPng: _still,
    clipData: _clip,
    videoReferencePng: _videoReference,
    wrongPng: _wrong,
    ...report
  } = result;
  const reportPath = testInfo.outputPath('human-signal-audio-cross-path.json');
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        ...report,
        videoMae,
        wrongVideoMae,
        audioCorrelation,
        wrongSourceCorrelation,
        decodedAudioSamples: decodedAudio.length,
        comparisonSampleRate: 48000,
        browser: page.context().browser()!.version(),
        head: execFileSync('git', ['rev-parse', 'HEAD'], {
          encoding: 'utf8',
        }).trim(),
        sourceDiffSha256: digest(
          execFileSync('git', ['diff', 'HEAD', '--binary']),
        ),
        expected,
        errors,
      },
      null,
      2,
    ),
  );
  await testInfo.attach('human-signal-audio-cross-path.json', {
    contentType: 'application/json',
    path: reportPath,
  });
  expect(videoMae).toBeLessThanOrEqual(0.015);
  expect(wrongVideoMae).toBeGreaterThan(videoMae * 1.1);
  expect(audioCorrelation.correlation).toBeGreaterThan(0.98);
  expect(
    audioCorrelation.correlation - wrongSourceCorrelation.correlation,
  ).toBeGreaterThan(0.2);
  expect(
    Math.abs(decodedAudio.length - expectedAudio.length),
  ).toBeLessThanOrEqual(800);
  expect(errors).toEqual([]);
});

test('audio export rejects an unresolved declared derivative while original lineage remains available', async ({
  page,
}) => {
  await page.goto('/');
  const observations = await page.evaluate(
    async ({ base, directory }) => {
      const { loadBrowserVizProjectBundle } = await import(
        /* @vite-ignore */ `${base}/packages/viz-project-bundle/src/browser.ts`
      );
      const { createVizBrowserRenderAudio } = await import(
        /* @vite-ignore */ `${base}/src/lib/utils/browser-render-audio.ts`
      );
      const { openVizStreamingVideoEncoder } = await import(
        /* @vite-ignore */ `${base}/src/lib/utils/video-encoder.ts`
      );
      const bundle = await loadBrowserVizProjectBundle(`/@fs${directory}/`);
      const derivativeId = bundle.project.artifactRefs![0]!.sourceAssetId!;
      const observations = [];
      for (const missing of ['reference', 'resource']) {
        const project = structuredClone(bundle.project);
        if (missing === 'reference')
          project.assetRefs = project.assetRefs!.filter(
            (asset) => asset.id !== derivativeId,
          );
        const resolvedAssets = bundle.resolvedAssets.filter(
          (asset) => missing !== 'resource' || asset.id !== derivativeId,
        );
        const request = {
          schemaVersion: 1 as const,
          kind: 'clip' as const,
          source: { projectId: project.projectId },
          executorId: 'browser-webgl',
          intent: 'preview' as const,
          outputLabel: 'missing-derivative',
          quality: 'high' as const,
          format: 'mp4' as const,
          startFrame: 0,
          frameCount: 12,
          fps: 60,
          viewport: { width: 64, height: 48 },
          includeAudio: true,
        };
        const signal = new AbortController().signal;
        const audio = createVizBrowserRenderAudio({
          source: {
            project,
            resolvedAssets,
            resolvedArtifacts: bundle.resolvedArtifacts,
            contentIdentity: 'missing-derivative-observation',
          },
          request,
          signal,
          onProgress() {},
        });
        let message = '';
        try {
          const encoder = await openVizStreamingVideoEncoder({
            request,
            sourceFps: 60,
            audio,
            signal,
          });
          await encoder.dispose();
        } catch (error) {
          message = (error as Error).message;
        } finally {
          audio.dispose();
        }
        observations.push({
          missing,
          message,
          decodedBytes: audio.decodedBytes(),
        });
      }
      return observations;
    },
    { base: `/@fs${process.cwd()}`, directory },
  );
  for (const observation of observations) {
    expect(observation.message).toBe(
      'Video requested audio, but no canonical resolved audio asset is available.',
    );
    expect(observation.decodedBytes).toBe(0);
  }
});
