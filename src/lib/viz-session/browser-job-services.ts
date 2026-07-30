import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorRuntimePreviewAttachmentStore, {
  waitForEditorRuntimePreviewAttachments,
} from '@/lib/stores/editor-runtime-preview-attachment-store';
import {
  bakeBrowserAudioFeatures,
  createVizBrowserAudioBakeSourceResolver,
  loadAndDecodeBrowserAudio,
  sampleBrowserAudioBakeFrame,
  type BrowserAudioBake,
} from '@/lib/utils/browser-audio-bake';
import { createVizBrowserRenderExecutor } from '@/lib/utils/browser-render-executor';
import { fastCaptureCanvas } from '@/lib/utils/fast-frame-capture';
import { encodeVideoWithProbe } from '@/lib/utils/video-encoder';
import { createVizAudioFeatureBakeJobService } from '@viz-engine/bake';
import type { VizSessionHost } from '@viz-engine/editor-control';
import {
  createVizRenderJobService,
  createVizRenderSourceContentIdentity,
  type VizRenderSource,
} from '@viz-engine/render';
import {
  resolveVizProjectAudioAsset,
  sampleProjectAudioFrameSnapshot,
} from '@viz-engine/runtime';

import { createVizSessionRuntimePreviewFrame } from './runtime-preview';
import type {
  VizSessionProjectState,
  VizSessionRuntimePreviewAudioFrameData,
  VizSessionRuntimePreviewFrame,
} from './types';

interface CreateStudioBrowserJobServicesOptions {
  getHost(): VizSessionHost;
  getProjectState(): VizSessionProjectState;
  renderRuntimePreviewFrame(
    frame: VizSessionRuntimePreviewFrame,
    audio: VizSessionRuntimePreviewAudioFrameData,
  ): void;
}

export const createStudioBrowserJobServices = ({
  getHost,
  getProjectState,
  renderRuntimePreviewFrame,
}: CreateStudioBrowserJobServicesOptions) => {
  const renderAudioBakes = new WeakMap<
    object,
    Promise<BrowserAudioBake | undefined>
  >();
  const resolveRenderAudioUrl = (source: VizRenderSource) =>
    resolveVizProjectAudioAsset(source.project, source.resolvedAssets)?.resolved
      .uri ??
    getHost().getSnapshot().audioSession.source?.uri ??
    useAudioEngineStore.getState().audioElementRef.current?.currentSrc;

  const audioFeatureBakeJobs = createVizAudioFeatureBakeJobService({
    sourceResolver: createVizBrowserAudioBakeSourceResolver((request) => {
      const asset = getHost()
        .getProjectResources()
        .resolvedAssets.find(
          (candidate) =>
            candidate.id === request.sourceAssetId &&
            candidate.kind === 'audio',
        );
      if (!asset) {
        throw new Error(
          `No resolved audio asset "${request.sourceAssetId}" is available in the active session.`,
        );
      }
      return asset.uri;
    }),
  });

  const renderJobs = createVizRenderJobService({
    sourceResolver: {
      resolve: async (_request, signal) => {
        if (signal.aborted) {
          throw new Error('Render source resolution was cancelled.');
        }
        if (!getProjectState().initialized) {
          throw new Error('The editor project session is still initializing.');
        }
        const host = getHost();
        const resources = host.getProjectResources();
        return {
          project: resources.project,
          resolvedAssets: resources.resolvedAssets,
          resolvedArtifacts: resources.resolvedArtifacts,
          contentIdentity: createVizRenderSourceContentIdentity(resources),
          revision: host.getSnapshot().session.revision,
        };
      },
    },
    executors: [
      createVizBrowserRenderExecutor({
        encodeVideo: async ({
          frames,
          audioUrl,
          request,
          source,
          signal,
          onProgress,
        }) =>
          encodeVideoWithProbe(
            frames,
            audioUrl,
            {
              fps: request.fps,
              width: request.viewport.width,
              height: request.viewport.height,
              format: request.format,
              quality:
                request.quality === 'high'
                  ? 'high'
                  : request.quality === 'standard'
                    ? 'medium'
                    : 'low',
              audioStartTime: request.startFrame / source.project.timeline.fps,
              audioDuration: request.frameCount / request.fps,
            },
            (percentage) => onProgress(percentage / 100),
            { signal },
          ),
        resolveAudioUrl: (source) => resolveRenderAudioUrl(source) ?? null,
        captureFrame: async ({
          request,
          source,
          frame,
          sequenceIndex,
          firstFrame,
          signal,
        }) => {
          if (signal.aborted) {
            throw new Error('Render was cancelled.');
          }

          const host = getHost();
          const currentResources = host.getProjectResources();
          const currentRevision = host.getSnapshot().session.revision;
          const currentIdentity =
            createVizRenderSourceContentIdentity(currentResources);
          if (
            currentRevision !== source.revision ||
            currentIdentity !== source.contentIdentity
          ) {
            throw new Error(
              'The working project changed during browser rendering.',
            );
          }

          const fps = source.project.timeline.fps;
          let audio: VizSessionRuntimePreviewAudioFrameData | undefined =
            sampleProjectAudioFrameSnapshot(
              source.project,
              source.resolvedArtifacts,
              frame,
            );
          if (!audio && (request.kind === 'clip' || request.kind === 'video')) {
            let bake = renderAudioBakes.get(source);
            if (!bake) {
              bake = (async () => {
                const audioUrl = resolveRenderAudioUrl(source);
                if (!audioUrl) {
                  return undefined;
                }
                const loaded = await loadAndDecodeBrowserAudio(
                  audioUrl,
                  signal,
                );
                return bakeBrowserAudioFeatures(
                  loaded.audioBuffer,
                  loaded.sourceContentIdentity,
                  {
                    fps: request.fps,
                    startTime: request.startFrame / fps,
                    duration: request.frameCount / request.fps,
                    shouldCancel: () => signal.aborted,
                  },
                );
              })();
              renderAudioBakes.set(source, bake);
            }
            const browserBake = await bake;
            audio = browserBake
              ? sampleBrowserAudioBakeFrame(browserBake, sequenceIndex)
              : undefined;
          }
          audio ??= {
            frequencyData: new Uint8Array(0),
            timeDomainData: new Uint8Array(0),
            sampleRate: source.project.timeline.sampleRate ?? 44_100,
            fftSize: 2_048,
          };
          const previewFrame = createVizSessionRuntimePreviewFrame({
            currentFrame: frame,
            time: frame / fps,
            dt: 1 / fps,
            fps,
            mode: 'export',
          });

          if (firstFrame) {
            await waitForEditorRuntimePreviewAttachments(
              source.project.layers.map((layer) => layer.id),
              { signal },
            );
          }
          renderRuntimePreviewFrame(previewFrame, audio);
          if (firstFrame) {
            await useEditorRuntimePreviewAttachmentStore
              .getState()
              .whenRuntimeResourcesReady();
            if (signal.aborted) {
              throw new Error('Render was cancelled.');
            }
            renderRuntimePreviewFrame(previewFrame, audio);
          }

          const rendererContainer = document.querySelector<HTMLElement>(
            '[data-renderer-container]',
          );
          if (!rendererContainer) {
            throw new Error('The preserved editor renderer is not mounted.');
          }
          for (const canvas of rendererContainer.querySelectorAll('canvas')) {
            const gl =
              canvas.getContext('webgl2') ?? canvas.getContext('webgl');
            gl?.finish();
          }
          return fastCaptureCanvas(rendererContainer, {
            width: request.viewport.width,
            height: request.viewport.height,
            backgroundColor: request.viewport.backgroundColor ?? '#000000',
          });
        },
      }),
    ],
  });

  return { audioFeatureBakeJobs, renderJobs };
};
