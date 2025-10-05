export const AUDIO_THEME = {
  waveform: {
    height: 72,
    // A cooler, more dynamic gradient from top->bottom (0 to 1)
    gradientStops: [
      { offset: 0, color: 'rgb(34, 211, 238)' }, // A cool, electric cyan-500 for the peaks
      { offset: 1.0, color: 'rgb(76, 29, 149)' }, // A deep violet-900 for the base, giving depth
    ],
    // Fallback solid colors updated to match the new gradient
    fallbackWaveColor: 'rgb(192, 132, 252)', // purple-400
    fallbackProgressColor: 'rgba(34, 211, 238, 0.8)', // cyan-500
    // Minimap colors using the new palette
    minimap: {
      waveColor: 'rgba(192, 132, 252, 0.5)',
      progressColor: 'rgba(34, 211, 238, 0.8)',
    },
    hover: {
      lineColor: 'rgba(255, 255, 255, 0.7)',
      labelBackground: 'rgba(24, 24, 27, 0.85)',
      labelColor: '#f0f0f0',
      labelSize: '11px',
    },
  },
  meter: {
    // Corrected structure: both `left` and `right` have the same gradient values
    left: {
      start: 'rgba(192, 132, 252, 0.6)', // The core purple color
      end: 'rgba(34, 211, 238, 0.9)', // The highlight cyan color
    },
    right: {
      start: 'rgba(192, 132, 252, 0.6)', // The core purple color
      end: 'rgba(34, 211, 238, 0.9)', // The highlight cyan color
    },
    barWidthFraction: 0.5, // Made the bars slightly thinner for a sleeker look
  },
} as const;

export type AudioTheme = typeof AUDIO_THEME;
