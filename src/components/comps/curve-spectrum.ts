import { gradient } from '@/lib/comp-utils/gradient';
import Color from 'color';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';

const commonSettingsConfig = v.group(
  {
    label: 'Scaling Settings',
    description: 'Settings related to scaling and frequency display',
  },
  {
    scaleY: v.number({
      label: 'Y Scale',
      description: 'Scale factor for amplitude visualization',
      defaultValue: 0.8,
      step: 0.1,
      min: 0,
      max: 1,
    }),
    minFrequency: v.number({
      label: 'Min Frequency',
      description: 'Minimum frequency displayed',
      defaultValue: 20,
      step: 1,
      min: 20,
      max: 22050,
    }),
    maxFrequency: v.number({
      label: 'Max Frequency',
      description: 'Maximum frequency displayed',
      defaultValue: 22050,
      step: 1,
      min: 20,
      max: 22050,
    }),
  },
);

const gridSettingsConfig = v.group(
  {
    label: 'Grid Settings',
    description: 'Settings for the grid lines',
  },
  {
    color: v.color({
      label: 'Color',
      description: 'Color of the grid lines',
      defaultValue: '#ccc',
    }),
    freqLines: v.number({
      label: 'Frequency Lines',
      description: 'Number of frequency lines',
      defaultValue: 10,
      step: 1,
      min: 0,
      max: 50,
    }),
    ampLines: v.number({
      label: 'Amplitude Lines',
      description: 'Number of amplitude lines',
      defaultValue: 5,
      step: 1,
      min: 0,
      max: 10,
    }),
  },
);

const lineSettingsConfig = v.group(
  {
    label: 'Line Settings',
    description: 'Settings for the curve',
  },
  {
    smoothing: v.toggle({
      label: 'Smoothing',
      description: 'Apply smoothing to the audio data',
      defaultValue: true,
    }),
    color: v.color({
      label: 'Line Color',
      description: 'Color of the curve',
      defaultValue: 'white',
    }),
    thickness: v.number({
      label: 'Line Thickness',
      description: 'Thickness of the curve',
      defaultValue: 1,
      step: 1,
      min: 0,
      max: 10,
    }),
    gradientHeight: v.number({
      label: 'Gradient Height',
      description: 'Height of the gradient',
      defaultValue: 0.8,
      step: 0.1,
      min: 0,
      max: 1,
    }),
  },
);

const pointSettingsConfig = v.group(
  {
    label: 'Point Settings',
    description: 'Settings for the points',
  },
  {
    pointColor: v.color({
      label: 'Point Color',
      description: 'Color of the points',
      defaultValue: 'white',
    }),
    pointSize: v.number({
      label: 'Point Size',
      description: 'Size of the points',
      defaultValue: 3,
      step: 1,
      min: 0,
      max: 10,
    }),
  },
);

const CurveSpectrum = createComponent({
  name: 'Curve Spectrum',
  description: 'Curve visualization of audio spectrum',
  config: v.config({
    appearance: commonSettingsConfig,
    grid: gridSettingsConfig,
    line: lineSettingsConfig,
    points: pointSettingsConfig,
  }),
  presets: [
    {
      name: 'Default',
      values: {
        appearance: {
          scaleY: 0.8,
          minFrequency: 20,
          maxFrequency: 20000,
        },
        grid: {
          color: Color('#ccc').alpha(0.5).string(),
          freqLines: 10,
          ampLines: 5,
        },
        line: {
          smoothing: true,
          color: '#ffffff',
          thickness: 1,
          gradientHeight: 0.8,
        },
        points: {
          pointColor: '#ffffff',
          pointSize: 3,
        },
      },
    },
    {
      name: 'Neon',
      values: {
        appearance: {
          scaleY: 0.8,
          minFrequency: 20,
          maxFrequency: 22050,
        },
        grid: {
          color: Color('#ccc').alpha(0.2).string(),
          freqLines: 10,
          ampLines: 5,
        },
        line: {
          smoothing: true,
          color: '#ff41ca',
          thickness: 2,
          gradientHeight: 0.8,
        },
        points: {
          pointColor: '#ffffff',
          pointSize: 0,
        },
      },
    },
    {
      name: 'Matrix',
      values: {
        appearance: {
          scaleY: 0.7,
          minFrequency: 30,
          maxFrequency: 16000,
        },
        grid: {
          color: Color('#00ff00').alpha(0.5).string(),
          freqLines: 6,
          ampLines: 3,
        },
        line: {
          smoothing: false,
          color: '#00ff00',
          thickness: 0,
          gradientHeight: 1.0,
        },
        points: {
          pointColor: '#00ff00',
          pointSize: 1,
        },
      },
    },
  ],
  draw: ({
    canvasCtx: ctx,
    audioData: { dataArray, analyzer },
    config: {
      appearance: { scaleY, minFrequency, maxFrequency },
      grid: gridSettings,
      line: lineSettings,
      points: pointSettings,
    },
  }) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.clearRect(0, 0, width, height); // Clear the canvas

    const drawCtx: DrawContext = { ctx, width, height };

    drawFrequencyGridLines(
      drawCtx,
      { numLines: gridSettings.freqLines, color: gridSettings.color },
      minFrequency,
      maxFrequency,
    );
    drawAmplitudeGridLines(
      drawCtx,
      { numLines: gridSettings.ampLines, color: gridSettings.color },
      scaleY,
    );

    const points = computeFrequencyPoints(
      width,
      height,
      minFrequency,
      maxFrequency,
      dataArray,
      analyzer,
      scaleY,
      lineSettings.smoothing,
    );

    drawCurve(drawCtx, {
      points,
      color: lineSettings.color,
      thickness: lineSettings.thickness,
      gradientHeight: lineSettings.gradientHeight,
    });
    drawPoints(drawCtx, {
      points,
      color: pointSettings.pointColor,
      size: pointSettings.pointSize,
    });
  },
});

export default CurveSpectrum;

function computeFrequencyPoints(
  width: number,
  height: number,
  minFrequency: number,
  maxFrequency: number,
  dataArray: Uint8Array,
  analyzer: AnalyserNode,
  scaleY: number,
  smoothing: boolean,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const freqRatio = maxFrequency / minFrequency;
  const indexScale = dataArray.length / (analyzer.context.sampleRate / 2);

  let lastY = height;
  for (let i = 0; i < width; i++) {
    const freq = minFrequency * Math.pow(freqRatio, i / width);
    const index = Math.floor(freq * indexScale);
    const value = dataArray[Math.min(index, dataArray.length - 1)];
    const normalized = (value / 255) * height * scaleY;
    const y = height - normalized;

    if (smoothing) {
      if (lastY !== y) {
        points.push({ x: i, y });
      }
      lastY = y;
    } else {
      points.push({ x: i, y });
    }
  }
  return points;
}

interface DrawContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

interface GridLineConfig {
  numLines: number;
  color: string;
}

function drawFrequencyGridLines(
  { ctx, width, height }: DrawContext,
  { numLines, color }: GridLineConfig,
  minFrequency: number,
  maxFrequency: number,
): void {
  ctx.save();
  const logMinFreq = Math.log10(minFrequency);
  const logMaxFreq = Math.log10(maxFrequency);
  const logFreqRange = logMaxFreq - logMinFreq;

  for (let i = 0; i <= numLines; i++) {
    const logFreq = logMinFreq + (logFreqRange * i) / numLines;
    const freq = Math.pow(10, logFreq);
    const x = (width * (logFreq - logMinFreq)) / logFreqRange;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillText(`${Math.round(freq)} Hz`, x + 5, height - 5);
  }
  ctx.restore();
}

function drawAmplitudeGridLines(
  { ctx, width, height }: DrawContext,
  { numLines, color }: GridLineConfig,
  scaleY: number,
): void {
  ctx.save();
  for (let i = 0; i <= numLines; i++) {
    const y = height - (i * height) / numLines;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillText(`${Math.round((i / numLines) * 100 * scaleY)}%`, 5, y + 15);
  }
  ctx.restore();
}

interface CurveConfig {
  points: { x: number; y: number }[];
  color: string;
  thickness: number;
  gradientHeight: number;
}

function drawCurve(
  { ctx, height }: DrawContext,
  { points, color, thickness, gradientHeight }: CurveConfig,
): void {
  if (thickness === 0) return;

  ctx.save();

  if (points.length > 1) {
    // Create the path for the curve
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    // Close the path at the bottom
    ctx.lineTo(points[points.length - 1].x + 5, height + 5);
    ctx.lineTo(points[0].x - 5, height + 5);
    ctx.closePath();

    // Apply gradient fill
    ctx.fillStyle = gradient(ctx, {
      x0: 0,
      y0: height,
      x1: 0,
      y1: height - gradientHeight * height,
      stops: [
        { offset: 0, color: 'transparent' }, // Ensuring color fades to transparent
        { offset: 1, color: Color(color).alpha(0.5).string() },
      ],
    });
    ctx.fill();

    // Stroke the path to draw the curve
    ctx.lineWidth = thickness;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  ctx.restore();
}

interface PointConfig {
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

function drawPoints(
  { ctx }: DrawContext,
  { points, color, size }: PointConfig,
): void {
  ctx.save();
  points.forEach((point) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, 2 * Math.PI);
    ctx.fill();
  });
  ctx.restore();
}
