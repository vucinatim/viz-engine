import { v } from '../config/config';
import { createComponent } from '../config/create-component';

const HeartbeatMonitor = createComponent({
  name: 'Heartbeat Monitor',
  description: 'Draws a scrolling line graph, like an ECG.',
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

export default HeartbeatMonitor;
