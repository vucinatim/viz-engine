import { v } from '../config/config';
import { createComponent } from '../config/create-component';
import { INPUT_ALIAS, OUTPUT_ALIAS } from '../node-network/presets';

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
    // Kick: start simple (3 nodes) and iterate later
    kick: {
      id: 'bars-kick-adaptive',
      name: 'Kick (Band→Avg→Env→Adaptive Normalize→Gate)',
      description:
        'Kick energy: Frequency Band(80-150Hz) → Average Volume → Envelope Follower → Adaptive Normalize (Quantile) → Hysteresis Gate → Output',
      outputType: 'number',
      autoPlace: true,
      nodes: [
        {
          id: 'band',
          label: 'Frequency Band',
          position: { x: -200, y: -20 },
          inputValues: { startFrequency: 80, endFrequency: 150 },
        },
        {
          id: 'avg',
          label: 'Average Volume',
          position: { x: 80, y: -20 },
        },
        {
          id: 'env',
          label: 'Envelope Follower',
          position: { x: 220, y: -20 },
          inputValues: { attackMs: 6, releaseMs: 120 },
        },
        {
          id: 'adapt',
          label: 'Adaptive Normalize (Quantile)',
          position: { x: 340, y: -20 },
          inputValues: { windowMs: 4000, qLow: 0.5, qHigh: 0.98 },
        },
        {
          id: 'gate',
          label: 'Hysteresis Gate',
          position: { x: 480, y: -20 },
          inputValues: { low: 0.33, high: 0.45 },
        },
      ],
      edges: [
        {
          source: INPUT_ALIAS,
          sourceHandle: 'frequencyAnalysis',
          target: 'band',
          targetHandle: 'frequencyAnalysis',
        },
        {
          source: INPUT_ALIAS,
          sourceHandle: 'time',
          target: 'env',
          targetHandle: 'time',
        },
        {
          source: 'band',
          sourceHandle: 'bandData',
          target: 'avg',
          targetHandle: 'data',
        },
        {
          source: 'avg',
          sourceHandle: 'average',
          target: 'env',
          targetHandle: 'value',
        },
        {
          source: 'env',
          sourceHandle: 'env',
          target: 'adapt',
          targetHandle: 'value',
        },
        {
          source: INPUT_ALIAS,
          sourceHandle: 'time',
          target: 'adapt',
          targetHandle: 'time',
        },
        {
          source: 'adapt',
          sourceHandle: 'result',
          target: 'gate',
          targetHandle: 'value',
        },
        {
          source: 'gate',
          sourceHandle: 'gated',
          target: OUTPUT_ALIAS,
          targetHandle: 'output',
        },
      ],
    },
    snare: {
      id: 'bars-snare-adaptive',
      name: 'Snare (Band→Avg→Env→Adaptive Normalize→Gate)',
      description:
        'Snare/Clap energy: Frequency Band(180-4000Hz) → Average Volume → Envelope Follower → Adaptive Normalize (Quantile) → Hysteresis Gate → Output',
      outputType: 'number',
      autoPlace: true,
      nodes: [
        {
          id: 'band',
          label: 'Frequency Band',
          position: { x: -220, y: 0 },
          inputValues: { startFrequency: 180, endFrequency: 4000 },
        },
        {
          id: 'avg',
          label: 'Average Volume',
          position: { x: 60, y: 0 },
        },
        {
          id: 'env',
          label: 'Envelope Follower',
          position: { x: 200, y: 0 },
          inputValues: { attackMs: 4, releaseMs: 140 },
        },
        {
          id: 'adapt',
          label: 'Adaptive Normalize (Quantile)',
          position: { x: 320, y: 0 },
          inputValues: { windowMs: 4000, qLow: 0.5, qHigh: 0.95 },
        },
        {
          id: 'gate',
          label: 'Hysteresis Gate',
          position: { x: 460, y: 0 },
          inputValues: { low: 0.06, high: 0.14 },
        },
      ],
      edges: [
        {
          source: INPUT_ALIAS,
          sourceHandle: 'frequencyAnalysis',
          target: 'band',
          targetHandle: 'frequencyAnalysis',
        },
        {
          source: INPUT_ALIAS,
          sourceHandle: 'time',
          target: 'env',
          targetHandle: 'time',
        },
        {
          source: 'band',
          sourceHandle: 'bandData',
          target: 'avg',
          targetHandle: 'data',
        },
        {
          source: 'avg',
          sourceHandle: 'average',
          target: 'env',
          targetHandle: 'value',
        },
        {
          source: 'env',
          sourceHandle: 'env',
          target: 'adapt',
          targetHandle: 'value',
        },
        {
          source: INPUT_ALIAS,
          sourceHandle: 'time',
          target: 'adapt',
          targetHandle: 'time',
        },
        {
          source: 'adapt',
          sourceHandle: 'result',
          target: 'gate',
          targetHandle: 'value',
        },
        {
          source: 'gate',
          sourceHandle: 'gated',
          target: OUTPUT_ALIAS,
          targetHandle: 'output',
        },
      ],
    },
    bass: {
      id: 'bars-bass-groove',
      name: 'Bass Groove (Band→Avg→Env→MovingMean→Adaptive Normalize)',
      description:
        'Follow bassline groove: Frequency Band(≈20-120Hz) → Average Volume → Envelope Follower (time-aware) → Moving Mean (baseline groove) → Adaptive Normalize (Quantile) → Output',
      outputType: 'number',
      autoPlace: true,
      nodes: [
        {
          id: 'band',
          label: 'Frequency Band',
          position: { x: -240, y: 40 },
          inputValues: {
            startFrequency: 20.214571587652742,
            endFrequency: 120,
          },
        },
        {
          id: 'avg',
          label: 'Average Volume',
          position: { x: 40, y: 40 },
        },
        {
          id: 'env',
          label: 'Envelope Follower',
          position: { x: 180, y: 40 },
          inputValues: { attackMs: 0, releaseMs: 120 },
        },
        {
          id: 'mean',
          label: 'Moving Mean',
          position: { x: 320, y: 40 },
          inputValues: { windowMs: 120 },
        },
        {
          id: 'adapt',
          label: 'Adaptive Normalize (Quantile)',
          position: { x: 460, y: 40 },
          inputValues: { windowMs: 8000, qLow: 0.3, qHigh: 0.9 },
        },
      ],
      edges: [
        {
          source: INPUT_ALIAS,
          sourceHandle: 'frequencyAnalysis',
          target: 'band',
          targetHandle: 'frequencyAnalysis',
        },
        {
          source: 'band',
          sourceHandle: 'bandData',
          target: 'avg',
          targetHandle: 'data',
        },
        {
          source: 'avg',
          sourceHandle: 'average',
          target: 'env',
          targetHandle: 'value',
        },
        {
          source: INPUT_ALIAS,
          sourceHandle: 'time',
          target: 'env',
          targetHandle: 'time',
        },
        {
          source: 'env',
          sourceHandle: 'env',
          target: 'mean',
          targetHandle: 'value',
        },
        {
          source: INPUT_ALIAS,
          sourceHandle: 'time',
          target: 'mean',
          targetHandle: 'time',
        },
        {
          source: 'mean',
          sourceHandle: 'mean',
          target: 'adapt',
          targetHandle: 'value',
        },
        {
          source: INPUT_ALIAS,
          sourceHandle: 'time',
          target: 'adapt',
          targetHandle: 'time',
        },
        {
          source: 'adapt',
          sourceHandle: 'result',
          target: OUTPUT_ALIAS,
          targetHandle: 'output',
        },
      ],
    },
    melody: {
      id: 'bars-melody-pitched',
      name: 'Melody Pitched Presence (PP→Adaptive Normalize→Gate→Env)',
      description:
        'Detect pitched/voiced presence using banded peak × (1 − flatness), adaptively normalize, then gate and envelope.',
      outputType: 'number',
      autoPlace: true,
      nodes: [
        {
          id: 'pp',
          label: 'Pitched Presence',
          position: { x: -160, y: -40 },
          inputValues: {
            startFrequency: 400,
            endFrequency: 5000,
            flatnessCutoff: 2,
          },
        },
        {
          id: 'adapt',
          label: 'Adaptive Normalize (Quantile)',
          position: { x: 140, y: -60 },
          inputValues: { windowMs: 6000, qLow: 0.4, qHigh: 0.9 },
        },
        {
          id: 'gate',
          label: 'Hysteresis Gate',
          position: { x: 360, y: -80 },
          inputValues: { low: 0.21, high: 0.29 },
        },
        {
          id: 'env',
          label: 'Envelope Follower',
          position: { x: 640, y: 0 },
          inputValues: { attackMs: 10, releaseMs: 150 },
        },
      ],
      edges: [
        {
          source: INPUT_ALIAS,
          sourceHandle: 'frequencyAnalysis',
          target: 'pp',
          targetHandle: 'frequencyAnalysis',
        },
        {
          source: 'pp',
          sourceHandle: 'presence',
          target: 'adapt',
          targetHandle: 'value',
        },
        {
          source: INPUT_ALIAS,
          sourceHandle: 'time',
          target: 'adapt',
          targetHandle: 'time',
        },
        {
          source: 'adapt',
          sourceHandle: 'result',
          target: 'gate',
          targetHandle: 'value',
        },
        {
          source: INPUT_ALIAS,
          sourceHandle: 'time',
          target: 'env',
          targetHandle: 'time',
        },
        {
          source: 'gate',
          sourceHandle: 'gated',
          target: 'env',
          targetHandle: 'value',
        },
        {
          source: 'env',
          sourceHandle: 'env',
          target: OUTPUT_ALIAS,
          targetHandle: 'output',
        },
      ],
    },
    percussion: {
      id: 'bars-percussion-adaptive',
      name: 'Percussion (Band→Avg→Adaptive Normalize→Gate)',
      description:
        'Percussive energy: Frequency Band (2–8k) → Average Volume → Adaptive Normalize (Quantile) → Hysteresis Gate → Output',
      outputType: 'number',
      autoPlace: true,
      nodes: [
        {
          id: 'band',
          label: 'Frequency Band',
          position: { x: -240, y: 0 },
          inputValues: { startFrequency: 2000, endFrequency: 8000 },
        },
        {
          id: 'avg',
          label: 'Average Volume',
          position: { x: 40, y: 0 },
        },
        {
          id: 'adapt',
          label: 'Adaptive Normalize (Quantile)',
          position: { x: 220, y: 0 },
          inputValues: {
            windowMs: 4000,
            qLow: 0.5,
            qHigh: 0.95,
          },
        },
        {
          id: 'gate',
          label: 'Hysteresis Gate',
          position: { x: 400, y: 0 },
          inputValues: { low: 0.41, high: 0.56 },
        },
      ],
      edges: [
        {
          source: INPUT_ALIAS,
          sourceHandle: 'frequencyAnalysis',
          target: 'band',
          targetHandle: 'frequencyAnalysis',
        },
        {
          source: 'band',
          sourceHandle: 'bandData',
          target: 'avg',
          targetHandle: 'data',
        },
        {
          source: 'avg',
          sourceHandle: 'average',
          target: 'adapt',
          targetHandle: 'value',
        },
        {
          source: INPUT_ALIAS,
          sourceHandle: 'time',
          target: 'adapt',
          targetHandle: 'time',
        },
        {
          source: 'adapt',
          sourceHandle: 'result',
          target: 'gate',
          targetHandle: 'value',
        },
        {
          source: 'gate',
          sourceHandle: 'gated',
          target: OUTPUT_ALIAS,
          targetHandle: 'output',
        },
      ],
    },
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
