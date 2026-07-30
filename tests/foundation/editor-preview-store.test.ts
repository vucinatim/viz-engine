import { beforeEach, describe, expect, it } from 'vitest';

import useEditorPreviewStore from '@/lib/stores/editor-preview-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import { vizSessionStore } from '@/lib/viz-session';

describe('Editor preview transport store', () => {
  beforeEach(() => {
    useEditorPreviewStore.getState().reset();
    useEditorRuntimePreviewAttachmentStore.getState().reset();
  });

  it('owns explicit preview transport truth', () => {
    const snapshot = useEditorPreviewStore.getState();

    expect(snapshot.transport).toMatchObject({
      fps: 60,
      durationFrames: 1,
      currentFrame: 0,
      isPlaying: false,
      loop: true,
      mode: 'live',
    });
  });

  it('supports deterministic playback and seeking operations', () => {
    const store = useEditorPreviewStore.getState();

    store.setDurationFrames(600);
    store.play();
    store.seekToSeconds(2.5);

    expect(useEditorPreviewStore.getState().transport).toMatchObject({
      durationFrames: 600,
      currentFrame: 150,
      isPlaying: true,
    });

    store.syncCurrentFrame(180);
    expect(useEditorPreviewStore.getState().transport.currentFrame).toBe(180);
    expect(vizSessionStore.getState().preview.transport.currentFrame).toBe(180);

    store.pause();
    expect(useEditorPreviewStore.getState().transport.isPlaying).toBe(false);
    expect(vizSessionStore.getState().preview.transport.isPlaying).toBe(false);
  });

  it('keeps the browser player attachment outside VizSession transport state', () => {
    const dummyPlayerRef = { current: { seekTo: () => undefined } } as any;
    const store = useEditorPreviewStore.getState();

    useEditorRuntimePreviewAttachmentStore
      .getState()
      .setPlayerRef(dummyPlayerRef);
    store.setDurationFrames(240);
    store.seekToFrame(120);
    store.play();
    store.reset();

    const snapshot = useEditorPreviewStore.getState();
    expect(snapshot.transport).toMatchObject({
      durationFrames: 1,
      currentFrame: 0,
      isPlaying: false,
    });
    expect(useEditorRuntimePreviewAttachmentStore.getState().playerRef).toBe(
      dummyPlayerRef,
    );
    expect(vizSessionStore.getState().preview).not.toHaveProperty('playerRef');
  });
});
