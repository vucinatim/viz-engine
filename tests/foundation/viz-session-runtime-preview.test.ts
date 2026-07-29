import { beforeEach, describe, expect, it } from 'vitest';

import { CompDefinitionMap } from '@/components/comps';
import useCompStore from '@/lib/stores/comp-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import {
  createVizSessionRuntimePreviewFrame,
  vizSessionActions,
  vizSessionStore,
} from '@/lib/viz-session';
import { createTestProject } from './viz-session-test-utils';

describe('VizSession runtime preview inspection', () => {
  beforeEach(() => {
    useCompStore.setState({
      comps: Array.from(CompDefinitionMap.values()),
    });
    useEditorRuntimePreviewAttachmentStore.getState().reset();
    vizSessionActions.project.setState({
      initialized: false,
      revision: 0,
      sourceProject: null,
      workingProject: createTestProject(),
    });
    vizSessionActions.preview.reset();
  });

  it('records completed attachment work as authoritative session inspection state', () => {
    const comp = CompDefinitionMap.values().next().value;
    if (!comp) {
      throw new Error('Expected at least one component definition');
    }

    vizSessionActions.project.importWorkingProject(
      createTestProject(comp, 'runtime-layer'),
    );
    useEditorRuntimePreviewAttachmentStore
      .getState()
      .registerLayerRenderFunction('runtime-layer', () => ({
        runtimeBacked: true,
      }));

    const frame = createVizSessionRuntimePreviewFrame({
      currentFrame: 30,
      time: 0.5,
      dt: 1 / 60,
      fps: 60,
      mode: 'live',
    });
    vizSessionActions.preview.renderRuntimePreviewFrame(frame);

    expect(vizSessionStore.getState().preview.runtimeInspection).toEqual({
      status: 'idle',
      lastRequestedFrame: frame,
      lastCompletedFrame: frame,
      renderCycle: 1,
      lastRenderedLayerIds: ['runtime-layer'],
      runtimeBackedLayerIds: ['runtime-layer'],
      lastError: null,
    });
    expect(vizSessionActions.preview.inspectRuntimePreview()).toMatchObject({
      layerCount: 1,
      lastRenderedLayerIds: ['runtime-layer'],
      runtimeBackedLayerIds: ['runtime-layer'],
    });
  });

  it('records a failed frame without claiming it completed', () => {
    useEditorRuntimePreviewAttachmentStore
      .getState()
      .registerLayerRenderFunction('broken-layer', () => {
        throw new Error('render failed');
      });
    const frame = createVizSessionRuntimePreviewFrame({
      currentFrame: 12,
      time: 0.2,
      dt: 1 / 60,
      fps: 60,
      mode: 'live',
    });

    expect(() =>
      vizSessionActions.preview.renderRuntimePreviewFrame(frame),
    ).toThrow('render failed');

    expect(vizSessionStore.getState().preview.runtimeInspection).toMatchObject({
      status: 'failed',
      lastRequestedFrame: frame,
      lastCompletedFrame: null,
      renderCycle: 0,
      lastError: {
        message: 'render failed',
        frame,
      },
    });
  });

  it('resets session inspection without deleting mounted browser attachments', () => {
    useEditorRuntimePreviewAttachmentStore
      .getState()
      .registerLayerRenderFunction('mounted-layer', () => ({
        runtimeBacked: false,
      }));
    const frame = createVizSessionRuntimePreviewFrame({
      currentFrame: 1,
      time: 1 / 60,
      dt: 1 / 60,
      fps: 60,
      mode: 'live',
    });

    vizSessionActions.preview.renderRuntimePreviewFrame(frame);
    vizSessionActions.preview.reset();

    expect(vizSessionStore.getState().preview.runtimeInspection).toEqual({
      status: 'idle',
      lastRequestedFrame: null,
      lastCompletedFrame: null,
      renderCycle: 0,
      lastRenderedLayerIds: [],
      runtimeBackedLayerIds: [],
      lastError: null,
    });
    expect(
      useEditorRuntimePreviewAttachmentStore.getState().layerRenderFunctions
        .size,
    ).toBe(1);
  });
});
