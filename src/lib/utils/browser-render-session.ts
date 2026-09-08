import type { VizRuntimeAudioFrameSnapshot } from '@viz-engine/contracts';
import { createVizRenderFrameSession } from '@viz-engine/render';
import {
  createVizThreeRenderHost,
  type VizThreeProgramRegistry,
  type VizThreeRenderHost,
} from '@viz-engine/renderer-three';
import {
  sampleProjectAudioFrameSnapshot,
  type VizComponentRegistry,
  type VizNodeRegistry,
} from '@viz-engine/runtime';
import {
  bakeBrowserAudioFeatures,
  sampleBrowserAudioBakeFrame,
  type BrowserAudioBake,
} from './browser-audio-bake';
import type {
  VizBrowserFrameCaptureSession,
  VizBrowserRenderContext,
} from './browser-render-executor';

const waitForResources = (promise: Promise<void>, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort));
  });

/** One job owns one detached GPU canvas, runtime history, and resource lifetime. */
export const openVizBrowserRenderSession = async (
  { source, request, signal, audio }: VizBrowserRenderContext,
  registries: {
    componentRegistry: VizComponentRegistry;
    nodeRegistry: VizNodeRegistry;
    programRegistry: VizThreeProgramRegistry;
  },
): Promise<VizBrowserFrameCaptureSession> => {
  signal.throwIfAborted();
  const project = source.project;
  const fps = project.timeline.fps;
  let bake: BrowserAudioBake | undefined;
  const loaded = !sampleProjectAudioFrameSnapshot(
    project,
    source.resolvedArtifacts,
    0,
  )
    ? await audio.load()
    : undefined;
  if (loaded) {
    signal.throwIfAborted();
    // Bake from timeline origin at timeline FPS, so cold seeks and skipped export
    // frames reconstruct the same temporal history as sequential evaluation.
    bake = await bakeBrowserAudioFeatures(
      loaded.audioBuffer,
      loaded.sourceContentIdentity,
      {
        fps,
        shouldCancel: () => signal.aborted,
      },
    );
  }
  signal.throwIfAborted();
  const silence: VizRuntimeAudioFrameSnapshot = {
    frequencyData: new Uint8Array(0),
    timeDomainData: new Uint8Array(0),
    sampleRate: project.timeline.sampleRate ?? 44100,
    fftSize: 2048,
    minDecibels: -90,
    maxDecibels: -10,
    provenance: 'baked',
  };
  const evaluation = createVizRenderFrameSession({
    source,
    request,
    registry: registries.componentRegistry,
    nodeRegistry: registries.nodeRegistry,
    runtimeInputProvider: (frame) => ({
      audio:
        sampleProjectAudioFrameSnapshot(
          project,
          source.resolvedArtifacts,
          frame,
        ) ?? (bake ? sampleBrowserAudioBakeFrame(bake, frame) : silence),
    }),
  });
  const canvas = document.createElement('canvas');
  let host: VizThreeRenderHost | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener('abort', dispose);
    host?.dispose();
    host = undefined;
    bake = undefined;
    canvas.width = 0;
    canvas.height = 0;
  };
  signal.addEventListener('abort', dispose, { once: true });
  return {
    async captureFrame({ frame }) {
      signal.throwIfAborted();
      if (disposed) throw new Error('Render session is disposed.');
      const plan = evaluation.evaluate(frame);
      if (plan.issues.length > 0) {
        throw new Error(plan.issues.map((issue) => issue.message).join('\n'));
      }
      if (host) host.update(plan);
      else
        host = createVizThreeRenderHost({
          canvas,
          renderPlan: plan,
          programRegistry: registries.programRegistry,
          releaseContextOnDispose: true,
        });
      await waitForResources(host.whenReady(), signal);
      signal.throwIfAborted();
      const failed = host
        .getModelResourceDiagnostics()
        .filter((entry) => entry.status === 'failed');
      if (failed.length)
        throw new Error(
          `Render model loading failed: ${JSON.stringify(failed)}`,
        );
      host.render();
      return canvas;
    },
    dispose,
  };
};
