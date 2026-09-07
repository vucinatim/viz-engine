import { beforeEach, describe, expect, it, vi } from 'vitest';

import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import { createVizSessionRuntimePreviewFrame } from '@/lib/viz-session';
import type { VizRenderPlan } from '@viz-engine/contracts';

const audioFrameData = {
  frequencyData: new Uint8Array(),
  timeDomainData: new Uint8Array(),
  sampleRate: 44100,
  fftSize: 2048,
};

const createRenderPlan = (...layerIds: string[]): VizRenderPlan => ({
  frameContext: {
    frame: 90,
    fps: 60,
    durationInFrames: 120,
    timeInSeconds: 1.5,
    deltaTimeSeconds: 1 / 60,
    isFirstFrame: false,
    isLastFrame: false,
    mode: 'live',
    seed: 'test',
  },
  viewport: {
    width: 640,
    height: 360,
    backgroundColor: '#000000',
  },
  materializedAssets: [],
  layers: layerIds.map((layerId) => ({
    layerId,
    componentId: 'test-component',
    rendererFamily: 'three',
    enabled: true,
    opacity: 1,
    blendMode: 'normal',
    resolvedInputs: {},
  })),
  issues: [],
});

describe('Editor runtime preview attachment store', () => {
  beforeEach(() => {
    useEditorRuntimePreviewAttachmentStore.getState().reset();
  });

  it('owns browser callbacks and mirrors without scene or inspection state', () => {
    const attachmentStore = useEditorRuntimePreviewAttachmentStore.getState();
    const renderLayerA = vi.fn();
    const mirrorCanvas = {} as HTMLCanvasElement;
    const compositeMirrorCanvas = {} as HTMLCanvasElement;

    attachmentStore.registerPreviewAttachment(
      {
        getViewport: () => ({ width: 640, height: 360 }),
        render: renderLayerA,
      },
      ['layer-a'],
    );
    attachmentStore.registerMirrorCanvas('layer-a', mirrorCanvas);
    attachmentStore.registerCompositeMirrorCanvas(compositeMirrorCanvas);

    const frame = createVizSessionRuntimePreviewFrame({
      currentFrame: 90,
      time: 1.5,
      dt: 0.25,
      fps: 60,
      mode: 'live',
    });

    const renderPlan = createRenderPlan('layer-a');
    expect(
      attachmentStore.renderRuntimePlan(
        frame,
        audioFrameData,
        renderPlan,
        false,
      ),
    ).toEqual(['layer-a']);
    expect(renderLayerA).toHaveBeenCalledWith({
      frame,
      audioFrameData,
      renderPlan,
      hasLiveOverrides: false,
    });
    expect(attachmentStore.getPreviewViewport()).toEqual({
      width: 640,
      height: 360,
    });
    expect(
      useEditorRuntimePreviewAttachmentStore.getState().mirrorCanvasesByLayerId[
        'layer-a'
      ],
    ).toEqual([mirrorCanvas]);
    expect(
      useEditorRuntimePreviewAttachmentStore.getState().compositeMirrorCanvases,
    ).toEqual([compositeMirrorCanvas]);

    const state = useEditorRuntimePreviewAttachmentStore.getState();
    expect(state).not.toHaveProperty('layers');
    expect(state).not.toHaveProperty('lastRequestedFrame');
    expect(state).not.toHaveProperty('lastCompletedFrame');
    expect(state).not.toHaveProperty('renderCycle');
    expect(state).not.toHaveProperty('runtimeBackedLayerIds');
  });

  it('prunes only layer-scoped browser entries', () => {
    const store = useEditorRuntimePreviewAttachmentStore.getState();
    const attachment = {
      getViewport: () => ({ width: 1, height: 1 }),
      render: vi.fn(),
    };

    store.registerPreviewAttachment(attachment, ['layer-a', 'layer-b']);
    store.registerMirrorCanvas('layer-a', {} as HTMLCanvasElement);
    store.pruneLayerEntries(['layer-b']);

    const state = useEditorRuntimePreviewAttachmentStore.getState();
    expect(state.previewAttachment).toBe(attachment);
    expect([...state.previewLayerIds]).toEqual(['layer-b']);
    expect(state.mirrorCanvasesByLayerId['layer-a']).toBeUndefined();
  });

  it('renders one full scene plan and routes measured layer diagnostics separately', () => {
    const store = useEditorRuntimePreviewAttachmentStore.getState();
    const render = vi.fn(() => ({
      layerStats: {
        'layer-b': { milliseconds: 1.25, drawCalls: 3 },
      },
    }));
    const renderDebug = vi.fn();
    store.registerPreviewAttachment(
      {
        getViewport: () => ({ width: 640, height: 360 }),
        render,
      },
      ['layer-a', 'layer-b'],
    );
    store.registerDebugAttachment('layer-b', { render: renderDebug });
    const frame = createVizSessionRuntimePreviewFrame({
      currentFrame: 90,
      time: 1.5,
      dt: 0.25,
      fps: 60,
      mode: 'live',
    });
    const renderPlan = createRenderPlan('layer-a', 'layer-b');

    expect(
      store.renderRuntimePlan(frame, audioFrameData, renderPlan, false),
    ).toEqual(['layer-a', 'layer-b']);
    expect(render).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledWith({
      frame,
      audioFrameData,
      renderPlan,
      hasLiveOverrides: false,
    });
    expect(renderDebug).toHaveBeenCalledWith({
      frame,
      audioFrameData,
      layerPlan: renderPlan.layers[1],
      stats: { milliseconds: 1.25, drawCalls: 3 },
    });
  });

  it('invokes registered component actions through the attachment boundary', () => {
    const store = useEditorRuntimePreviewAttachmentStore.getState();
    const enterFlyMode = vi.fn();

    store.registerPreviewAttachment(
      {
        getViewport: () => ({ width: 1, height: 1 }),
        render: vi.fn(),
        invokeLayerAction: (layerId, actionId) => {
          if (layerId !== 'stage' || actionId !== 'stage.enter-fly-mode') {
            return false;
          }
          enterFlyMode();
          return true;
        },
      },
      ['stage'],
    );

    expect(store.invokeLayerAction('stage', 'stage.enter-fly-mode')).toBe(true);
    expect(enterFlyMode).toHaveBeenCalledOnce();
    expect(store.invokeLayerAction('stage', 'unknown-action')).toBe(false);
    expect(store.invokeLayerAction('unknown-layer', 'unknown-action')).toBe(
      false,
    );
  });
});
