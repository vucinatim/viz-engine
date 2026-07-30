import { beforeEach, describe, expect, it, vi } from 'vitest';

import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import {
  getVizSessionState,
  vizSessionActions,
  vizSessionStore,
} from '@/lib/viz-session';

const createFakeAudioElement = () =>
  ({
    src: '',
    srcObject: null,
    muted: false,
    currentTime: 0,
    pause: vi.fn(),
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    removeAttribute: vi.fn(),
  }) as unknown as HTMLAudioElement;

describe('VizSession audio', () => {
  beforeEach(() => {
    vizSessionActions.preview.reset();
    vizSessionActions.audio.reset();
    useAudioEngineStore.getState().reset();
    useAudioEngineStore
      .getState()
      .setAudioElementRef({ current: createFakeAudioElement() });
  });

  it('owns canonical bundled-track selection and resets preview timing', () => {
    vizSessionActions.audio.setTrackList(['alpha.mp3', 'beta.mp3']);
    vizSessionActions.preview.setDurationFrames(600);
    vizSessionActions.preview.seekToFrame(240);

    vizSessionActions.audio.attachBundledTrack('beta.mp3', 1);

    const snapshot = getVizSessionState().audio;
    const audioElement = useAudioEngineStore.getState().audioElementRef
      .current as any;

    expect(snapshot.session.source).toMatchObject({
      kind: 'media-element',
      id: 'beta.mp3',
      label: 'beta.mp3',
      uri: '/music/beta.mp3',
    });
    expect(snapshot.currentTrackUrl).toBe('/music/beta.mp3');
    expect(snapshot.currentTrackIndex).toBe(1);
    expect(getVizSessionState().preview.transport.currentFrame).toBe(0);
    expect(vizSessionStore.getState().audio.currentTrackIndex).toBe(1);
    expect(audioElement.src).toBe('/music/beta.mp3');
    expect(audioElement.load).toHaveBeenCalled();
  });

  it('supports local file sources without mutating track navigation state', () => {
    const localFile = { name: 'local.mp3', lastModified: 42 } as File;

    vizSessionActions.preview.setDurationFrames(300);
    vizSessionActions.preview.seekToFrame(99);
    vizSessionActions.audio.attachLocalFile(localFile, 'blob:local.mp3');

    const snapshot = getVizSessionState().audio;

    expect(snapshot.audioFile).toBe(localFile);
    expect(snapshot.currentTrackIndex).toBe(-1);
    expect(snapshot.currentTrackUrl).toBe('blob:local.mp3');
    expect(snapshot.session.source).toMatchObject({
      kind: 'file',
      id: 'local.mp3:42',
      label: 'local.mp3',
      uri: 'blob:local.mp3',
    });
    expect(getVizSessionState().preview.transport.currentFrame).toBe(0);
  });

  it('restores the previous media source when capture ends', () => {
    const audioElement = useAudioEngineStore.getState().audioElementRef
      .current as any;

    vizSessionActions.audio.attachBundledTrack('alpha.mp3', 0);
    vizSessionActions.audio.attachCapturedStream('Captured Tab');

    expect(getVizSessionState().audio.session.source).toMatchObject({
      kind: 'stream',
      label: 'Captured Tab',
    });

    vizSessionActions.audio.detachCapturedStream();

    const snapshot = getVizSessionState().audio;

    expect(snapshot.session.source).toMatchObject({
      kind: 'media-element',
      uri: '/music/alpha.mp3',
    });
    expect(audioElement.src).toBe('/music/alpha.mp3');
    expect(audioElement.pause).toHaveBeenCalled();
  });
});
