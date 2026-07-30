import {
  createVizEditorAudioSessionController,
  createVizEditorSession,
  createVizEditorTransportController,
} from '@viz-engine/editor-session';
import { exampleProjectDocument } from '@viz-engine/example-projects';
import { describe, expect, it } from 'vitest';

describe('Viz editor live preview foundation', () => {
  it('drives deterministic transport state with play, seek, and pause semantics', () => {
    const transport = createVizEditorTransportController({
      fps: 60,
      durationFrames: 120,
      currentFrame: 0,
      loop: false,
    });

    expect(transport.play().isPlaying).toBe(true);
    expect(transport.advanceBySeconds(0.5).currentFrame).toBe(30);
    expect(transport.seekToFrame(90).currentFrame).toBe(90);
    expect(transport.advanceBySeconds(1).currentFrame).toBe(119);
    expect(transport.getState().isPlaying).toBe(false);
    expect(transport.pause().isPlaying).toBe(false);
  });

  it('loops transport playback when configured for looping preview', () => {
    const transport = createVizEditorTransportController({
      fps: 30,
      durationFrames: 90,
      currentFrame: 80,
      loop: true,
    });

    transport.play();
    const advanced = transport.advanceBySeconds(1);

    expect(advanced.currentFrame).toBe(20);
    expect(advanced.isPlaying).toBe(true);
  });

  it('reports live-vs-baked preview diagnostics explicitly', () => {
    const audioSession = createVizEditorAudioSessionController({
      source: {
        kind: 'file',
        id: 'audio-track',
        label: 'Track',
      },
      analyzerState: 'active',
      liveInputAvailable: true,
      bakedArtifactId: 'artifact-audio-features',
      bakedArtifactAvailable: true,
    });

    expect(audioSession.getDiagnostics()).toEqual({
      inputMode: 'hybrid',
      usesLiveAudio: true,
      usesBakedArtifacts: true,
      issues: [],
    });

    audioSession.setAnalyzerState('error');
    audioSession.setLiveInputAvailable(false);

    expect(audioSession.getDiagnostics()).toEqual({
      inputMode: 'baked-only',
      usesLiveAudio: false,
      usesBakedArtifacts: true,
      issues: ['Live analyzer is in an error state.'],
    });
  });

  it('can feed transport state back into the editor-session preview state without UI coupling', () => {
    const editorSession = createVizEditorSession({
      project: exampleProjectDocument,
    });
    const transport = createVizEditorTransportController({
      fps: 60,
      durationFrames: 240,
      onStateChange: (state) => {
        editorSession.setPreviewState({
          currentFrame: state.currentFrame,
          isPlaying: state.isPlaying,
          mode: state.mode,
        });
      },
    });

    transport.play();
    transport.advanceBySeconds(0.25);
    transport.pause();

    expect(editorSession.getPreviewState()).toEqual({
      currentFrame: 15,
      isPlaying: false,
      mode: 'live',
    });
  });
});
