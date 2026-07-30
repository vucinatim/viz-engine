import { vizSessionActions, vizSessionStore } from '@/lib/viz-session';
import { useEffect } from 'react';

export default function EditorProjectManager() {
  useEffect(() => {
    const initialize = () => {
      vizSessionActions.project.initializeProjectState();
    };

    if (vizSessionStore.persist.hasHydrated()) {
      initialize();
      return;
    }

    return vizSessionStore.persist.onFinishHydration(initialize);
  }, []);

  return null;
}
