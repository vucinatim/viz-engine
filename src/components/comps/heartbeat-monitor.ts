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
  createState: () => ({
    history: [] as number[],
  }),
  draw: ({ canvasCtx: ctx, config, state }) => {
    const { width, height } = ctx.canvas;
    const { yPosition, lineColor, lineWidth } = config;

    // Add the new value to the history
    state.history.push(yPosition);

    // If the history is longer than the canvas is wide, trim the oldest value
    if (state.history.length > width) {
      state.history.shift();
    }
    const { history } = state;

    // --- Clear canvas with a dark background ---
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#18181b'; // zinc-900
    ctx.fillRect(0, 0, width, height);

    // --- Draw the line ---
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    // Map the y-value from the [-100, 100] range to the canvas height
    const mapY = (val: number) => height / 2 - (val / 100) * (height / 2.5);

    // Move to the first point in the history
    if (history.length > 0) {
      ctx.moveTo(0, mapY(history[0]));
    }

    // Draw a line connecting all subsequent points
    for (let i = 1; i < history.length; i++) {
      ctx.lineTo(i, mapY(history[i]));
    }

    ctx.stroke();

    // --- Optional: Add a subtle glow by drawing the line again with a shadow ---
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow for subsequent draw calls
  },
});

export default HeartbeatMonitor;
