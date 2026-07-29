// @vitest-environment jsdom

import { useLayerFPSTracker } from '@/lib/hooks/use-layer-fps-tracker';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useLayerFPSTracker', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('keeps the profiler attachment stable across unrelated rerenders', () => {
    const trackers: ReturnType<typeof useLayerFPSTracker>[] = [];
    const Probe = ({ revision }: { revision: number }) => {
      const tracker = useLayerFPSTracker('layer', 'Layer');
      trackers.push(tracker);
      return React.createElement('span', null, revision);
    };

    act(() => {
      root.render(React.createElement(Probe, { revision: 0 }));
    });
    act(() => {
      root.render(React.createElement(Probe, { revision: 1 }));
    });

    expect(trackers).toHaveLength(2);
    expect(trackers[1]).toBe(trackers[0]);
  });
});
