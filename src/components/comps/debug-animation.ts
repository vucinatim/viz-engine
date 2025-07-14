import { v } from '../config/config';
import { createComponent } from '../config/create-component';

const DebugAnimation = createComponent({
  name: 'Debug Animation',
  description: 'A simple component to debug animated values.',
  config: v.config({
    value: v.number({
      label: 'Value',
      description: 'The value to be animated and displayed.',
      defaultValue: 50,
      min: 0,
      max: 100,
      step: 1,
    }),
  }),
  draw: ({ canvasCtx: ctx, config }) => {
    const { width, height } = ctx.canvas;
    const { value } = config;

    // Clear canvas with a dark background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#18181b'; // zinc-900
    ctx.fillRect(0, 0, width, height);

    // --- Draw Text ---
    ctx.fillStyle = 'white';
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textValue =
      typeof value === 'number' ? value.toFixed(2) : String(value);
    ctx.fillText(`Value: ${textValue}`, width / 2, height / 2 - 40);

    // --- Draw Visual Bar ---
    const barHeight = 40;
    // Ensure value is within the expected range for calculation
    const normalizedValue = Math.max(0, Math.min(100, value || 0));
    const barWidth = (width - 80) * (normalizedValue / 100);
    const barX = 40;
    const barY = height / 2 + 20;

    // Background of the bar
    ctx.fillStyle = '#3f3f46'; // zinc-700
    ctx.fillRect(barX, barY, width - 80, barHeight);

    // Filled part of the bar
    ctx.fillStyle = '#60a5fa'; // blue-400
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Border of the bar
    ctx.strokeStyle = '#a1a1aa'; // zinc-400
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, width - 80, barHeight);
  },
});

export default DebugAnimation;
