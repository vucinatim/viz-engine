import { describe, expect, it } from 'vitest';

import CurveSpectrum from '@/components/comps/curve-spectrum';
import { createVizSessionRuntimePreviewFrame } from '@/lib/viz-session';
import { createRuntimeRenderPlanForEditorLayer } from '@/lib/editor-runtime-preview-runtime-bridge';
import useCompStore from '@/lib/stores/comp-store';
import useEditorProjectStore from '@/lib/stores/editor-project-store';
import { getProjectedLayer } from '@/lib/stores/editor-layer-projection-store';
import { createTestProject } from './viz-session-test-utils';

describe('Editor runtime preview runtime bridge', () => {
  it('builds a package-runtime render plan for runtime-backed editor layers', () => {
    const layerId = 'layer-curve-spectrum-runtime';
    useCompStore.setState({ comps: [CurveSpectrum] });
    useEditorProjectStore
      .getState()
      .importWorkingProject(createTestProject(CurveSpectrum, layerId));
    const layer = getProjectedLayer(layerId);
    if (!layer) {
      throw new Error('Expected canonical layer projection.');
    }
    const frame = createVizSessionRuntimePreviewFrame({
      currentFrame: 24,
      time: 0.8,
      dt: 1 / 30,
      fps: 30,
      mode: 'live',
    });
    const spectrum = Uint8Array.from(
      { length: 128 },
      (_, index) => Math.max(0, 255 - index * 2),
    );
    const configValues = layer.config.getValues({
      audioSignal: new Uint8Array(128),
      frequencyData: spectrum,
      time: frame.time,
      frequencyAnalysis: {
        frequencyData: spectrum,
        sampleRate: 44100,
        fftSize: 2048,
      },
    });

    const renderPlan = createRuntimeRenderPlanForEditorLayer({
      layer,
      viewportWidth: 640,
      viewportHeight: 360,
      frame,
      configValues,
      audioFrameData: {
        frequencyData: spectrum,
        sampleRate: 44100,
        fftSize: 2048,
      },
    });

    expect(renderPlan).not.toBeNull();
    expect(renderPlan?.layers).toHaveLength(1);
    expect(renderPlan?.layers[0]?.componentId).toBe('curve-spectrum');
    expect(renderPlan?.layers[0]?.node?.kind).toBe('group');
    expect(renderPlan?.issues).toEqual([]);
  });
});
