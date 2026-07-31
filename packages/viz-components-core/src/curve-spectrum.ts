import type {
  VizComponentImplementation,
  VizRenderCircleNode,
  VizRenderGroupNode,
  VizRenderPolylineNode,
  VizRenderRectNode,
  VizRenderTextNode,
} from '@viz-engine/contracts';
import { curveSpectrumAuthoring } from './authoring/curve-spectrum.js';
import { asNumber, asString } from './shared.js';

type Point = { x: number; y: number };

const asNumberArray = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is number => typeof entry === 'number');
  }

  if (value instanceof Uint8Array) {
    return Array.from(value);
  }

  return [];
};

const computeFrequencyPoints = ({
  width,
  height,
  minFrequency,
  maxFrequency,
  spectrum,
  sampleRate,
  scaleY,
  smoothing,
}: {
  width: number;
  height: number;
  minFrequency: number;
  maxFrequency: number;
  spectrum: number[];
  sampleRate: number;
  scaleY: number;
  smoothing: boolean;
}): Point[] => {
  if (spectrum.length === 0 || width <= 0 || height <= 0) {
    return [];
  }

  const points: Point[] = [];
  const freqRatio = Math.max(1.0001, maxFrequency / Math.max(minFrequency, 1));
  const nyquist = Math.max(sampleRate / 2, 1);
  const indexScale = spectrum.length / nyquist;

  let lastY = height;

  for (let x = 0; x < width; x += 1) {
    const freq = minFrequency * Math.pow(freqRatio, x / width);
    const index = Math.min(spectrum.length - 1, Math.floor(freq * indexScale));
    const value = spectrum[index] ?? 0;
    const normalized = (value / 255) * height * scaleY;
    const y = height - normalized;

    if (smoothing) {
      if (lastY !== y) {
        points.push({ x, y });
      }
      lastY = y;
    } else {
      points.push({ x, y });
    }
  }

  return points;
};

export const curveSpectrumComponent: VizComponentImplementation = {
  id: 'curve-spectrum',
  name: 'Curve Spectrum',
  rendererFamily: 'three',
  implementationVersion: '1.0.0',
  authoring: curveSpectrumAuthoring,
  description: 'Runtime-rendered port of the V1 curve spectrum visual.',
  inputs: [
    {
      key: 'spectrum',
      label: 'Spectrum Data',
      supportedSources: ['literal'],
      runtimeBinding: 'audio.frequency-data',
      required: true,
    },
    {
      key: 'sampleRate',
      label: 'Sample Rate',
      supportedSources: ['literal'],
      runtimeBinding: 'audio.sample-rate',
      required: true,
    },
    {
      key: 'fftSize',
      label: 'FFT Size',
      supportedSources: ['literal'],
      runtimeBinding: 'audio.fft-size',
      required: true,
    },
  ],
  render: ({ viewport, layer, settings, resolvedInputs }) => {
    const appearance = (settings.appearance ?? {}) as Record<string, unknown>;
    const grid = (settings.grid ?? {}) as Record<string, unknown>;
    const line = (settings.line ?? {}) as Record<string, unknown>;
    const points = (settings.points ?? {}) as Record<string, unknown>;

    const spectrum = asNumberArray(resolvedInputs.spectrum?.value);
    const sampleRate = Math.max(
      1,
      asNumber(resolvedInputs.sampleRate?.value, 44100),
    );
    asNumber(resolvedInputs.fftSize?.value, 2048);

    const scaleY = Math.max(0, asNumber(appearance.scaleY, 0.8));
    const minFrequency = Math.max(20, asNumber(appearance.minFrequency, 20));
    const maxFrequency = Math.max(
      minFrequency + 1,
      asNumber(appearance.maxFrequency, 22050),
    );
    const smoothing = Boolean(line.smoothing ?? true);
    const lineColor = asString(line.color, '#ffffff');
    const lineThickness = Math.max(0, asNumber(line.thickness, 1));
    const pointColor = asString(points.pointColor, '#ffffff');
    const pointSize = Math.max(0, asNumber(points.pointSize, 3));
    const gridColor = asString(grid.color, 'rgba(204, 204, 204, 0.5)');
    const freqLines = Math.max(0, Math.floor(asNumber(grid.freqLines, 10)));
    const ampLines = Math.max(0, Math.floor(asNumber(grid.ampLines, 5)));

    const children: VizRenderGroupNode['children'] = [];

    for (let i = 0; i <= freqLines; i += 1) {
      const x = (viewport.width * i) / Math.max(freqLines, 1);
      const frequency =
        minFrequency *
        Math.pow(maxFrequency / minFrequency, i / Math.max(freqLines, 1));
      children.push({
        kind: 'rect',
        id: `${layer.id}-freq-line-${i}`,
        x,
        y: 0,
        width: 1,
        height: viewport.height,
        style: {
          fill: gridColor,
          opacity: 0.5,
        },
      } satisfies VizRenderRectNode);
      children.push({
        kind: 'text',
        id: `${layer.id}-freq-label-${i}`,
        x: x + 5,
        y: viewport.height - 5,
        text: `${Math.round(frequency)} Hz`,
        fontSize: 10,
        style: {
          fill: gridColor,
        },
      } satisfies VizRenderTextNode);
    }

    for (let i = 0; i <= ampLines; i += 1) {
      const y = viewport.height - (i * viewport.height) / Math.max(ampLines, 1);
      children.push({
        kind: 'rect',
        id: `${layer.id}-amp-line-${i}`,
        x: 0,
        y,
        width: viewport.width,
        height: 1,
        style: {
          fill: gridColor,
          opacity: 0.5,
        },
      } satisfies VizRenderRectNode);
      children.push({
        kind: 'text',
        id: `${layer.id}-amp-label-${i}`,
        x: 5,
        y: y + 15,
        text: `${Math.round((i / Math.max(ampLines, 1)) * 100 * scaleY)}%`,
        fontSize: 10,
        style: {
          fill: gridColor,
        },
      } satisfies VizRenderTextNode);
    }

    const spectrumPoints = computeFrequencyPoints({
      width: viewport.width,
      height: viewport.height,
      minFrequency,
      maxFrequency,
      spectrum,
      sampleRate,
      scaleY,
      smoothing,
    });

    if (lineThickness > 0) {
      children.push({
        kind: 'polyline',
        id: `${layer.id}-curve`,
        points: spectrumPoints,
        lineCap: 'round',
        lineJoin: 'round',
        style: {
          stroke: lineColor,
          strokeWidth: lineThickness,
        },
      } satisfies VizRenderPolylineNode);
    }

    if (pointSize > 0) {
      children.push(
        ...spectrumPoints.map(
          (point, index) =>
            ({
              kind: 'circle',
              id: `${layer.id}-point-${index}`,
              cx: point.x,
              cy: point.y,
              r: pointSize,
              style: {
                fill: pointColor,
              },
            }) satisfies VizRenderCircleNode,
        ),
      );
    }

    return {
      kind: 'group',
      id: layer.id,
      children,
    } satisfies VizRenderGroupNode;
  },
};
