'use client';

import useEditorProjectStore from '@/lib/stores/editor-project-store';
import { vizSessionStore } from '@/lib/viz-session';
import { useEffect } from 'react';

export default function EditorProjectManager() {
  useEffect(() => {
    const initialize = () => {
      useEditorProjectStore.getState().initializeProjectState();
    };

    if (vizSessionStore.persist.hasHydrated()) {
      initialize();
      return;
    }

    return vizSessionStore.persist.onFinishHydration(initialize);
  }, []);

  return null;
}
