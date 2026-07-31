import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompDefinitionMap } from '@/components/comps';
import useCompStore from '@/lib/stores/comp-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import {
  createVizSessionRuntimePreviewFrame,
  runtimeInspection,
  vizSessionActions,
  vizSessionStore,
} from '@/lib/viz-session';
import { createTestProject } from './viz-session-test-utils';

const createAttachment = (render = vi.fn()) => ({
  getViewport: () => ({ width: 640, height: 360 }),
  render,
});

describe('VizSession runtime preview inspection', () => {
  beforeEach(() => {
    useCompStore.setState({
      comps: Array.from(CompDefinitionMap.values()),
    });
    useEditorRuntimePreviewAttachmentStore.getState().reset();
    vizSessionActions.project.importWorkingProject(createTestProject());
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
      .registerPreviewAttachment(createAttachment(), ['runtime-layer']);

    const frame = createVizSessionRuntimePreviewFrame({
      currentFrame: 30,
      time: 0.5,
      dt: 1 / 60,
      fps: 60,
      mode: 'live',
    });
    const previewStateBeforeFrame = vizSessionStore.getState().preview;
    vizSessionActions.preview.renderRuntimePreviewFrame(frame);

    expect(vizSessionStore.getState().preview).toBe(previewStateBeforeFrame);
    expect(runtimeInspection.getCurrent()).toMatchObject({
      status: 'idle',
      lastRequestedFrame: frame,
      lastCompletedFrame: frame,
      renderCycle: 1,
      lastRenderedLayerIds: ['runtime-layer'],
      runtimeBackedLayerIds: ['runtime-layer'],
      lastGraphResults: [],
      lastPlanIssues: [],
      lastError: null,
    });
    expect(runtimeInspection.getCurrent().lastLayerSnapshots).toHaveLength(1);
    expect(vizSessionActions.preview.inspectRuntimePreview()).toMatchObject({
      layerCount: 1,
      lastRenderedLayerIds: ['runtime-layer'],
      runtimeBackedLayerIds: ['runtime-layer'],
    });
  });

  it('records a failed frame without claiming it completed', () => {
    const comp = CompDefinitionMap.values().next().value;
    if (!comp) {
      throw new Error('Expected at least one component definition');
    }
    vizSessionActions.project.importWorkingProject(
      createTestProject(comp, 'broken-layer'),
    );
    useEditorRuntimePreviewAttachmentStore.getState().registerPreviewAttachment(
      createAttachment(() => {
        throw new Error('render failed');
      }),
      ['broken-layer'],
    );
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

    expect(runtimeInspection.getCurrent()).toMatchObject({
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

  it('publishes runtime completion for external inspection without touching session state', () => {
    const comp = CompDefinitionMap.values().next().value;
    if (!comp) {
      throw new Error('Expected at least one component definition');
    }
    vizSessionActions.project.importWorkingProject(
      createTestProject(comp, 'observed-layer'),
    );
    useEditorRuntimePreviewAttachmentStore
      .getState()
      .registerPreviewAttachment(createAttachment(), ['observed-layer']);
    const listener = vi.fn();
    const unsubscribe =
      vizSessionActions.preview.subscribeRuntimePreview(listener);
    const previewState = vizSessionStore.getState().preview;

    vizSessionActions.preview.renderRuntimePreviewFrame(
      createVizSessionRuntimePreviewFrame({
        currentFrame: 6,
        time: 0.1,
        dt: 1 / 60,
        fps: 60,
        mode: 'live',
      }),
    );

    expect(listener).toHaveBeenCalledOnce();
    expect(vizSessionStore.getState().preview).toBe(previewState);

    unsubscribe();
    vizSessionActions.preview.reset();
    expect(listener).toHaveBeenCalledOnce();
  });

  it('resets session inspection without deleting mounted browser attachments', () => {
    const comp = CompDefinitionMap.values().next().value;
    if (!comp) {
      throw new Error('Expected at least one component definition');
    }
    vizSessionActions.project.importWorkingProject(
      createTestProject(comp, 'mounted-layer'),
    );
    useEditorRuntimePreviewAttachmentStore
      .getState()
      .registerPreviewAttachment(createAttachment(), ['mounted-layer']);
    const frame = createVizSessionRuntimePreviewFrame({
      currentFrame: 1,
      time: 1 / 60,
      dt: 1 / 60,
      fps: 60,
      mode: 'live',
    });

    vizSessionActions.preview.renderRuntimePreviewFrame(frame);
    vizSessionActions.preview.reset();

    expect(runtimeInspection.getCurrent()).toEqual({
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
      lastTimings: null,
      lastError: null,
    });
    expect(
      useEditorRuntimePreviewAttachmentStore.getState().previewLayerIds,
    ).toEqual(new Set(['mounted-layer']));
  });
});
