import type {
  VizComponentImplementation,
  VizRenderGroupNode,
  VizRenderRectNode,
  VizRenderTextNode,
} from '@viz-engine/contracts';
import { debugAnimationAuthoring } from './authoring/debug-animation.js';
import { asNumber, asString } from './shared.js';

export const debugAnimationComponent: VizComponentImplementation = {
  id: 'debug-animation',
  name: 'Debug Animation',
  rendererFamily: 'three',
  implementationVersion: '1.0.0',
  authoring: debugAnimationAuthoring,
  description:
    'Runtime-backed diagnostic values, labels, and normalized value bar.',
  render: ({ viewport, layer, settings }) => {
    const value = asNumber(settings.value, 50);
    const midi = asNumber(settings.midi, 60);
    const text = asString(settings.text, '');
    const color = asString(settings.color, '#60a5fa');
    const normalizedValue = Math.max(0, Math.min(100, value));
    const barHeight = 40;
    const barX = 40;
    const barY = viewport.height / 2 + 60;
    const trackWidth = Math.max(0, viewport.width - 80);
    const commonText = {
      kind: 'text',
      x: viewport.width / 2,
      anchor: 'middle',
      baseline: 'middle',
      style: { fill: '#ffffff' },
    } as const;

    const children: VizRenderGroupNode['children'] = [
      {
        kind: 'rect',
        id: `${layer.id}-background`,
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
        style: { fill: '#18181b' },
      } satisfies VizRenderRectNode,
      {
        ...commonText,
        id: `${layer.id}-value-label`,
        y: viewport.height / 2 - 60,
        text: `Value: ${value.toFixed(2)}`,
        fontSize: 32,
      } satisfies VizRenderTextNode,
      {
        ...commonText,
        id: `${layer.id}-midi-label`,
        y: viewport.height / 2 - 20,
        text: `MIDI: ${midi}`,
        fontSize: 24,
      } satisfies VizRenderTextNode,
      {
        ...commonText,
        id: `${layer.id}-text-label`,
        y: viewport.height / 2 + 20,
        text: `Text: ${text}`,
        fontSize: 24,
      } satisfies VizRenderTextNode,
      {
        kind: 'rect',
        id: `${layer.id}-bar-track`,
        x: barX,
        y: barY,
        width: trackWidth,
        height: barHeight,
        style: {
          fill: '#3f3f46',
          stroke: '#a1a1aa',
          strokeWidth: 2,
        },
      } satisfies VizRenderRectNode,
      {
        kind: 'rect',
        id: `${layer.id}-bar-fill`,
        x: barX,
        y: barY,
        width: trackWidth * (normalizedValue / 100),
        height: barHeight,
        style: { fill: color },
      } satisfies VizRenderRectNode,
    ];

    return {
      kind: 'group',
      id: layer.id,
      children,
    };
  },
};
