import { v } from '../config/config';
import { createComponent } from '../config/create-component';

type BarsConfigValues = {
  kick: number;
  snare: number;
  bass: number;
  melody: number;
  percussion: number;
};

type BarsState = {};

const FeatureExtractionBars = createComponent<
  ReturnType<
    typeof v.config<{
      kick: any;
      snare: any;
      bass: any;
      melody: any;
      percussion: any;
    }>
  >,
  BarsState
>({
  name: 'Feature Extraction Bars',
  description:
    'Demo of five feature channels (kick, snare, bass, melody, percussion) as animated bars.',
  config: v.config({
    kick: v.number({
      label: 'Kick',
      description: 'Kick drum energy (0..1)',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
    snare: v.number({
      label: 'Snare/Clap',
      description: 'Snare or clap energy (0..1)',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
    bass: v.number({
      label: 'Bass',
      description: 'Bass energy (0..1)',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
    melody: v.number({
      label: 'Melody/Vocal',
      description: 'Melody/Vocal energy (0..1)',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
    percussion: v.number({
      label: 'Percussion',
      description: 'Percussion energy (0..1)',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
  }),
  defaultNetworks: {
    // Use the new preset IDs from presets.ts
    kick: 'kick-adaptive',
    snare: 'snare-adaptive',
    bass: 'bass-adaptive',
    melody: 'melody-harmonic',
    percussion: 'percussion-adaptive',
  },
  draw: ({ canvasCtx, config }) => {
    const ctx = canvasCtx;
    const { width, height } = ctx.canvas;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background (subtle)
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, width, height);

    // Layout paddings
    const padTop = Math.max(10, height * 0.05);
    const padBottom = Math.max(24, height * 0.12);
    const barAreaTop = padTop;
    const barAreaBottom = height - padBottom;
    const barAreaHeight = Math.max(1, barAreaBottom - barAreaTop);

    const labels = ['Kick', 'Snare', 'Bass', 'Melody', 'Perc'];
    const values: number[] = [
      config.kick,
      config.snare,
      config.bass,
      config.melody,
      config.percussion,
    ].map((v) => {
      // Clamp to 0..1 so 0 renders at bottom and 1 at top
      const n = typeof v === 'number' ? v : 0;
      return Math.max(0, Math.min(1, n));
    });

    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#60a5fa', '#a78bfa'];
    const count = 5;
    const columnAreaWidth = width / count;
    const barMargin = Math.max(6, columnAreaWidth * 0.1);
    const barWidth = columnAreaWidth - barMargin * 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < count; i++) {
      const x = i * columnAreaWidth + barMargin;
      const value = values[i];
      const barHeight = value * barAreaHeight;
      const y = barAreaBottom - barHeight;

      // Track background
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x, barAreaTop, barWidth, barAreaHeight);

      // Bar fill
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, y, barWidth, barHeight);

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${Math.floor(Math.max(10, barWidth * 0.22))}px ui-sans-serif, system-ui, -apple-system`;
      ctx.fillText(labels[i], x + barWidth / 2, height - padBottom / 2);

      // Value text
      const raw = [
        config.kick,
        config.snare,
        config.bass,
        config.melody,
        config.percussion,
      ][i];
      const displayVal =
        typeof raw === 'number' ? raw.toFixed(2) : String(raw ?? '');
      ctx.font = `${Math.floor(
        Math.max(12, barWidth * 0.28),
      )}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace`;
      // Draw value statically centered in the column area (not animated with fill)
      ctx.fillText(
        displayVal,
        x + barWidth / 2,
        barAreaTop + barAreaHeight / 2,
      );
    }
  },
});

export default FeatureExtractionBars;
