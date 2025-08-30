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
      name: 'Kick (Band→Info→Smooth→Adaptive Normalize→Gate)',
      description:
        'Kick energy: Frequency Band(80-150Hz) → Band Info → Smoothing → Adaptive Normalize (Quantile) → Hysteresis Gate → Output',
      outputType: 'number',
      autoPlace: true,
      nodes: [
        {
          id: 'band',
          label: 'Frequency Band',
          inputValues: { startFrequency: 80, endFrequency: 150 },
        },
        {
          id: 'info',
          label: 'Band Info',
        },
        {
          id: 'env',
          label: 'Envelope Follower',
          inputValues: { attackMs: 6, releaseMs: 120 },
        },
        {
          id: 'adapt',
          label: 'Adaptive Normalize (Quantile)',
          inputValues: {
            windowMs: 4000,
            qLow: 0.5,
            qHigh: 0.98,
            freezeBelow: 140,
          },
        },
        {
          id: 'gate',
          label: 'Hysteresis Gate',
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
          source: 'band',
          sourceHandle: 'bandData',
          target: 'info',
          targetHandle: 'data',
        },
        {
          source: 'info',
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
      name: 'Snare (Band→Info→Smooth→Adaptive Normalize→Gate)',
      description:
        'Snare/Clap energy: Frequency Band(180-4000Hz) → Band Info → Smoothing → Adaptive Normalize (Quantile) → Hysteresis Gate → Output',
      outputType: 'number',
      autoPlace: true,
      nodes: [
        {
          id: 'band',
          label: 'Frequency Band',
          inputValues: { startFrequency: 180, endFrequency: 4000 },
        },
        {
          id: 'info',
          label: 'Band Info',
        },
        {
          id: 'env',
          label: 'Envelope Follower',
          inputValues: { attackMs: 4, releaseMs: 140 },
        },
        {
          id: 'adapt',
          label: 'Adaptive Normalize (Quantile)',
          inputValues: {
            windowMs: 4000,
            qLow: 0.5,
            qHigh: 0.95,
            freezeBelow: 90,
          },
        },
        {
          id: 'gate',
          label: 'Hysteresis Gate',
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
          source: 'band',
          sourceHandle: 'bandData',
          target: 'info',
          targetHandle: 'data',
        },
        {
          source: 'info',
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
      id: 'bars-bass-adapt-env',
      name: 'Bass (Band→Info→Adaptive Normalize→Envelope)',
      description:
        'Bass presence: Frequency Band(20–163Hz) → Band Info (average) → Adaptive Normalize (Quantile) → Envelope Follower → Output',
      outputType: 'number',
      autoPlace: true,
      nodes: [
        {
          id: 'band',
          label: 'Frequency Band',
          inputValues: {
            startFrequency: 20,
            endFrequency: 163,
          },
        },
        {
          id: 'info',
          label: 'Band Info',
        },
        {
          id: 'adapt',
          label: 'Adaptive Normalize (Quantile)',
          inputValues: {
            windowMs: 4000,
            qLow: 0.3,
            qHigh: 0.9,
            freezeBelow: 130,
          },
        },
        {
          id: 'env_follow',
          label: 'Envelope Follower',
          inputValues: { attackMs: 100, releaseMs: 400 },
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
          target: 'info',
          targetHandle: 'data',
        },
        {
          source: 'info',
          sourceHandle: 'average',
          target: 'adapt',
          targetHandle: 'value',
        },
        {
          source: 'adapt',
          sourceHandle: 'result',
          target: 'env_follow',
          targetHandle: 'value',
        },
        {
          source: 'env_follow',
          sourceHandle: 'env',
          target: OUTPUT_ALIAS,
          targetHandle: 'output',
        },
      ],
    },
    melody: {
      id: 'bars-melody-harmonic',
      name: 'Melody (Band→Harmonic Presence→Envelope→Normalize)',
      description:
        'Melodic/voiced presence using harmonic series scoring, smoothed by an envelope follower and mapped to 0–1.',
      outputType: 'number',
      autoPlace: true,
      nodes: [
        {
          id: 'band',
          label: 'Frequency Band',
          inputValues: {
            startFrequency: 212,
            endFrequency: 3762,
          },
        },
        {
          id: 'harm',
          label: 'Harmonic Presence',
          inputValues: {
            maxHarmonics: 3,
            toleranceCents: 50,
            smoothMs: 100,
            minSNR: 0.6,
          },
        },
        {
          id: 'env',
          label: 'Envelope Follower',
          inputValues: { attackMs: 6, releaseMs: 300 },
        },
        {
          id: 'norm',
          label: 'Normalize',
          inputValues: {
            inputMin: 0.2,
            inputMax: 0.4,
            outputMin: 0,
            outputMax: 1,
          },
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
          target: 'harm',
          targetHandle: 'data',
        },
        {
          source: 'band',
          sourceHandle: 'bandStartBin',
          target: 'harm',
          targetHandle: 'bandStartBin',
        },
        {
          source: 'band',
          sourceHandle: 'frequencyPerBin',
          target: 'harm',
          targetHandle: 'frequencyPerBin',
        },
        {
          source: 'harm',
          sourceHandle: 'presence',
          target: 'env',
          targetHandle: 'value',
        },
        {
          source: 'env',
          sourceHandle: 'env',
          target: 'norm',
          targetHandle: 'value',
        },
        {
          source: 'norm',
          sourceHandle: 'result',
          target: OUTPUT_ALIAS,
          targetHandle: 'output',
        },
      ],
    },
    percussion: {
      id: 'bars-percussion-adaptive',
      name: 'Percussion (Band→Info→Adaptive Normalize→Gate)',
      description:
        'Percussive energy: Frequency Band (2–8k) → Band Info → Adaptive Normalize (Quantile) → Hysteresis Gate → Output',
      outputType: 'number',
      autoPlace: true,
      nodes: [
        {
          id: 'band',
          label: 'Frequency Band',
          inputValues: {
            startFrequency: 4000,
            endFrequency: 10000,
          },
        },
        {
          id: 'info',
          label: 'Band Info',
        },
        {
          id: 'adapt',
          label: 'Adaptive Normalize (Quantile)',
          inputValues: {
            windowMs: 4000,
            qLow: 0.5,
            qHigh: 0.9,
            freezeBelow: 40,
          },
        },
        {
          id: 'gate',
          label: 'Hysteresis Gate',
          inputValues: { low: 0.4, high: 0.5 },
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
          target: 'info',
          targetHandle: 'data',
        },
        {
          source: 'info',
          sourceHandle: 'average',
          target: 'adapt',
          targetHandle: 'value',
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
