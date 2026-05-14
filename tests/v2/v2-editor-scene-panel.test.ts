// @vitest-environment jsdom

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import { V2ScenePanel } from '@/components/editor/v2-scene-panel';
import { V2EditorProvider } from '@/components/editor/v2-editor-provider';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const renderPanel = async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      React.createElement(
        V2EditorProvider,
        null,
        React.createElement(V2ScenePanel),
      ),
    );
  });
};

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

describe('V2 scene panel integration', () => {
  it('renders the working head, graph runtime, and issue surfaces from the editor provider', async () => {
    await renderPanel();

    expect(container?.textContent).toContain('Scene Truth');
    expect(container?.textContent).toContain('Reactive Bars');

    const graphsTab = Array.from(
      container?.querySelectorAll('button') ?? [],
    ).find((button) => button.textContent?.includes('Graphs'));

    expect(graphsTab).toBeDefined();

    await act(async () => {
      graphsTab?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
    });

    expect(container?.textContent).toContain('Main Reactivity Graph');
    expect(container?.textContent).toContain('barsBass');

    const componentsTab = Array.from(
      container?.querySelectorAll('button') ?? [],
    ).find((button) => button.textContent?.includes('Components'));

    expect(componentsTab).toBeDefined();

    await act(async () => {
      componentsTab?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
    });

    expect(container?.textContent).toContain('Feature Channel Bars');
    expect(container?.textContent).toContain('percussion');

    const issuesTab = Array.from(
      container?.querySelectorAll('button') ?? [],
    ).find((button) => button.textContent?.includes('Issues'));

    expect(issuesTab).toBeDefined();

    await act(async () => {
      issuesTab?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
    });

    expect(container?.textContent).toContain('Working Head Summary');
  });
});
