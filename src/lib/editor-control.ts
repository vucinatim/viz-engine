import type { Comp } from '@/components/config/create-component';
import type { NodeHandleType } from '@/components/config/node-types';
import type { LayerSettings } from '@/components/editor/layer-settings';
import useNodeNetworkStore from '@/components/node-network/node-network-store';
import {
  loadProject,
  loadProjectFromUrl,
  resetProject,
  saveProject,
} from '@/lib/project-persistence';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorStore from '@/lib/stores/editor-store';
import useProfilerStore from '@/lib/stores/profiler-store';
import type {
  VizSessionAudioState,
  VizSessionPreviewState,
} from '@/lib/viz-session';
import {
  getVizSessionState,
  resolveNetworkIdForParameter,
  vizSessionActions,
} from '@/lib/viz-session';
import type { VizProjectDocument } from '@viz-engine/contracts';
import type { VizEditorAudioAnalyzerState } from '@viz-engine/editor-session';
import { toast } from 'sonner';

type LayerPreset = {
  name: string;
  values: Record<string, any>;
  networks?: Record<string, string>;
};

export const editorControl = {
  inspect: {
    project() {
      return vizSessionActions.inspection.project();
    },
    graph(graphId: string) {
      return vizSessionActions.inspection.graph(graphId);
    },
    runtime() {
      return vizSessionActions.inspection.runtime();
    },
    assets() {
      return vizSessionActions.inspection.assets();
    },
  },
  project: {
    initialize() {
      vizSessionActions.project.initializeProjectState();
    },
    refreshCompDefinitions() {
      vizSessionActions.project.refreshCompDefinitions();
    },
    addLayer(comp: Comp) {
      vizSessionActions.project.addLayer(comp);
    },
    removeLayer(layerId: string) {
      vizSessionActions.project.removeLayer(layerId);
    },
    duplicateLayer(layerId: string) {
      vizSessionActions.project.duplicateLayer(layerId);
    },
    reorderLayers(activeId: string, overId: string) {
      vizSessionActions.project.reorderLayers(activeId, overId);
    },
    setLayerExpanded(layerId: string, isExpanded: boolean) {
      vizSessionActions.project.setLayerExpanded(layerId, isExpanded);
    },
    setAllLayersExpanded(isExpanded: boolean) {
      vizSessionActions.project.setAllLayersExpanded(isExpanded);
    },
    setLayerDebugEnabled(layerId: string, isDebugEnabled: boolean) {
      vizSessionActions.project.setLayerDebugEnabled(layerId, isDebugEnabled);
    },
    updateLayerSettings(layerId: string, settings: LayerSettings) {
      vizSessionActions.project.updateLayerSettings(layerId, settings);
    },
    updateLayerValue(
      layerId: string,
      path: (string | number)[],
      value: unknown,
    ) {
      vizSessionActions.project.updateLayerValue(layerId, path, value);
    },
    attachLayerFileAsset(
      layerId: string,
      path: (string | number)[],
      file: File,
    ) {
      return vizSessionActions.project.attachLayerFileAsset(
        layerId,
        path,
        file,
      );
    },
    attachLayerExternalAsset(
      layerId: string,
      path: (string | number)[],
      uri: string,
    ) {
      return vizSessionActions.project.attachLayerExternalAsset(
        layerId,
        path,
        uri,
      );
    },
    applyLayerPreset(layerId: string, preset: LayerPreset) {
      vizSessionActions.project.applyLayerPreset(layerId, preset);
    },
    importWorkingProject(project: VizProjectDocument) {
      vizSessionActions.project.importWorkingProject(project);
    },
    exportWorkingProject() {
      return vizSessionActions.project.exportWorkingProject();
    },
  },
  history: {
    undo() {
      if (vizSessionActions.history.undo()) {
        toast.success('Undo', { duration: 1500 });
      }
    },
    redo() {
      if (vizSessionActions.history.redo()) {
        toast.success('Redo', { duration: 1500 });
      }
    },
    undoNodeEditor(networkId: string) {
      vizSessionActions.history.undoNodeEditor(networkId);
    },
    redoNodeEditor(networkId: string) {
      vizSessionActions.history.redoNodeEditor(networkId);
    },
    canUndo() {
      return vizSessionActions.history.canUndo();
    },
    canRedo() {
      return vizSessionActions.history.canRedo();
    },
    startNodeDrag(networkId: string) {
      vizSessionActions.history.startNodeDrag(networkId);
    },
    endNodeDrag(networkId: string) {
      vizSessionActions.history.endNodeDrag(networkId);
    },
    startGesture(gestureId: string) {
      vizSessionActions.history.startNodeDrag(gestureId);
    },
    endGesture(gestureId: string) {
      vizSessionActions.history.endNodeDrag(gestureId);
    },
    setNodeEditorFocused(focused: boolean) {
      vizSessionActions.history.setNodeEditorFocused(focused);
    },
    reset() {
      vizSessionActions.history.reset();
    },
  },
  preview: {
    play() {
      vizSessionActions.preview.play();
    },
    pause() {
      vizSessionActions.preview.pause();
    },
    togglePlayback() {
      vizSessionActions.preview.togglePlayback();
    },
    seekToFrame(frame: number) {
      vizSessionActions.preview.seekToFrame(frame);
    },
    seekToSeconds(seconds: number) {
      useAudioEngineStore.getState().seekElementToTime(seconds);
      vizSessionActions.preview.seekToSeconds(seconds);
    },
    setDurationFrames(durationFrames: number) {
      vizSessionActions.preview.setDurationFrames(durationFrames);
    },
    reset() {
      vizSessionActions.preview.reset();
    },
    inspectRuntimePreview() {
      return vizSessionActions.preview.inspectRuntimePreview();
    },
    setState(partial: Partial<VizSessionPreviewState>) {
      vizSessionActions.preview.setState(partial);
    },
  },
  nodeEditor: {
    openNetwork(parameterId: string) {
      useNodeNetworkStore
        .getState()
        .setOpenNetwork(
          resolveNetworkIdForParameter(
            getVizSessionState().project.workingProject,
            parameterId,
          ),
        );
    },
    closeNetwork() {
      useNodeNetworkStore.getState().setOpenNetwork(null);
    },
    setNetworksMinimized(isMinimized: boolean) {
      useNodeNetworkStore.getState().setNetworksMinimized(isMinimized);
    },
    setShouldForceShowOverlay(shouldShow: boolean) {
      useNodeNetworkStore.getState().setShouldForceShowOverlay(shouldShow);
    },
    focus() {
      useNodeNetworkStore.getState().setShouldForceShowOverlay(true);
    },
    setAnimationEnabled(
      parameterId: string,
      isEnabled: boolean,
      type: NodeHandleType,
    ) {
      const uiStore = useNodeNetworkStore.getState();
      const beforeGraphId = resolveNetworkIdForParameter(
        getVizSessionState().project.workingProject,
        parameterId,
      );

      vizSessionActions.graph.setNetworkEnabled(parameterId, isEnabled, type);

      const afterGraphId = resolveNetworkIdForParameter(
        getVizSessionState().project.workingProject,
        parameterId,
      );

      if (!isEnabled && uiStore.openNetwork === beforeGraphId) {
        uiStore.setOpenNetwork(null);
      } else if (isEnabled && uiStore.openNetwork === null) {
        uiStore.setOpenNetwork(afterGraphId);
      }

      if (isEnabled) {
        uiStore.setShouldForceShowOverlay(true);
      }
    },
  },
  audio: {
    setTrackList(trackList: string[]) {
      vizSessionActions.audio.setTrackList(trackList);
    },
    attachBundledTrack(filename: string, index?: number) {
      vizSessionActions.audio.attachBundledTrack(filename, index);
    },
    attachLocalFile(file: File, objectUrl: string) {
      vizSessionActions.audio.attachLocalFile(file, objectUrl);
    },
    attachCapturedStream(label: string) {
      vizSessionActions.audio.attachCapturedStream(label);
    },
    detachCapturedStream() {
      vizSessionActions.audio.detachCapturedStream();
    },
    skipToNext() {
      vizSessionActions.audio.skipToNext();
    },
    skipToPrevious() {
      vizSessionActions.audio.skipToPrevious();
    },
    restartTrack() {
      vizSessionActions.audio.restartTrack();
    },
    clearSelection() {
      vizSessionActions.audio.clearSelection();
    },
    setAnalyzerState(state: VizEditorAudioAnalyzerState) {
      vizSessionActions.audio.setAnalyzerState(state);
    },
    setLiveInputAvailable(available: boolean) {
      vizSessionActions.audio.setLiveInputAvailable(available);
    },
    reset() {
      vizSessionActions.audio.reset();
    },
    setState(partial: Partial<VizSessionAudioState>) {
      vizSessionActions.audio.setState(partial);
    },
  },
  ui: {
    setAmbientMode(ambientMode: boolean) {
      useEditorStore.getState().setAmbientMode(ambientMode);
    },
    setResolutionMultiplier(multiplier: number) {
      useEditorStore.getState().setResolutionMultiplier(multiplier);
    },
    setRhythmLabOpen(isOpen: boolean) {
      useEditorStore.getState().setIsRhythmLabOpen(isOpen);
    },
    setRhythmSelection(selection: { start: number; end: number }) {
      useEditorStore.getState().setRhythmSelection(selection);
    },
    toggleProfiler() {
      const profilerStore = useProfilerStore.getState();

      if (!profilerStore.enabled) {
        profilerStore.setEnabled(true);
        profilerStore.setVisible(true);
        return;
      }

      profilerStore.setVisible(!profilerStore.visible);
    },
  },
  persistence: {
    saveProject(projectName?: string) {
      saveProject(projectName);
    },
    loadProject(file: File) {
      loadProject(file);
    },
    loadProjectFromUrl(url: string) {
      return loadProjectFromUrl(url);
    },
    resetProject() {
      return resetProject();
    },
  },
};

export default editorControl;
