import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompDefinitionMap } from '@/components/comps';
import { listComponentParameterIds } from '@/components/config/config';
import { useNodeNetworkStore } from '@/components/node-network/node-network-store';
import editorControl from '@/lib/editor-control';
import { getProjectedLayers } from '@/lib/projected-layers';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useCompStore from '@/lib/stores/comp-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import useProfilerStore from '@/lib/stores/profiler-store';
import {
  createVizSessionRuntimePreviewFrame,
  getVizSessionState,
  selectProjectedNodeNetworks,
  vizControl,
  vizSessionActions,
  vizSessionHost,
  vizSessionStore,
} from '@/lib/viz-session';
import type { VizProjectDocument } from '@viz-engine/contracts';
import { createTestProject } from './viz-session-test-utils';

if (!(globalThis as any).window) {
  (globalThis as any).window = globalThis;
}

const buildProject = (): {
  project: VizProjectDocument;
  layerId: string;
  parameterId: string;
} => {
  const comp = CompDefinitionMap.get('Simple Cube');
  if (!comp) {
    throw new Error('Simple Cube component definition not found');
  }

  const layerId = 'editor-control-test';
  const [parameterId] = listComponentParameterIds(
    layerId,
    comp.authoring.settings,
  );

  if (!parameterId) {
    throw new Error('Could not resolve parameter id for test component');
  }

  return {
    layerId,
    parameterId,
    project: createTestProject(comp, layerId),
  };
};

describe('Local editor control facade', () => {
  beforeEach(() => {
    useCompStore.setState({
      comps: Array.from(CompDefinitionMap.values()),
    });
    vizSessionActions.graph.reset();
    vizSessionActions.preview.reset();
    vizSessionActions.project.importWorkingProject(createTestProject());
    useEditorRuntimePreviewAttachmentStore.getState().reset();
    useNodeNetworkStore.setState({
      openNetwork: null,
      areNetworksMinimized: false,
      shouldForceShowOverlay: false,
    });
    useAudioEngineStore.setState({
      audioElementRef: { current: null },
    });
    vizSessionActions.audio.reset();
    useProfilerStore.getState().reset();
  });

  it('routes project mutations through canonical project truth', () => {
    const comp = CompDefinitionMap.values().next().value;
    if (!comp) {
      throw new Error('Expected at least one component definition');
    }

    editorControl.project.addLayer(comp);

    const workingProject = getVizSessionState().project.workingProject;
    expect(workingProject.layers).toHaveLength(1);
    expect(getProjectedLayers()).toHaveLength(1);

    const layerId = workingProject.layers[0]?.id;
    if (!layerId) {
      throw new Error('Expected created layer id');
    }

    editorControl.project.updateLayerValue(layerId, ['testValue'], 123);

    expect(
      getVizSessionState().project.workingProject.layers[0]?.settings
        ?.testValue,
    ).toBe(123);
    expect(
      vizSessionStore.getState().project.workingProject.layers[0]?.settings
        ?.testValue,
    ).toBe(123);

    editorControl.history.undo();
    expect(
      getVizSessionState().project.workingProject.layers[0]?.settings
        ?.testValue,
    ).toBeUndefined();
    editorControl.history.undo();
    expect(getVizSessionState().project.workingProject.layers).toHaveLength(0);
  });

  it('routes node-editor selection and animation enablement through one facade', () => {
    const { project, parameterId } = buildProject();

    vizSessionActions.project.importWorkingProject(project);

    editorControl.nodeEditor.setAnimationEnabled(parameterId, true, 'number');

    expect(useNodeNetworkStore.getState().openNetwork).toBe(parameterId);
    expect(useNodeNetworkStore.getState().shouldForceShowOverlay).toBe(true);
    expect(
      selectProjectedNodeNetworks(getVizSessionState())[parameterId]?.isEnabled,
    ).toBe(true);

    editorControl.nodeEditor.closeNetwork();
    expect(useNodeNetworkStore.getState().openNetwork).toBeNull();
  });

  it('keeps preview seek and media-element seek aligned', () => {
    const audioElement = { currentTime: 0 } as HTMLAudioElement;
    useAudioEngineStore.setState({
      audioElementRef: { current: audioElement },
    });
    vizSessionActions.preview.setDurationFrames(300);

    editorControl.preview.seekToSeconds(2.5);

    expect(getVizSessionState().preview.transport.currentFrame).toBe(150);
    expect(audioElement.currentTime).toBe(2.5);
  });

  it('exposes runtime preview inspection through the local control facade', () => {
    const comp = CompDefinitionMap.values().next().value;
    if (!comp) {
      throw new Error('Expected at least one component definition');
    }
    vizSessionActions.project.importWorkingProject(
      createTestProject(comp, 'runtime-layer'),
    );
    const attachmentStore = useEditorRuntimePreviewAttachmentStore.getState();
    attachmentStore.registerLayerAttachment('runtime-layer', {
      getViewport: () => ({ width: 640, height: 360 }),
      render: vi.fn(),
    });
    const frame = createVizSessionRuntimePreviewFrame({
      currentFrame: 48,
      time: 0.8,
      dt: 1 / 60,
      fps: 60,
      mode: 'live',
    });

    vizSessionActions.preview.renderRuntimePreviewFrame(frame);

    expect(editorControl.preview.inspectRuntimePreview()).toMatchObject({
      layerCount: 1,
      status: 'idle',
      lastRenderedLayerIds: ['runtime-layer'],
      runtimeBackedLayerIds: ['runtime-layer'],
      renderCycle: 1,
      lastRequestedFrame: frame,
      lastCompletedFrame: frame,
      lastError: null,
    });

    vizSessionActions.preview.renderRuntimePreviewFrame(
      createVizSessionRuntimePreviewFrame({
        currentFrame: 60,
        time: 1,
        dt: 1 / 60,
        fps: 60,
        mode: 'live',
      }),
    );

    expect(editorControl.preview.inspectRuntimePreview().renderCycle).toBe(2);
  });

  it('routes UI toggles and audio track-list setup through the facade', () => {
    expect(useProfilerStore.getState().enabled).toBe(false);
    expect(useProfilerStore.getState().visible).toBe(false);

    editorControl.ui.toggleProfiler();

    expect(useProfilerStore.getState().enabled).toBe(true);
    expect(useProfilerStore.getState().visible).toBe(true);

    editorControl.ui.toggleProfiler();

    expect(useProfilerStore.getState().enabled).toBe(true);
    expect(useProfilerStore.getState().visible).toBe(false);

    editorControl.audio.setTrackList(['a.mp3', 'b.mp3']);
    expect(getVizSessionState().audio.trackList).toEqual(['a.mp3', 'b.mp3']);
  });

  it('reflects agent transactions through the exact session used by the editor', () => {
    const { project, layerId } = buildProject();
    vizSessionActions.project.importWorkingProject(project);
    const baseRevision = vizSessionHost.getSnapshot().session.revision;

    const agentMutation = vizControl.applyTransaction({
      id: 'studio-agent-edit',
      expectedRevision: baseRevision,
      actions: [
        {
          type: 'layer.settings.set',
          payload: {
            layerId,
            path: 'size',
            value: 2.25,
          },
        },
      ],
    });

    expect(agentMutation.transactionResult.status).toBe('applied');
    expect(
      getVizSessionState().project.workingProject.layers[0]?.settings?.size,
    ).toBe(2.25);
    expect(
      vizSessionStore.getState().project.workingProject.layers[0]?.settings
        ?.size,
    ).toBe(2.25);
    expect(
      vizSessionHost.getSnapshot().session.actionHistory.at(-1),
    ).toMatchObject({
      transactionId: 'studio-agent-edit',
      actor: {
        kind: 'agent',
        id: 'viz-studio-live-control',
      },
    });

    editorControl.project.updateLayerValue(layerId, ['size'], 3);
    expect(vizSessionHost.getSnapshot().session.revision).toBe(
      baseRevision + 2,
    );

    editorControl.history.undo();
    expect(
      getVizSessionState().project.workingProject.layers[0]?.settings?.size,
    ).toBe(2.25);
    editorControl.history.undo();
    expect(
      getVizSessionState().project.workingProject.layers[0]?.settings?.size,
    ).not.toBe(2.25);
    expect(vizControl.getHost()).toBe(vizSessionHost);
  });
});
