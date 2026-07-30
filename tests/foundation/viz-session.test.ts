import { beforeEach, describe, expect, it } from 'vitest';

import { CompDefinitionMap } from '@/components/comps';
import useCompStore from '@/lib/stores/comp-store';
import useEditorAudioSessionStore from '@/lib/stores/editor-audio-session-store';
import useEditorPreviewStore from '@/lib/stores/editor-preview-store';
import useEditorProjectStore from '@/lib/stores/editor-project-store';
import { vizSessionActions, vizSessionStore } from '@/lib/viz-session';
import { createTestProject } from './viz-session-test-utils';

describe('VizSession', () => {
  beforeEach(() => {
    useCompStore.setState({ comps: [] });
    vizSessionActions.project.importWorkingProject(createTestProject());
    vizSessionActions.preview.reset();
    vizSessionActions.audio.reset();
  });

  it('acts as the single backing state for project, preview, and audio bindings', () => {
    const comp = CompDefinitionMap.values().next().value;
    if (!comp) {
      throw new Error('Expected at least one component definition');
    }
    useCompStore.getState().addComp(comp);

    vizSessionActions.project.addLayer(comp);
    vizSessionActions.preview.setDurationFrames(300);
    vizSessionActions.preview.seekToFrame(90);
    vizSessionActions.audio.setTrackList(['alpha.mp3']);

    const sessionState = vizSessionStore.getState();

    expect(sessionState.project.workingProject.layers).toHaveLength(1);
    expect(sessionState.project.workingProject.schemaVersion).toBe(
      '2.0.0-alpha.1',
    );
    expect(sessionState.preview.transport.currentFrame).toBe(90);
    expect(sessionState.audio.trackList).toEqual(['alpha.mp3']);

    expect(useEditorProjectStore.getState().workingProject.layers).toHaveLength(
      1,
    );
    expect(useEditorPreviewStore.getState().transport.currentFrame).toBe(90);
    expect(useEditorAudioSessionStore.getState().trackList).toEqual([
      'alpha.mp3',
    ]);
  });
});
