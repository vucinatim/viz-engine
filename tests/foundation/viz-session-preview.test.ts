import { beforeEach, describe, expect, it } from 'vitest';

import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import {
  getVizSessionState,
  vizSessionActions,
  vizSessionStore,
} from '@/lib/viz-session';

describe('VizSession preview transport', () => {
  beforeEach(() => {
    vizSessionActions.preview.reset();
    useEditorRuntimePreviewAttachmentStore.getState().reset();
  });

  it('owns explicit preview transport truth', () => {
    const snapshot = getVizSessionState().preview;

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
    vizSessionActions.preview.setDurationFrames(600);
    vizSessionActions.preview.play();
    vizSessionActions.preview.seekToSeconds(2.5);

    expect(getVizSessionState().preview.transport).toMatchObject({
      durationFrames: 600,
      currentFrame: 150,
      isPlaying: true,
    });

    vizSessionActions.preview.syncCurrentFrame(180);
    expect(getVizSessionState().preview.transport.currentFrame).toBe(180);
    expect(vizSessionStore.getState().preview.transport.currentFrame).toBe(180);

    vizSessionActions.preview.pause();
    expect(getVizSessionState().preview.transport.isPlaying).toBe(false);
    expect(vizSessionStore.getState().preview.transport.isPlaying).toBe(false);
  });

  it('keeps the browser player attachment outside VizSession transport state', () => {
    const dummyPlayerRef = { current: { seekTo: () => undefined } } as any;
    useEditorRuntimePreviewAttachmentStore
      .getState()
      .setPlayerRef(dummyPlayerRef);
    vizSessionActions.preview.setDurationFrames(240);
    vizSessionActions.preview.seekToFrame(120);
    vizSessionActions.preview.play();
    vizSessionActions.preview.reset();

    const snapshot = getVizSessionState().preview;
    expect(snapshot.transport).toMatchObject({
      durationFrames: 240,
      currentFrame: 0,
      isPlaying: false,
    });
    expect(useEditorRuntimePreviewAttachmentStore.getState().playerRef).toBe(
      dummyPlayerRef,
    );
    expect(vizSessionStore.getState().preview).not.toHaveProperty('playerRef');
  });
});
