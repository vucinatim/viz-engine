// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createVizEditorAppStore } from '../../apps/viz-studio/src/app-store';

const createMockAudioElement = (durationSeconds: number) => {
  const audio = document.createElement('audio');
  let paused = true;
  let currentTime = 0;

  Object.defineProperty(audio, 'paused', {
    configurable: true,
    get: () => paused,
  });

  Object.defineProperty(audio, 'duration', {
    configurable: true,
    get: () => durationSeconds,
  });

  Object.defineProperty(audio, 'currentTime', {
    configurable: true,
    get: () => currentTime,
    set: (value: number) => {
      currentTime = value;
    },
  });

  Object.defineProperty(audio, 'play', {
    configurable: true,
    value: vi.fn(async () => {
      paused = false;
      audio.onplay?.(new Event('play'));
    }),
  });

  Object.defineProperty(audio, 'pause', {
    configurable: true,
    value: vi.fn(() => {
      paused = true;
      audio.onpause?.(new Event('pause'));
    }),
  });

  Object.defineProperty(audio, 'load', {
    configurable: true,
    value: vi.fn(),
  });

  return audio;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-14T21:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('V2 editor app store live loop', () => {
  it('advances preview frames while playing without a bound audio element', async () => {
    const store = createVizEditorAppStore();

    try {
      const fps = store.getState().snapshot.transport.fps;
      await store.play();
      await vi.advanceTimersByTimeAsync(500);

      expect(store.getState().snapshot.transport.isPlaying).toBe(true);
      expect(store.getState().snapshot.transport.currentFrame).toBe(
        Math.floor(fps * 0.5),
      );

      store.pause();
      await vi.advanceTimersByTimeAsync(200);

      expect(store.getState().snapshot.transport.isPlaying).toBe(false);
      expect(store.getState().snapshot.transport.currentFrame).toBe(
        Math.floor(fps * 0.5),
      );
    } finally {
      store.dispose();
    }
  });

  it('loads bundled audio tracks, extends preview duration, and syncs frame state from the media element', () => {
    const store = createVizEditorAppStore();
    const audio = createMockAudioElement(12.5);

    try {
      const fps = store.getState().snapshot.transport.fps;
      store.bindAudioElement(audio);
      store.loadBundledAudioTrack('[Test] Heartbeat.mp3');
      audio.onloadedmetadata?.(new Event('loadedmetadata'));

      const afterLoad = store.getState();
      expect(afterLoad.audio.fileName).toBe('[Test] Heartbeat.mp3');
      expect(afterLoad.audio.sourceKind).toBe('file');
      expect(afterLoad.audio.durationSeconds).toBe(12.5);
      expect(afterLoad.snapshot.transport.durationFrames).toBe(
        Math.ceil(12.5 * fps),
      );
      expect(afterLoad.snapshot.audioSession.source?.uri).toBe(
        '/music/%5BTest%5D%20Heartbeat.mp3',
      );

      audio.currentTime = 2.5;
      audio.ontimeupdate?.(new Event('timeupdate'));

      expect(store.getState().snapshot.transport.currentFrame).toBe(
        Math.floor(2.5 * fps),
      );

      store.setLoop(false);
      expect(audio.loop).toBe(false);

      store.setLoop(true);
      expect(audio.loop).toBe(true);
    } finally {
      store.dispose();
    }
  });

  it('resets audio-specific preview state when reopening the canonical example project', () => {
    const store = createVizEditorAppStore();
    const audio = createMockAudioElement(6);

    try {
      const fps = store.getState().snapshot.transport.fps;
      store.bindAudioElement(audio);
      store.loadBundledAudioTrack('[Test] Heartbeat.mp3');
      audio.onloadedmetadata?.(new Event('loadedmetadata'));

      expect(store.getState().audio.fileName).toBe('[Test] Heartbeat.mp3');
      expect(store.getState().snapshot.transport.durationFrames).toBe(
        Math.ceil(6 * fps),
      );

      store.openExampleProject();

      expect(store.getState().audio.fileName).toBeUndefined();
      expect(store.getState().audio.sourceKind).toBeUndefined();
      expect(store.getState().snapshot.audioSession.source).toBeUndefined();
      expect(store.getState().snapshot.transport.durationFrames).toBe(
        store.getState().snapshot.session.workingProject.timeline.durationInFrames,
      );
    } finally {
      store.dispose();
    }
  });
});
