import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import type { VizProjectAction } from '@viz-engine/contracts';
import type { VizSessionHost } from '@viz-engine/editor-control';

import { runtimeInspection } from './runtime-inspection';
import {
  createVizSessionRuntimePreviewPlan,
  resetVizSessionRuntimePreviewPlanCache,
} from './runtime-preview-plan';
import type {
  VizSessionPreviewState,
  VizSessionProjectState,
  VizSessionRuntimePreviewAudioFrameData,
  VizSessionRuntimePreviewFrame,
} from './types';

const DEFAULT_FPS = 60;

interface RuntimePreviewResources {
  resourceRevision: number;
  resolvedAssets: ReturnType<
    VizSessionHost['getProjectResources']
  >['resolvedAssets'];
  resolvedArtifacts: ReturnType<
    VizSessionHost['getProjectResources']
  >['resolvedArtifacts'];
}

interface CreateStudioPreviewActionsOptions {
  host: VizSessionHost;
  getProjectState(): VizSessionProjectState;
  getState(): VizSessionPreviewState;
  replaceState(state: VizSessionPreviewState): void;
  getResources(): RuntimePreviewResources;
  applyProjectActions(
    actions: VizProjectAction[],
    options?: { syncLayerProjections?: boolean },
  ): void;
}

export const createStudioPreviewActions = ({
  host,
  getProjectState,
  getState,
  replaceState,
  getResources,
  applyProjectActions,
}: CreateStudioPreviewActionsOptions) => ({
  play() {
    host.play();
  },
  pause() {
    host.pause();
  },
  togglePlayback() {
    host.togglePlayback();
  },
  seekToFrame(frame: number) {
    host.seekToFrame(frame);
  },
  seekToSeconds(seconds: number) {
    const fps =
      getState().transport.fps > 0 ? getState().transport.fps : DEFAULT_FPS;
    host.seekToFrame(Math.floor(seconds * fps));
  },
  syncCurrentFrame(frame: number) {
    if (frame !== getState().transport.currentFrame) {
      host.seekToFrame(frame);
    }
  },
  setDurationFrames(durationFrames: number) {
    host.setTransportDurationFrames(durationFrames);
    const project = getProjectState().workingProject;
    if (
      Number.isInteger(durationFrames) &&
      durationFrames > 0 &&
      project.timeline.durationInFrames !== durationFrames
    ) {
      applyProjectActions(
        [
          {
            type: 'timeline.set',
            payload: {
              timeline: {
                ...project.timeline,
                durationInFrames: durationFrames,
              },
            },
          },
        ],
        { syncLayerProjections: false },
      );
    }
  },
  reset() {
    host.pause();
    host.seekToFrame(0);
    replaceState({
      ...getState(),
      transport: host.getSnapshot().transport,
    });
    runtimeInspection.reset();
    resetVizSessionRuntimePreviewPlanCache();
  },
  renderRuntimePreviewFrame(
    frame: VizSessionRuntimePreviewFrame,
    providedAudioFrameData?: VizSessionRuntimePreviewAudioFrameData,
  ) {
    try {
      const attachmentStore = useEditorRuntimePreviewAttachmentStore.getState();
      const projectState = getProjectState();
      const analyzer = useAudioEngineStore.getState().audioAnalyzer;
      const audioFrameData =
        providedAudioFrameData ??
        (() => {
          const frequencyData = new Uint8Array(
            analyzer?.frequencyBinCount ?? 0,
          );
          const timeDomainData = new Uint8Array(
            analyzer?.frequencyBinCount ?? 0,
          );
          analyzer?.getByteFrequencyData(frequencyData);
          analyzer?.getByteTimeDomainData(timeDomainData);
          return {
            frequencyData,
            timeDomainData,
            sampleRate: analyzer?.context.sampleRate ?? 44_100,
            fftSize: analyzer?.fftSize ?? 2_048,
          };
        })();
      const viewport = attachmentStore.getPreviewViewport() ?? {
        width: projectState.workingProject.viewport.width,
        height: projectState.workingProject.viewport.height,
      };
      const resources = getResources();
      const renderPlan = createVizSessionRuntimePreviewPlan({
        project: projectState.workingProject,
        projectRevision: projectState.revision,
        frame,
        viewport,
        audioFrameData,
        isPlaying: getState().transport.isPlaying,
        resourceRevision: resources.resourceRevision,
        resolvedAssets: resources.resolvedAssets,
        resolvedArtifacts: resources.resolvedArtifacts,
        layerValues: host.getLiveLayerValues(),
        graphValues: host.getLiveGraphValues(),
      });
      const lastRenderedLayerIds = attachmentStore.renderRuntimePlan(
        frame,
        audioFrameData,
        renderPlan,
      );
      runtimeInspection.publishFrame(frame, renderPlan, lastRenderedLayerIds);
    } catch (error) {
      runtimeInspection.publishError(frame, {
        message:
          error instanceof Error
            ? error.message
            : 'Unknown runtime preview error',
        frame,
      });
      throw error;
    }
  },
  inspectRuntimePreview() {
    const projectState = getProjectState();
    return {
      projectRevision: projectState.revision,
      layerCount: projectState.workingProject.layers.length,
      ...runtimeInspection.inspect(),
    };
  },
  setState(partial: Partial<VizSessionPreviewState>) {
    replaceState({
      ...getState(),
      ...partial,
    });
  },
});
