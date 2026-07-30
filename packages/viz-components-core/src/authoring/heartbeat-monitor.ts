import { defineVizComponentAuthoring, field, v } from './schema.js';

export const heartbeatMonitorAuthoring = defineVizComponentAuthoring({
  componentId: 'heartbeat-monitor',
  compatibility: 'render-safe',
  config: v.config({
    yPosition: field.number(
      'Y Position',
      0,
      [-100, 100, 1],
      'The vertical position of the line at the current time.',
    ),
    lineColor: field.color('Line Color', '#34d399'), // emerald-400
    lineWidth: field.number('Line Width', 2, [1, 20, 1]),
  }),
});
