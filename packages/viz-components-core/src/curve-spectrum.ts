import type {
  VizComponentImplementation,
  VizRenderGroupNode,
  VizRenderPointCloudNode,
  VizRenderPolygonNode,
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
}: {
  width: number;
  height: number;
  minFrequency: number;
  maxFrequency: number;
  spectrum: number[];
  sampleRate: number;
  scaleY: number;
}): Point[] => {
  if (spectrum.length === 0 || width <= 0 || height <= 0) {
    return [];
  }

  const points: Point[] = [];
  const freqRatio = Math.max(1.0001, maxFrequency / Math.max(minFrequency, 1));
  const nyquist = Math.max(sampleRate / 2, 1);
  const indexScale = spectrum.length / nyquist;
  const sampleCount = Math.min(Math.ceil(width), spectrum.length);

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const x =
      sampleCount === 1 ? 0 : (sampleIndex / (sampleCount - 1)) * (width - 1);
    const freq = minFrequency * Math.pow(freqRatio, x / width);
    const index = Math.min(spectrum.length - 1, Math.floor(freq * indexScale));
    const value = spectrum[index] ?? 0;
    const normalized = (value / 255) * height * scaleY;
    const y = height - normalized;

    points.push({ x, y });
  }

  return points;
};

const createQuadraticCurvePoints = (points: Point[]): Point[] => {
  if (points.length < 2) {
    return points;
  }

  const curve: Point[] = [points[0]!];
  let start = points[0]!;
  const subdivisions = 2;

  for (let index = 0; index < points.length - 1; index += 1) {
    const control = points[index]!;
    const next = points[index + 1]!;
    const end = {
      x: (control.x + next.x) / 2,
      y: (control.y + next.y) / 2,
    };
    for (let step = 1; step <= subdivisions; step += 1) {
      const t = step / subdivisions;
      const inverse = 1 - t;
      curve.push({
        x:
          inverse * inverse * start.x +
          2 * inverse * t * control.x +
          t * t * end.x,
        y:
          inverse * inverse * start.y +
          2 * inverse * t * control.y +
          t * t * end.y,
      });
    }
    start = end;
  }

  return curve;
};

const createCurveArea = (
  curvePoints: Point[],
  baselineY: number,
): {
  points: Point[];
  triangleIndices: number[];
} => {
  const pointCount = curvePoints.length;
  const baselinePoints = curvePoints
    .toReversed()
    .map((point) => ({ x: point.x, y: baselineY }));
  const indices: number[] = [];

  for (let index = 0; index < pointCount - 1; index += 1) {
    const nextIndex = index + 1;
    const baselineIndex = pointCount * 2 - 1 - index;
    const nextBaselineIndex = baselineIndex - 1;
    indices.push(
      index,
      baselineIndex,
      nextIndex,
      nextIndex,
      baselineIndex,
      nextBaselineIndex,
    );
  }

  return {
    points: [...curvePoints, ...baselinePoints],
    triangleIndices: indices,
  };
};

export const curveSpectrumComponent: VizComponentImplementation = {
  id: 'curve-spectrum',
  name: 'Curve Spectrum',
  rendererFamily: 'three',
  implementationVersion: '1.0.0',
  authoring: curveSpectrumAuthoring,
  description: 'Curve visualization of the audio spectrum.',
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
    const gradientHeight = Math.min(
      1,
      Math.max(0, asNumber(line.gradientHeight, 0.8)),
    );
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
    });
    const curvePoints = smoothing
      ? createQuadraticCurvePoints(spectrumPoints)
      : spectrumPoints;

    if (lineThickness > 0 && gradientHeight > 0 && curvePoints.length > 1) {
      const curveArea = createCurveArea(curvePoints, viewport.height + 5);
      children.push({
        kind: 'polygon',
        id: `${layer.id}-curve-area`,
        points: curveArea.points,
        triangleIndices: curveArea.triangleIndices,
        fillGradient: {
          from: { x: 0, y: viewport.height },
          to: {
            x: 0,
            y: viewport.height - gradientHeight * viewport.height,
          },
          stops: [
            { offset: 0, color: 'transparent' },
            { offset: 1, color: lineColor, opacity: 0.5 },
          ],
        },
      } satisfies VizRenderPolygonNode);
    }

    if (lineThickness > 0) {
      children.push({
        kind: 'polyline',
        id: `${layer.id}-curve`,
        points: curvePoints,
        lineCap: 'round',
        lineJoin: 'round',
        style: {
          stroke: lineColor,
          strokeWidth: lineThickness,
        },
      } satisfies VizRenderPolylineNode);
    }

    if (pointSize > 0) {
      children.push({
        kind: 'point-cloud',
        id: `${layer.id}-points`,
        points: spectrumPoints,
        radius: pointSize,
        style: {
          fill: pointColor,
        },
      } satisfies VizRenderPointCloudNode);
    }

    return {
      kind: 'group',
      id: layer.id,
      children,
    } satisfies VizRenderGroupNode;
  },
};
