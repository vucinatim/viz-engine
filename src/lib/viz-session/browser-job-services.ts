import { createVizBrowserAudioBakeSourceResolver } from '@/lib/utils/browser-audio-bake';
import { createVizBrowserRenderExecutor } from '@/lib/utils/browser-render-executor';
import { openVizBrowserRenderSession } from '@/lib/utils/browser-render-session';
import { encodeVideoWithProbe } from '@/lib/utils/video-encoder';
import {
  studioComponentRegistry,
  studioNodeRegistry,
  studioThreeProgramRegistry,
} from '@/lib/viz-capabilities';
import { createVizAudioFeatureBakeJobService } from '@viz-engine/bake';
import type { VizSessionHost } from '@viz-engine/editor-control';
import { createVizRenderJobService } from '@viz-engine/render';
import { resolveVizProjectAudioAsset } from '@viz-engine/runtime';
import { createStudioRenderSource } from './render-source';
import type { VizSessionProjectState } from './types';

interface CreateStudioBrowserJobServicesOptions {
  getHost(): VizSessionHost;
  getProjectState(): VizSessionProjectState;
}

export const createStudioBrowserJobServices = ({
  getHost,
  getProjectState,
}: CreateStudioBrowserJobServicesOptions) => {
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
        return createStudioRenderSource(
          resources,
          host.getSnapshot().session.revision,
        );
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
        resolveAudioUrl: (source) =>
          resolveVizProjectAudioAsset(source.project, source.resolvedAssets)
            ?.resolved.uri ?? null,
        openCaptureSession: (context) =>
          openVizBrowserRenderSession(context, {
            componentRegistry: studioComponentRegistry,
            nodeRegistry: studioNodeRegistry,
            programRegistry: studioThreeProgramRegistry,
          }),
      }),
    ],
  });

  return { audioFeatureBakeJobs, renderJobs };
};
