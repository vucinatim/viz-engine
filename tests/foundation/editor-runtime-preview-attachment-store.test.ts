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

  it('owns browser callbacks, mirrors, and the player ref without scene or inspection state', () => {
    const attachmentStore = useEditorRuntimePreviewAttachmentStore.getState();
    const renderLayerA = vi.fn();
    const mirrorCanvas = {} as HTMLCanvasElement;
    const playerRef = { current: { seekTo: vi.fn() } } as any;

    attachmentStore.registerLayerAttachment('layer-a', {
      getViewport: () => ({ width: 640, height: 360 }),
      render: renderLayerA,
    });
    attachmentStore.registerMirrorCanvas('layer-a', mirrorCanvas);
    attachmentStore.setPlayerRef(playerRef);

    const frame = createVizSessionRuntimePreviewFrame({
      currentFrame: 90,
      time: 1.5,
      dt: 0.25,
      fps: 60,
      mode: 'live',
    });

    const renderPlan = createRenderPlan('layer-a');
    expect(
      attachmentStore.renderRuntimePlan(frame, audioFrameData, renderPlan),
    ).toEqual(['layer-a']);
    expect(renderLayerA).toHaveBeenCalledWith({
      frame,
      audioFrameData,
      renderPlan,
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
    expect(useEditorRuntimePreviewAttachmentStore.getState().playerRef).toBe(
      playerRef,
    );

    const state = useEditorRuntimePreviewAttachmentStore.getState();
    expect(state).not.toHaveProperty('layers');
    expect(state).not.toHaveProperty('lastRequestedFrame');
    expect(state).not.toHaveProperty('lastCompletedFrame');
    expect(state).not.toHaveProperty('renderCycle');
    expect(state).not.toHaveProperty('runtimeBackedLayerIds');
  });

  it('prunes only layer-scoped browser attachments', () => {
    const store = useEditorRuntimePreviewAttachmentStore.getState();
    const playerRef = { current: { seekTo: vi.fn() } } as any;

    store.registerLayerAttachment('layer-a', {
      getViewport: () => ({ width: 1, height: 1 }),
      render: vi.fn(),
    });
    store.registerLayerAttachment('layer-b', {
      getViewport: () => ({ width: 1, height: 1 }),
      render: vi.fn(),
    });
    store.registerMirrorCanvas('layer-a', {} as HTMLCanvasElement);
    store.setPlayerRef(playerRef);
    store.pruneLayerAttachments(['layer-b']);

    const state = useEditorRuntimePreviewAttachmentStore.getState();
    expect([...state.layerAttachments.keys()]).toEqual(['layer-b']);
    expect(state.mirrorCanvasesByLayerId['layer-a']).toBeUndefined();
    expect(state.playerRef).toBe(playerRef);
  });

  it('invokes registered component actions through the attachment boundary', () => {
    const store = useEditorRuntimePreviewAttachmentStore.getState();
    const enterFlyMode = vi.fn();

    store.registerLayerAttachment('stage', {
      getViewport: () => ({ width: 1, height: 1 }),
      render: vi.fn(),
      actions: { 'stage.enter-fly-mode': enterFlyMode },
    });

    expect(store.invokeLayerAction('stage', 'stage.enter-fly-mode')).toBe(true);
    expect(enterFlyMode).toHaveBeenCalledOnce();
    expect(store.invokeLayerAction('stage', 'unknown-action')).toBe(false);
    expect(store.invokeLayerAction('unknown-layer', 'unknown-action')).toBe(
      false,
    );
  });

  it('waits for every registered runtime resource boundary', async () => {
    const store = useEditorRuntimePreviewAttachmentStore.getState();
    const readyOrder: string[] = [];

    store.registerLayerAttachment('layer-a', {
      getViewport: () => ({ width: 1, height: 1 }),
      render: vi.fn(),
      whenReady: async () => {
        await Promise.resolve();
        readyOrder.push('a');
      },
    });
    store.registerLayerAttachment('layer-b', {
      getViewport: () => ({ width: 1, height: 1 }),
      render: vi.fn(),
      whenReady: async () => {
        readyOrder.push('b');
      },
    });

    await store.whenRuntimeResourcesReady();

    expect(readyOrder.sort()).toEqual(['a', 'b']);
  });
});
