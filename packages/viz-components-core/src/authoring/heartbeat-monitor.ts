import { defineVizComponentAuthoring, v } from './schema.js';

export const heartbeatMonitorAuthoring = defineVizComponentAuthoring({
  componentId: 'heartbeat-monitor',
  compatibility: 'render-safe',
  config: v.config({
    yPosition: v.number({
      label: 'Y Position',
      description: 'The vertical position of the line at the current time.',
      defaultValue: 0,
      min: -100,
      max: 100,
      step: 1,
    }),
    lineColor: v.color({
      label: 'Line Color',
      defaultValue: '#34d399', // emerald-400
    }),
    lineWidth: v.number({
      label: 'Line Width',
      defaultValue: 2,
      min: 1,
      max: 20,
      step: 1,
    }),
  }),
});
