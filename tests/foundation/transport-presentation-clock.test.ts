import { beforeEach, describe, expect, it } from 'vitest';

import { transportPresentationClock } from '@/lib/transport-presentation-clock';
import {
  vizSessionActions,
  vizSessionHost,
  vizSessionStore,
} from '@/lib/viz-session';

describe('transport presentation clock', () => {
  beforeEach(() => {
    vizSessionActions.preview.reset();
    vizSessionActions.preview.setDurationFrames(600);
  });

  it('publishes playing frames without invalidating the React session store', () => {
    let sessionUpdates = 0;
    let clockUpdates = 0;
    const unsubscribeSession = vizSessionStore.subscribe(() => {
      sessionUpdates += 1;
    });
    const unsubscribeClock = transportPresentationClock.subscribe(() => {
      clockUpdates += 1;
    });

    vizSessionActions.preview.play();
    sessionUpdates = 0;
    clockUpdates = 0;
    for (let index = 0; index < 20; index += 1) {
      vizSessionActions.preview.advanceBySeconds(1 / 60);
    }

    expect(clockUpdates).toBe(20);
    expect(sessionUpdates).toBe(0);
    expect(vizSessionHost.getSnapshot().transport.currentFrame).toBe(20);
    expect(vizSessionStore.getState().preview.transport.currentFrame).toBe(0);

    vizSessionActions.preview.pause();
    expect(sessionUpdates).toBe(1);
    expect(vizSessionStore.getState().preview.transport.currentFrame).toBe(20);

    unsubscribeClock();
    unsubscribeSession();
  });
});
