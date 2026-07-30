import { describe, expect, it } from 'vitest';

import { createVizEditorSession } from '@viz-engine/editor-session';
import { createTestProject } from './viz-session-test-utils';

describe('canonical editor-session history', () => {
  it('records typed mutations without a React history observer', () => {
    const project = createTestProject();
    const layer = {
      ...project.layers[0],
      id: 'history-layer',
    };
    const session = createVizEditorSession({
      project: {
        ...project,
        layers: [layer],
        layerOrder: [layer.id],
      },
    });

    session.applyAction({
      type: 'layer.settings.set',
      payload: {
        layerId: layer.id,
        path: 'appearance.scale',
        value: 2,
      },
    });

    expect(session.canUndo()).toBe(true);
    session.undo();
    expect(
      session.getWorkingProject().layers[0]?.settings?.appearance,
    ).toBeUndefined();
    session.redo();
    expect(session.getWorkingProject().layers[0]?.settings?.appearance).toEqual(
      { scale: 2 },
    );
  });

  it('coalesces continuous editor gestures into one history entry', () => {
    const project = createTestProject();
    const session = createVizEditorSession({ project });

    session.beginHistoryGroup();
    session.applyAction({
      type: 'timeline.set',
      payload: {
        timeline: { ...project.timeline, durationInFrames: 120 },
      },
    });
    session.applyAction({
      type: 'timeline.set',
      payload: {
        timeline: { ...project.timeline, durationInFrames: 240 },
      },
    });
    session.endHistoryGroup();
    session.undo();

    expect(session.getWorkingProject().timeline.durationInFrames).toBe(
      project.timeline.durationInFrames,
    );
    expect(session.canUndo()).toBe(false);
  });
});
