import type {
  VizComponentImplementation,
  VizRenderGroupNode,
  VizRenderPolylineNode,
  VizRenderRectNode,
} from '@viz-engine/contracts';
import { heartbeatMonitorAuthoring } from './authoring/heartbeat-monitor.js';
import { asNumber, asString } from './shared.js';

const mapHeartbeatValueToY = (value: number, viewportHeight: number): number =>
  viewportHeight / 2 - (value / 100) * (viewportHeight / 2.5);

export const heartbeatMonitorComponent: VizComponentImplementation = {
  id: 'heartbeat-monitor',
  name: 'Heartbeat Monitor',
  rendererFamily: 'three',
  implementationVersion: '1.0.0',
  authoring: heartbeatMonitorAuthoring,
  description:
    'Deterministic direct-frame heartbeat trail sampled from canonical component settings.',
  inputs: [
    {
      key: 'yPosition',
      label: 'Y Position',
      supportedSources: ['graph-output', 'literal', 'artifact-feature'],
    },
  ],
  render: ({ frameContext, viewport, layer, settings, sampleSettings }) => {
    const width = Math.max(1, Math.floor(viewport.width));
    const firstFrame = Math.max(0, frameContext.frame - width + 1);
    const points = Array.from(
      { length: frameContext.frame - firstFrame + 1 },
      (_, index) => {
        const sampled = sampleSettings(firstFrame + index);
        const value = asNumber(
          sampled.yPosition,
          asNumber(settings.yPosition, 0),
        );

        return {
          x: index,
          y: mapHeartbeatValueToY(value, viewport.height),
        };
      },
    );
    const lineColor = asString(settings.lineColor, '#34d399');
    const lineWidth = Math.max(1, asNumber(settings.lineWidth, 2));

    return {
      kind: 'group',
      id: layer.id,
      children: [
        {
          kind: 'rect',
          id: `${layer.id}-background`,
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
          style: {
            fill: '#18181b',
          },
        } satisfies VizRenderRectNode,
        {
          kind: 'polyline',
          id: `${layer.id}-history`,
          points,
          lineCap: 'round',
          lineJoin: 'round',
          style: {
            stroke: lineColor,
            strokeWidth: lineWidth,
          },
          glow: {
            color: lineColor,
            blur: 10,
            opacity: 0.18,
          },
        } satisfies VizRenderPolylineNode,
      ],
    } satisfies VizRenderGroupNode;
  },
};
