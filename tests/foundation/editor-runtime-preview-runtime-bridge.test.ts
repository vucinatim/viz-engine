import { describe, expect, it } from 'vitest';

import CurveSpectrum from '@/components/comps/curve-spectrum';
import DebugAnimation from '@/components/comps/debug-animation';
import FeatureExtractionBars from '@/components/comps/feature-extraction-bars';
import SimpleCube from '@/components/comps/simple-cube';
import StrobeLight from '@/components/comps/strobe-light';
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

  it.each([
    [DebugAnimation, 'debug-animation', 'group'],
    [FeatureExtractionBars, 'feature-extraction-bars', 'group'],
    [StrobeLight, 'strobe-light', 'shader'],
    [SimpleCube, 'simple-cube', 'three-program'],
  ])(
    'builds runtime plans for newly migrated preserved-editor components',
    (comp, componentId, expectedNodeKind) => {
      const layerId = `layer-${componentId}`;
      useCompStore.setState({ comps: [comp] });
      useEditorProjectStore
        .getState()
        .importWorkingProject(createTestProject(comp, layerId));
      const layer = getProjectedLayer(layerId);
      if (!layer) {
        throw new Error('Expected canonical layer projection.');
      }
      const frame = createVizSessionRuntimePreviewFrame({
        currentFrame: 12,
        time: 0.4,
        dt: 1 / 30,
        fps: 30,
        mode: 'live',
      });
      const spectrum = new Uint8Array(128);
      const configValues = layer.config.getValues({
        audioSignal: spectrum,
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

      expect(renderPlan?.layers[0]?.componentId).toBe(componentId);
      expect(renderPlan?.layers[0]?.node?.kind).toBe(expectedNodeKind);
      expect(renderPlan?.issues).toEqual([]);
    },
  );
});
