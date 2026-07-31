import { beforeEach, describe, expect, it } from 'vitest';

import {
  getVizSessionState,
  vizSessionActions,
  vizSessionHost,
  vizSessionStore,
} from '@/lib/viz-session';

describe('VizSession preview transport', () => {
  beforeEach(() => {
    vizSessionActions.preview.reset();
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

    expect(vizSessionHost.getSnapshot().transport).toMatchObject({
      durationFrames: 600,
      currentFrame: 150,
      isPlaying: true,
    });

    vizSessionActions.preview.syncCurrentFrame(180);
    expect(vizSessionHost.getSnapshot().transport.currentFrame).toBe(180);
    expect(vizSessionStore.getState().preview.transport.currentFrame).toBe(0);

    vizSessionActions.preview.pause();
    expect(getVizSessionState().preview.transport.isPlaying).toBe(false);
    expect(getVizSessionState().preview.transport.currentFrame).toBe(180);
    expect(vizSessionStore.getState().preview.transport.isPlaying).toBe(false);
  });

  it('keeps browser attachments outside VizSession transport state', () => {
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
    expect(vizSessionStore.getState().preview).not.toHaveProperty('playerRef');
  });
});
