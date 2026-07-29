// @vitest-environment jsdom

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import HistoryManager from '@/components/editor/history-manager';
import { CompDefinitionMap } from '@/components/comps';
import useCompStore from '@/lib/stores/comp-store';
import { vizSessionActions, vizSessionStore } from '@/lib/viz-session';
import { createTestProject } from './viz-session-test-utils';

vi.mock('@/lib/idb-json-storage', () => ({
  createIdbJsonStorage: () => ({
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  }),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('HistoryManager', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    useCompStore.setState({
      comps: Array.from(CompDefinitionMap.values()),
    });
    const emptyProject = createTestProject();
    vizSessionActions.project.setState({
      initialized: true,
      revision: 0,
      sourceProject: emptyProject,
      workingProject: emptyProject,
    });
    vizSessionActions.graph.setState({ networks: {} });
    vizSessionActions.history.setState({
      layerHistory: {
        past: [],
        present: {
          project: emptyProject,
        },
        future: [],
      },
      nodeHistories: {},
      isNodeEditorFocused: false,
      isBypassingHistory: false,
      nodeDragBypass: {},
      debounceTimer: null,
    });

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();

    const timer = vizSessionStore.getState().history.debounceTimer;
    if (timer !== null) {
      clearTimeout(timer);
    }
    vi.useRealTimers();
  });

  it('does not retrigger project history when only history state changes', () => {
    act(() => {
      root.render(React.createElement(HistoryManager));
    });

    const comp = CompDefinitionMap.get('Simple Cube');
    if (!comp) {
      throw new Error('Simple Cube component definition not found');
    }
    const project = createTestProject(comp, 'history-manager-layer');

    act(() => {
      vizSessionActions.project.importWorkingProject(project);
    });
    act(() => {
      vi.advanceTimersByTime(301);
    });

    expect(
      vizSessionStore.getState().history.layerHistory.present.project.layers,
    ).toHaveLength(1);

    act(() => {
      vizSessionActions.history.setState({ isNodeEditorFocused: true });
    });

    expect(vizSessionStore.getState().history.isNodeEditorFocused).toBe(true);
    expect(vizSessionStore.getState().history.debounceTimer).toBeNull();
    expect(
      vizSessionStore.getState().history.layerHistory.present.project.layers,
    ).toHaveLength(1);
  });
});
