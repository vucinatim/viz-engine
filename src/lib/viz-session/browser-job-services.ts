import { createVizBrowserAudioBakeSourceResolver } from '@/lib/utils/browser-audio-bake';
import { createVizBrowserRenderExecutor } from '@/lib/utils/browser-render-executor';
import { openVizBrowserRenderSession } from '@/lib/utils/browser-render-session';
import { openVizStreamingVideoEncoder } from '@/lib/utils/video-encoder';
import {
  studioComponentRegistry,
  studioNodeRegistry,
  studioThreeProgramRegistry,
} from '@/lib/viz-capabilities';
import { createVizAudioFeatureBakeJobService } from '@viz-engine/bake';
import type { VizSessionHost } from '@viz-engine/editor-control';
import { createVizRenderJobService } from '@viz-engine/render';
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
        openVideoEncoder: ({ request, source, signal, audio }) => {
          if (request.kind !== 'video' && request.kind !== 'clip')
            throw new Error('Expected a video request.');
          return openVizStreamingVideoEncoder({
            request,
            sourceFps: source.project.timeline.fps,
            signal,
            audio,
          });
        },
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
