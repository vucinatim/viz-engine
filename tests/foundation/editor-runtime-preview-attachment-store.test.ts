import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createVizSessionRuntimePreviewFrame } from '@/lib/viz-session';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';

describe('Editor runtime preview attachment store', () => {
  beforeEach(() => {
    useEditorRuntimePreviewAttachmentStore.getState().reset();
  });

  it('owns browser callbacks, mirrors, and the player ref without scene or inspection state', () => {
    const attachmentStore =
      useEditorRuntimePreviewAttachmentStore.getState();
    const renderLayerA = vi.fn(() => ({ runtimeBacked: true }));
    const mirrorCanvas = {} as HTMLCanvasElement;
    const playerRef = { current: { seekTo: vi.fn() } } as any;

    attachmentStore.registerLayerRenderFunction('layer-a', renderLayerA);
    attachmentStore.registerMirrorCanvas('layer-a', mirrorCanvas);
    attachmentStore.setPlayerRef(playerRef);

    const frame = createVizSessionRuntimePreviewFrame({
      currentFrame: 90,
      time: 1.5,
      dt: 0.25,
      fps: 60,
      mode: 'live',
    });

    expect(attachmentStore.renderAllLayers(frame)).toEqual({
      'layer-a': { runtimeBacked: true },
    });
    expect(renderLayerA).toHaveBeenCalledWith(frame);
    expect(
      useEditorRuntimePreviewAttachmentStore.getState()
        .mirrorCanvasesByLayerId['layer-a'],
    ).toEqual([mirrorCanvas]);
    expect(
      useEditorRuntimePreviewAttachmentStore.getState().playerRef,
    ).toBe(playerRef);

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

    store.registerLayerRenderFunction('layer-a', () => ({
      runtimeBacked: false,
    }));
    store.registerLayerRenderFunction('layer-b', () => ({
      runtimeBacked: true,
    }));
    store.registerMirrorCanvas('layer-a', {} as HTMLCanvasElement);
    store.setPlayerRef(playerRef);
    store.pruneLayerAttachments(['layer-b']);

    const state = useEditorRuntimePreviewAttachmentStore.getState();
    expect([...state.layerRenderFunctions.keys()]).toEqual(['layer-b']);
    expect(state.mirrorCanvasesByLayerId['layer-a']).toBeUndefined();
    expect(state.playerRef).toBe(playerRef);
  });
});
