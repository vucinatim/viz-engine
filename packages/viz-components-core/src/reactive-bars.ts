import type {
  VizComponentImplementation,
  VizRenderGroupNode,
  VizRenderRectNode,
} from '@viz-engine/contracts';
import { asNumber, asString } from './shared.js';

export const reactiveBarsComponent: VizComponentImplementation = {
  id: 'reactive-bars',
  name: 'Reactive Bars',
  rendererFamily: 'three',
  description: 'Bars driven by precomputed music features.',
  inputs: [
    {
      key: 'bass',
      label: 'Bass Energy',
      supportedSources: ['artifact-feature', 'graph-output', 'literal'],
      required: true,
    },
    {
      key: 'loudness',
      label: 'Loudness',
      supportedSources: ['artifact-feature', 'graph-output', 'literal'],
      required: true,
    },
  ],
  render: ({ viewport, frameContext, layer, settings, resolvedInputs }) => {
    const bass = Math.max(
      0,
      Math.min(asNumber(resolvedInputs.bass?.value, 0), 1),
    );
    const loudness = Math.max(
      0,
      Math.min(asNumber(resolvedInputs.loudness?.value, 0), 1),
    );
    const barCount = Math.max(
      8,
      Math.min(96, Math.floor(asNumber(settings.barCount, 24))),
    );
    const accentColor = asString(settings.accentColor, '#88f3ff');
    const stageHeight = viewport.height * 0.34;
    const baseY = viewport.height - stageHeight - viewport.height * 0.08;
    const gap = 8;
    const totalGap = gap * (barCount - 1);
    const barWidth =
      (viewport.width - viewport.width * 0.16 - totalGap) / barCount;
    const startX = viewport.width * 0.08;

    const bars: VizRenderRectNode[] = Array.from(
      { length: barCount },
      (_, index) => {
        const phase = frameContext.frame / 11 + index / 3;
        const wave = 0.5 + Math.sin(phase) * 0.5;
        const emphasis = 0.6 + (index % 5) / 8;
        const height = 16 + (bass * 190 + loudness * 90) * wave * emphasis;

        return {
          kind: 'rect',
          id: `${layer.id}-bar-${index}`,
          x: startX + index * (barWidth + gap),
          y: baseY + stageHeight - height,
          width: Math.max(4, barWidth),
          height,
          radius: Math.min(18, barWidth / 2),
          style: {
            fill: accentColor,
            opacity: 0.4 + loudness * 0.6,
          },
        };
      },
    );

    return {
      kind: 'group',
      id: layer.id,
      children: bars,
      style: {
        opacity: layer.opacity,
        blendMode: layer.blendMode,
      },
    } satisfies VizRenderGroupNode;
  },
};
