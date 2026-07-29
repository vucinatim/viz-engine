import { beforeEach, describe, expect, it, vi } from 'vitest';

import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorAudioSessionStore from '@/lib/stores/editor-audio-session-store';
import useEditorPreviewStore from '@/lib/stores/editor-preview-store';
import { vizSessionStore } from '@/lib/viz-session';

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

describe('Editor audio session store', () => {
  beforeEach(() => {
    useEditorPreviewStore.getState().reset();
    useEditorAudioSessionStore.getState().reset();
    useAudioEngineStore.getState().reset();
    useAudioEngineStore
      .getState()
      .setAudioElementRef({ current: createFakeAudioElement() });
  });

  it('owns canonical bundled-track selection and resets preview timing', () => {
    const sessionStore = useEditorAudioSessionStore.getState();
    const previewStore = useEditorPreviewStore.getState();

    sessionStore.setTrackList(['alpha.mp3', 'beta.mp3']);
    previewStore.setDurationFrames(600);
    previewStore.seekToFrame(240);

    sessionStore.attachBundledTrack('beta.mp3', 1);

    const snapshot = useEditorAudioSessionStore.getState();
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
    expect(useEditorPreviewStore.getState().transport.currentFrame).toBe(0);
    expect(vizSessionStore.getState().audio.currentTrackIndex).toBe(1);
    expect(audioElement.src).toBe('/music/beta.mp3');
    expect(audioElement.load).toHaveBeenCalled();
  });

  it('supports local file sources without mutating track navigation state', () => {
    const sessionStore = useEditorAudioSessionStore.getState();
    const previewStore = useEditorPreviewStore.getState();
    const localFile = { name: 'local.mp3', lastModified: 42 } as File;

    previewStore.setDurationFrames(300);
    previewStore.seekToFrame(99);
    sessionStore.attachLocalFile(localFile, 'blob:local.mp3');

    const snapshot = useEditorAudioSessionStore.getState();

    expect(snapshot.audioFile).toBe(localFile);
    expect(snapshot.currentTrackIndex).toBe(-1);
    expect(snapshot.currentTrackUrl).toBe('blob:local.mp3');
    expect(snapshot.session.source).toMatchObject({
      kind: 'file',
      id: 'local.mp3:42',
      label: 'local.mp3',
      uri: 'blob:local.mp3',
    });
    expect(useEditorPreviewStore.getState().transport.currentFrame).toBe(0);
  });

  it('restores the previous media source when capture ends', () => {
    const sessionStore = useEditorAudioSessionStore.getState();
    const audioElement = useAudioEngineStore.getState().audioElementRef
      .current as any;

    sessionStore.attachBundledTrack('alpha.mp3', 0);
    sessionStore.attachCapturedStream('Captured Tab');

    expect(useEditorAudioSessionStore.getState().session.source).toMatchObject({
      kind: 'stream',
      label: 'Captured Tab',
    });

    sessionStore.detachCapturedStream();

    const snapshot = useEditorAudioSessionStore.getState();

    expect(snapshot.session.source).toMatchObject({
      kind: 'media-element',
      uri: '/music/alpha.mp3',
    });
    expect(audioElement.src).toBe('/music/alpha.mp3');
    expect(audioElement.pause).toHaveBeenCalled();
  });
});
