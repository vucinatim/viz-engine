import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import type { VizProjectAction } from '@viz-engine/contracts';
import type { VizSessionHost } from '@viz-engine/editor-control';

import {
  createVizSessionRuntimePreviewPlan,
  resetVizSessionRuntimePreviewPlanCache,
} from './runtime-preview-plan';
import type {
  VizSessionPreviewState,
  VizSessionProjectState,
  VizSessionRuntimeInspectionState,
  VizSessionRuntimePreviewAudioFrameData,
  VizSessionRuntimePreviewFrame,
} from './types';

const DEFAULT_FPS = 60;
const DEFAULT_DURATION_FRAMES = 1;

export const createInitialRuntimeInspectionState =
  (): VizSessionRuntimeInspectionState => ({
    status: 'idle',
    lastRequestedFrame: null,
    lastCompletedFrame: null,
    renderCycle: 0,
    lastRenderedLayerIds: [],
    runtimeBackedLayerIds: [],
    lastGraphResults: [],
    lastLayerSnapshots: [],
    lastMaterializedAssets: [],
    lastPlanIssues: [],
    lastError: null,
  });

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
    host.setTransportDurationFrames(DEFAULT_DURATION_FRAMES);
    replaceState({
      ...getState(),
      transport: host.getSnapshot().transport,
      runtimeInspection: createInitialRuntimeInspectionState(),
    });
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
      });
      const lastRenderedLayerIds = attachmentStore.renderRuntimePlan(
        frame,
        audioFrameData,
        renderPlan,
      );
      const nextPreview = getState();

      replaceState({
        ...nextPreview,
        runtimeInspection: {
          ...nextPreview.runtimeInspection,
          status: 'idle',
          lastRequestedFrame: frame,
          lastCompletedFrame: frame,
          renderCycle: nextPreview.runtimeInspection.renderCycle + 1,
          lastRenderedLayerIds,
          runtimeBackedLayerIds: [...lastRenderedLayerIds],
          lastGraphResults: structuredClone(renderPlan.graphResults),
          lastLayerSnapshots: structuredClone(renderPlan.layers),
          lastMaterializedAssets: structuredClone(
            renderPlan.materializedAssets,
          ),
          lastPlanIssues: structuredClone(renderPlan.issues),
          lastError: null,
        },
      });
    } catch (error) {
      const nextPreview = getState();
      replaceState({
        ...nextPreview,
        runtimeInspection: {
          ...nextPreview.runtimeInspection,
          status: 'failed',
          lastRequestedFrame: frame,
          lastError: {
            message:
              error instanceof Error
                ? error.message
                : 'Unknown runtime preview error',
            frame,
          },
        },
      });
      throw error;
    }
  },
  inspectRuntimePreview() {
    const projectState = getProjectState();
    const preview = getState().runtimeInspection;
    return {
      projectRevision: projectState.revision,
      layerCount: projectState.workingProject.layers.length,
      ...preview,
      lastRenderedLayerIds: [...preview.lastRenderedLayerIds],
      runtimeBackedLayerIds: [...preview.runtimeBackedLayerIds],
      lastGraphResults: structuredClone(preview.lastGraphResults),
      lastLayerSnapshots: structuredClone(preview.lastLayerSnapshots),
      lastMaterializedAssets: structuredClone(preview.lastMaterializedAssets),
      lastPlanIssues: structuredClone(preview.lastPlanIssues),
    };
  },
  setState(partial: Partial<VizSessionPreviewState>) {
    replaceState({
      ...getState(),
      ...partial,
    });
  },
});
