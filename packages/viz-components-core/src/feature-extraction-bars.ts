import type {
  VizComponentImplementation,
  VizRenderGroupNode,
  VizRenderRectNode,
  VizRenderTextNode,
} from '@viz-engine/contracts';
import { featureExtractionBarsAuthoring } from './authoring/feature-extraction-bars.js';
import { asNumber } from './shared.js';

const CHANNELS = [
  { key: 'kick', label: 'Kick', color: '#ef4444' },
  { key: 'snare', label: 'Snare', color: '#f59e0b' },
  { key: 'bass', label: 'Bass', color: '#22c55e' },
  { key: 'melody', label: 'Melody', color: '#60a5fa' },
  { key: 'percussion', label: 'Perc', color: '#a78bfa' },
] as const;

export const featureExtractionBarsComponent: VizComponentImplementation = {
  id: 'feature-extraction-bars',
  name: 'Feature Extraction Bars',
  rendererFamily: 'three',
  implementationVersion: '1.0.0',
  authoring: featureExtractionBarsAuthoring,
  description:
    'Five music feature channels—kick, snare, bass, melody, and percussion—as animated bars.',
  inputs: CHANNELS.map((channel) => ({
    key: channel.key,
    label: channel.label,
    supportedSources: ['artifact-feature', 'graph-output', 'literal'] as const,
  })),
  render: ({ viewport, layer, settings }) => {
    const padTop = Math.max(10, viewport.height * 0.05);
    const padBottom = Math.max(24, viewport.height * 0.12);
    const barAreaTop = padTop;
    const barAreaBottom = viewport.height - padBottom;
    const barAreaHeight = Math.max(1, barAreaBottom - barAreaTop);
    const columnAreaWidth = viewport.width / CHANNELS.length;
    const barMargin = Math.max(6, columnAreaWidth * 0.1);
    const barWidth = Math.max(0, columnAreaWidth - barMargin * 2);
    const labelFontSize = Math.floor(Math.max(10, barWidth * 0.22));
    const valueFontSize = Math.floor(Math.max(12, barWidth * 0.28));
    const children: VizRenderGroupNode['children'] = [
      {
        kind: 'rect',
        id: `${layer.id}-background`,
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
        style: { fill: '#000000', opacity: 0.4 },
      } satisfies VizRenderRectNode,
    ];

    for (const [index, channel] of CHANNELS.entries()) {
      const rawValue = asNumber(settings[channel.key], 0);
      const value = Math.max(0, Math.min(1, rawValue));
      const x = index * columnAreaWidth + barMargin;
      const barHeight = value * barAreaHeight;
      const y = barAreaBottom - barHeight;

      children.push(
        {
          kind: 'rect',
          id: `${layer.id}-${channel.key}-track`,
          x,
          y: barAreaTop,
          width: barWidth,
          height: barAreaHeight,
          style: { fill: '#ffffff', opacity: 0.08 },
        } satisfies VizRenderRectNode,
        {
          kind: 'rect',
          id: `${layer.id}-${channel.key}-fill`,
          x,
          y,
          width: barWidth,
          height: barHeight,
          style: { fill: channel.color },
        } satisfies VizRenderRectNode,
        {
          kind: 'text',
          id: `${layer.id}-${channel.key}-label`,
          x: x + barWidth / 2,
          y: viewport.height - padBottom / 2,
          text: channel.label,
          fontSize: labelFontSize,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          anchor: 'middle',
          baseline: 'middle',
          style: { fill: '#ffffff', opacity: 0.9 },
        } satisfies VizRenderTextNode,
        {
          kind: 'text',
          id: `${layer.id}-${channel.key}-value`,
          x: x + barWidth / 2,
          y: barAreaTop + barAreaHeight / 2,
          text: rawValue.toFixed(2),
          fontSize: valueFontSize,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          anchor: 'middle',
          baseline: 'middle',
          style: { fill: '#ffffff', opacity: 0.9 },
        } satisfies VizRenderTextNode,
      );
    }

    return {
      kind: 'group',
      id: layer.id,
      children,
    };
  },
};
