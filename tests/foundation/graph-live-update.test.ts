// @vitest-environment jsdom

import {
  GraphLiveUpdateProvider,
  useGraphLiveUpdate,
} from '@/components/node-network/live-update';
import { runtimeInspection } from '@/lib/viz-session';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('graph live update provider', () => {
  let container: HTMLDivElement;
  let root: Root;
  let pendingFrame: FrameRequestCallback | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        pendingFrame = callback;
        return 1;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    pendingFrame = undefined;
  });

  it('fans runtime publishes through one display frame only while visible', () => {
    const first = vi.fn();
    const second = vi.fn();
    const Probe = ({ update }: { update: () => void }) => {
      useGraphLiveUpdate(update);
      return null;
    };
    const render = (active: boolean) =>
      root.render(
        createElement(
          GraphLiveUpdateProvider,
          { active },
          createElement(Probe, { update: first }),
          createElement(Probe, { update: second }),
        ),
      );

    act(() => render(false));
    act(() => runtimeInspection.reset());
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    act(() => render(true));
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    act(() => runtimeInspection.reset());
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    act(() => pendingFrame?.(0));
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();

    act(() => render(false));
    act(() => runtimeInspection.reset());
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
  });
});
