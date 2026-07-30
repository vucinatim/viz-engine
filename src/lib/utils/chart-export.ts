// Chart Export Utility
// Renders charts in offscreen canvas and exports as PNG

import { destructureParameterId } from '@/lib/id-utils';
import type { RecordingSession } from '@/lib/stores/performance-recorder-types';
import JSZip from 'jszip';

export interface ChartExportOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  title?: string;
  subtitle?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  fontSize?: number;
  titleFontSize?: number;
  padding?: number;
}

export interface ChartData {
  timeSeries: Array<{
    time: number;
    fps: number;
    avgFps: number;
    memory: number;
    frameBudget: number;
    layers: number;
    nodeNetworks: number;
  }>;
  layerPerformance: Array<{
    name: string;
    avgRenderTime: number;
    maxRenderTime: number;
    avgDrawCalls: number;
  }>;
  nodeNetworkPerformance: Array<{
    name: string;
    avgComputeTime: number;
    maxComputeTime: number;
    nodeCount: number;
  }>;
}

// Default export options
const DEFAULT_OPTIONS: Required<ChartExportOptions> = {
  width: 1200,
  height: 600,
  backgroundColor: 'white', // Changed to white background for better visibility
  title: '',
  subtitle: '',
  showLegend: true,
  showGrid: true,
  showAxes: true,
  fontSize: 18, // Increased from 12 for better readability
  titleFontSize: 28, // Increased from 16 for more prominent titles
  padding: 100, // Increased from 80 to accommodate larger text
};

// Create offscreen canvas
function createOffscreenCanvas(width: number, height: number): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  return canvas;
}

// Get canvas context with proper settings
function getCanvasContext(
  canvas: OffscreenCanvas,
): OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from offscreen canvas');
  }

  // Enable high DPI rendering
  const dpr = window.devicePixelRatio || 1;
  const rect = { width: canvas.width, height: canvas.height };

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  return ctx;
}

// Draw background
function drawBackground(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundColor: string,
) {
  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }
  // For transparent background, we don't draw anything
}

// Draw title and subtitle
function drawTitle(
  ctx: OffscreenCanvasRenderingContext2D,
  title: string,
  subtitle: string,
  width: number,
  padding: number,
  titleFontSize: number,
  fontSize: number,
) {
  if (!title && !subtitle) return;

  ctx.fillStyle = '#111827'; // Dark text for light mode compatibility
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (title) {
    ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.fillText(title, width / 2, padding);
  }

  if (subtitle) {
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.fillText(
      subtitle,
      width / 2,
      padding + (title ? titleFontSize + 12 : 0),
    );
  }
}

// Draw grid with proper data bounds
function drawGrid(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number,
  dataMin: number,
  dataMax: number,
  isHorizontal: boolean = true,
) {
  ctx.strokeStyle = '#6b7280'; // Even darker gray for better visibility
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);

  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding - 80; // Account for larger title space

  if (isHorizontal) {
    // Horizontal grid lines with proper data scaling
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = padding + 80 + (chartHeight * i) / steps;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }
  } else {
    // Vertical grid lines
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const x = padding + (chartWidth * i) / steps;
      ctx.beginPath();
      ctx.moveTo(x, padding + 80);
      ctx.lineTo(x, padding + 80 + chartHeight);
      ctx.stroke();
    }
  }

  ctx.setLineDash([]);
}

// Draw legend
function drawLegend(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number,
  legendItems: Array<{ label: string; color: string; lineWidth?: number }>,
  fontSize: number,
) {
  if (legendItems.length === 0) return;

  const legendX = width - padding - 250; // Position legend on the right, more space for larger text
  const legendY = padding + 20;
  const itemHeight = fontSize + 12; // Increased spacing between legend items
  const lineLength = 25; // Longer lines for better visibility

  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  legendItems.forEach((item, index) => {
    const y = legendY + index * itemHeight;

    // Draw colored line/box
    if (item.lineWidth) {
      // For line charts
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.lineWidth;
      ctx.beginPath();
      ctx.moveTo(legendX, y);
      ctx.lineTo(legendX + lineLength, y);
      ctx.stroke();
    } else {
      // For bar charts
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, y - 6, 12, 12);
    }

    // Draw label
    ctx.fillStyle = '#111827'; // Dark text for light mode
    ctx.fillText(item.label, legendX + lineLength + 12, y);
  });
}

// Draw axes with tick marks and labels
function drawAxes(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number,
  xLabel: string,
  yLabel: string,
  fontSize: number,
  xMin?: number,
  xMax?: number,
  yMin?: number,
  yMax?: number,
) {
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding - 80;

  ctx.strokeStyle = '#111827'; // Same color as title for consistency
  ctx.lineWidth = 2;
  ctx.fillStyle = '#111827'; // Same color as title for consistency
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // X-axis
  ctx.beginPath();
  ctx.moveTo(padding, padding + 80 + chartHeight);
  ctx.lineTo(padding + chartWidth, padding + 80 + chartHeight);
  ctx.stroke();

  // Y-axis
  ctx.beginPath();
  ctx.moveTo(padding, padding + 80);
  ctx.lineTo(padding, padding + 80 + chartHeight);
  ctx.stroke();

  // Draw tick marks and labels for Y-axis
  if (yMin !== undefined && yMax !== undefined) {
    const steps = 5;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

    for (let i = 0; i <= steps; i++) {
      const value = yMin + (yMax - yMin) * (i / steps);
      const y = padding + 80 + chartHeight - (chartHeight * i) / steps;

      // Draw tick mark
      ctx.beginPath();
      ctx.moveTo(padding - 5, y);
      ctx.lineTo(padding, y);
      ctx.stroke();

      // Draw label
      ctx.fillText(value.toFixed(1), padding - 10, y);
    }
  }

  // Draw tick marks and labels for X-axis
  if (xMin !== undefined && xMax !== undefined) {
    const steps = 6;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

    for (let i = 0; i <= steps; i++) {
      const value = xMin + (xMax - xMin) * (i / steps);
      const x = padding + (chartWidth * i) / steps;

      // Draw tick mark
      ctx.beginPath();
      ctx.moveTo(x, padding + 80 + chartHeight);
      ctx.lineTo(x, padding + 80 + chartHeight + 5);
      ctx.stroke();

      // Draw label
      ctx.fillText(value.toFixed(1), x, padding + 80 + chartHeight + 20);
    }
  }

  // Axis labels
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (xLabel) {
    ctx.fillText(
      xLabel,
      padding + chartWidth / 2,
      padding + 80 + chartHeight + 50,
    );
  }

  if (yLabel) {
    ctx.save();
    ctx.translate(padding - 80, padding + 80 + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }
}

// Draw line chart
function drawLineChart(
  ctx: OffscreenCanvasRenderingContext2D,
  data: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  padding: number,
  color: string,
  lineWidth: number = 2,
  xMin?: number,
  xMax?: number,
  yMin?: number,
  yMax?: number,
) {
  if (data.length < 2) return;

  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding - 80;

  // Use provided bounds or calculate from data
  const dataXValues = data.map((d) => d.x);
  const dataYValues = data.map((d) => d.y);
  const dataXMin = Math.min(...dataXValues);
  const dataXMax = Math.max(...dataXValues);
  const dataYMin = Math.min(...dataYValues);
  const dataYMax = Math.max(...dataYValues);

  const xMinPadded = xMin ?? dataXMin;
  const xMaxPadded = xMax ?? dataXMax;
  const yMinPadded = yMin ?? dataYMin;
  const yMaxPadded = yMax ?? dataYMax;

  // Draw line
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  data.forEach((point, index) => {
    const x =
      padding +
      ((point.x - xMinPadded) / (xMaxPadded - xMinPadded)) * chartWidth;
    const y =
      padding +
      80 +
      chartHeight -
      ((point.y - yMinPadded) / (yMaxPadded - yMinPadded)) * chartHeight;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
}

// Draw area chart
function drawAreaChart(
  ctx: OffscreenCanvasRenderingContext2D,
  data: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  padding: number,
  color: string,
  fillColor: string,
  xMin?: number,
  xMax?: number,
  yMin?: number,
  yMax?: number,
) {
  if (data.length < 2) return;

  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding - 80;

  // Use provided bounds or calculate from data
  const dataXValues = data.map((d) => d.x);
  const dataYValues = data.map((d) => d.y);
  const dataXMin = Math.min(...dataXValues);
  const dataXMax = Math.max(...dataXValues);
  const dataYMin = Math.min(...dataYValues);
  const dataYMax = Math.max(...dataYValues);

  const xMinPadded = xMin ?? dataXMin;
  const xMaxPadded = xMax ?? dataXMax;
  const yMinPadded = yMin ?? dataYMin;
  const yMaxPadded = yMax ?? dataYMax;

  // Create gradient for filled area
  const gradient = ctx.createLinearGradient(
    0,
    padding + 80,
    0,
    padding + 80 + chartHeight,
  );
  gradient.addColorStop(0, fillColor);
  gradient.addColorStop(1, 'transparent');

  ctx.fillStyle = gradient;
  ctx.beginPath();

  data.forEach((point, index) => {
    const x =
      padding +
      ((point.x - xMinPadded) / (xMaxPadded - xMinPadded)) * chartWidth;
    const y =
      padding +
      80 +
      chartHeight -
      ((point.y - yMinPadded) / (yMaxPadded - yMinPadded)) * chartHeight;

    if (index === 0) {
      ctx.moveTo(x, padding + 80 + chartHeight); // Start at bottom
      ctx.lineTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  // Close the area
  const lastPoint = data[data.length - 1];
  const lastX =
    padding +
    ((lastPoint.x - xMinPadded) / (xMaxPadded - xMinPadded)) * chartWidth;
  ctx.lineTo(lastX, padding + 80 + chartHeight);
  ctx.closePath();
  ctx.fill();

  // Draw line on top
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  data.forEach((point, index) => {
    const x =
      padding +
      ((point.x - xMinPadded) / (xMaxPadded - xMinPadded)) * chartWidth;
    const y =
      padding +
      80 +
      chartHeight -
      ((point.y - yMinPadded) / (yMaxPadded - yMinPadded)) * chartHeight;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
}

// Draw grouped bar chart for comparing two metrics
function drawGroupedBarChart(
  ctx: OffscreenCanvasRenderingContext2D,
  data: Array<{
    name: string;
    avgValue: number;
    maxValue: number;
  }>,
  width: number,
  height: number,
  padding: number,
  avgColor: string,
  maxColor: string,
) {
  if (data.length === 0) return;

  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding - 80;

  const groupWidth = (chartWidth / data.length) * 0.8; // Increased back to 0.8 for better bar width
  const groupSpacing = (chartWidth / data.length) * 0.2; // Reduced back to 0.2 for less gap
  const barWidth = groupWidth * 0.4; // Each bar takes 40% of group width
  const barSpacing = groupWidth * 0.2; // 20% spacing between bars in group

  // Find data bounds for both metrics
  const allValues = [
    ...data.map((d) => d.avgValue),
    ...data.map((d) => d.maxValue),
  ];
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const valueRange = maxValue - minValue;
  const paddedMax = maxValue + valueRange * 0.1;
  const paddedMin = Math.max(0, minValue - valueRange * 0.1);

  // Draw bars
  data.forEach((item, index) => {
    const groupX =
      padding + index * (groupWidth + groupSpacing) + groupSpacing / 2;

    // Draw average bar
    const avgBarHeight =
      ((item.avgValue - paddedMin) / (paddedMax - paddedMin)) * chartHeight;
    const avgY = padding + 80 + chartHeight - avgBarHeight;
    const avgX = groupX + barSpacing / 2;

    ctx.fillStyle = avgColor;
    ctx.fillRect(avgX, avgY, barWidth, avgBarHeight);

    // Draw max bar
    const maxBarHeight =
      ((item.maxValue - paddedMin) / (paddedMax - paddedMin)) * chartHeight;
    const maxY = padding + 80 + chartHeight - maxBarHeight;
    const maxX = groupX + barSpacing / 2 + barWidth + barSpacing;

    ctx.fillStyle = maxColor;
    ctx.fillRect(maxX, maxY, barWidth, maxBarHeight);

    // Draw value labels
    ctx.fillStyle = '#111827'; // Dark text for light mode
    ctx.font =
      '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Average value label
    ctx.fillText(item.avgValue.toFixed(1), avgX + barWidth / 2, avgY - 2);

    // Max value label
    ctx.fillText(item.maxValue.toFixed(1), maxX + barWidth / 2, maxY - 2);

    // Draw name label with multi-line support
    ctx.fillStyle = '#111827'; // Darker text for better visibility
    ctx.textBaseline = 'top';

    // Split long names into two lines
    const maxCharsPerLine = 12;
    const name = item.name;
    if (name.length > maxCharsPerLine) {
      let splitPoint = -1;

      // First, look for parentheses patterns like "(Neural Network)"
      const parenMatch = name.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (parenMatch) {
        const mainPart = parenMatch[1].trim();
        const parenPart = `(${parenMatch[2]})`;

        // If main part is short enough, split before parentheses
        if (mainPart.length <= maxCharsPerLine) {
          ctx.fillText(
            mainPart,
            groupX + groupWidth / 2,
            padding + 80 + chartHeight + 5,
          );
          ctx.fillText(
            parenPart,
            groupX + groupWidth / 2,
            padding + 80 + chartHeight + 25,
          );
        } else {
          // Main part is too long, use regular splitting
          const midPoint = Math.floor(name.length / 2);
          splitPoint = midPoint;

          // Find a good split point (space or dash)
          for (let i = 0; i < Math.min(6, name.length - midPoint); i++) {
            const char = name[midPoint + i];
            if (char === ' ' || char === '-' || char === '_') {
              splitPoint = midPoint + i;
              break;
            }
          }

          const line1 = name.substring(0, splitPoint).trim();
          const line2 = name.substring(splitPoint).trim();

          ctx.fillText(
            line1,
            groupX + groupWidth / 2,
            padding + 80 + chartHeight + 5,
          );
          ctx.fillText(
            line2,
            groupX + groupWidth / 2,
            padding + 80 + chartHeight + 25,
          );
        }
      } else {
        // No parentheses pattern, use regular splitting
        const midPoint = Math.floor(name.length / 2);
        splitPoint = midPoint;

        // Find a good split point (space or dash)
        for (let i = 0; i < Math.min(6, name.length - midPoint); i++) {
          const char = name[midPoint + i];
          if (char === ' ' || char === '-' || char === '_') {
            splitPoint = midPoint + i;
            break;
          }
        }

        const line1 = name.substring(0, splitPoint).trim();
        const line2 = name.substring(splitPoint).trim();

        ctx.fillText(
          line1,
          groupX + groupWidth / 2,
          padding + 80 + chartHeight + 5,
        );
        ctx.fillText(
          line2,
          groupX + groupWidth / 2,
          padding + 80 + chartHeight + 25,
        );
      }
    } else {
      ctx.fillText(
        name,
        groupX + groupWidth / 2,
        padding + 80 + chartHeight + 5,
      );
    }
  });
}

type ChartPoint = { x: number; y: number };
type GroupedChartItem = { name: string; avgValue: number; maxValue: number };

const exportTimeSeriesChart = async (
  session: RecordingSession,
  options: ChartExportOptions,
  definition: {
    title: string;
    yLabel: string;
    value: (snapshot: RecordingSession['snapshots'][number]) => number;
    stroke: string;
    fill: string;
    secondary?: {
      value: (snapshot: RecordingSession['snapshots'][number]) => number;
      stroke: string;
      legends: [string, string];
    };
  },
): Promise<Blob> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const canvas = createOffscreenCanvas(opts.width, opts.height);
  const ctx = getCanvasContext(canvas);
  const startTime = session.snapshots[0]?.timestamp || 0;
  const points = (value: typeof definition.value): ChartPoint[] =>
    session.snapshots.map((snapshot) => ({
      x: (snapshot.timestamp - startTime) / 1000,
      y: value(snapshot),
    }));
  const primary = points(definition.value);
  const secondary = definition.secondary
    ? points(definition.secondary.value)
    : undefined;
  const allPoints = secondary ? [...primary, ...secondary] : primary;
  const xMin = Math.min(...primary.map(({ x }) => x));
  const xMax = Math.max(...primary.map(({ x }) => x));
  const yMin = Math.min(...allPoints.map(({ y }) => y));
  const yMax = Math.max(...allPoints.map(({ y }) => y));

  drawBackground(ctx, opts.width, opts.height, opts.backgroundColor);
  drawTitle(
    ctx,
    opts.title || definition.title,
    `Session: ${session.name}`,
    opts.width,
    opts.padding,
    opts.titleFontSize,
    opts.fontSize,
  );
  if (opts.showGrid) {
    drawGrid(ctx, opts.width, opts.height, opts.padding, yMin, yMax, true);
  }
  if (opts.showAxes) {
    drawAxes(
      ctx,
      opts.width,
      opts.height,
      opts.padding,
      'Time (seconds)',
      definition.yLabel,
      opts.fontSize,
      xMin,
      xMax,
      yMin,
      yMax,
    );
  }
  if (primary.length > 0) {
    drawAreaChart(
      ctx,
      primary,
      opts.width,
      opts.height,
      opts.padding,
      definition.stroke,
      definition.fill,
      xMin,
      xMax,
      yMin,
      yMax,
    );
    if (secondary && definition.secondary) {
      drawLineChart(
        ctx,
        secondary,
        opts.width,
        opts.height,
        opts.padding,
        definition.secondary.stroke,
        2,
        xMin,
        xMax,
        yMin,
        yMax,
      );
      if (opts.showLegend) {
        drawLegend(
          ctx,
          opts.width,
          opts.height,
          opts.padding,
          [
            {
              label: definition.secondary.legends[0],
              color: definition.stroke,
            },
            {
              label: definition.secondary.legends[1],
              color: definition.secondary.stroke,
            },
          ],
          opts.fontSize,
        );
      }
    }
  }
  return canvas.convertToBlob({ type: 'image/png' });
};

const exportGroupedChart = async (
  session: RecordingSession,
  options: ChartExportOptions,
  data: GroupedChartItem[],
  definition: {
    title: string;
    xLabel: string;
    yLabel: string;
    colors: [string, string];
    legends: [string, string];
  },
): Promise<Blob> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const canvas = createOffscreenCanvas(opts.width, opts.height);
  const ctx = getCanvasContext(canvas);
  const values = data.flatMap(({ avgValue, maxValue }) => [avgValue, maxValue]);

  drawBackground(ctx, opts.width, opts.height, opts.backgroundColor);
  drawTitle(
    ctx,
    opts.title || definition.title,
    `Session: ${session.name}`,
    opts.width,
    opts.padding,
    opts.titleFontSize,
    opts.fontSize,
  );
  if (opts.showGrid) {
    drawGrid(ctx, opts.width, opts.height, opts.padding, 0, 1, true);
  }
  if (opts.showAxes) {
    drawAxes(
      ctx,
      opts.width,
      opts.height,
      opts.padding,
      definition.xLabel,
      definition.yLabel,
      opts.fontSize,
      undefined,
      undefined,
      Math.min(...values),
      Math.max(...values),
    );
  }
  if (data.length > 0) {
    drawGroupedBarChart(
      ctx,
      data,
      opts.width,
      opts.height,
      opts.padding,
      ...definition.colors,
    );
    if (opts.showLegend) {
      drawLegend(
        ctx,
        opts.width,
        opts.height,
        opts.padding,
        definition.legends.map((label, index) => ({
          label,
          color: definition.colors[index]!,
        })),
        opts.fontSize,
      );
    }
  }
  return canvas.convertToBlob({ type: 'image/png' });
};

export const exportFPSChart = (
  session: RecordingSession,
  options: ChartExportOptions = {},
): Promise<Blob> =>
  exportTimeSeriesChart(session, options, {
    title: 'FPS Performance Over Time',
    yLabel: 'FPS',
    value: (snapshot) => snapshot.editorFPS,
    stroke: '#059669',
    fill: '#10b98140',
    secondary: {
      value: (snapshot) => snapshot.editorAvgFPS,
      stroke: '#2563eb',
      legends: ['Current FPS', 'Rolling Average'],
    },
  });

export const exportMemoryChart = (
  session: RecordingSession,
  options: ChartExportOptions = {},
): Promise<Blob> =>
  exportTimeSeriesChart(session, options, {
    title: 'Memory Usage Over Time',
    yLabel: 'Memory (MB)',
    value: (snapshot) => snapshot.memoryUsedMB,
    stroke: '#7c3aed',
    fill: '#8b5cf640',
  });

export const exportFrameBudgetChart = (
  session: RecordingSession,
  options: ChartExportOptions = {},
): Promise<Blob> =>
  exportTimeSeriesChart(session, options, {
    title: 'Frame Budget Usage Over Time',
    yLabel: 'Frame Budget (%)',
    value: (snapshot) => snapshot.cpuUsage,
    stroke: '#ea580c',
    fill: '#f9731640',
  });

export const exportLayerPerformanceChart = (
  session: RecordingSession,
  options: ChartExportOptions = {},
): Promise<Blob> => {
  const layers = new Map<string, number[]>();
  for (const snapshot of session.snapshots) {
    for (const layer of snapshot.layers) {
      const times = layers.get(layer.layerId) ?? [];
      times.push(layer.renderTime);
      layers.set(layer.layerId, times);
    }
  }
  const data = Array.from(layers, ([layerId, times]) => ({
    name:
      session.snapshots[0]?.layers.find((layer) => layer.layerId === layerId)
        ?.layerName ?? layerId,
    avgValue: times.reduce((sum, value) => sum + value, 0) / times.length,
    maxValue: Math.max(...times),
  }));
  return exportGroupedChart(session, options, data, {
    title: 'Layer Performance Breakdown',
    xLabel: 'Layer',
    yLabel: 'Render Time (ms)',
    colors: ['#2563eb', '#dc2626'],
    legends: ['Average Render Time', 'Maximum Render Time'],
  });
};

export const exportNodeNetworkPerformanceChart = (
  session: RecordingSession,
  options: ChartExportOptions = {},
): Promise<Blob> => {
  const networks = new Map<string, number[]>();
  for (const snapshot of session.snapshots) {
    for (const network of snapshot.nodeNetworks) {
      const times = networks.get(network.parameterId) ?? [];
      times.push(network.computeTime);
      networks.set(network.parameterId, times);
    }
  }
  const data = Array.from(networks, ([parameterId, times]) => {
    const { displayName, componentName } = destructureParameterId(parameterId);
    return {
      name: `${displayName} (${componentName})`,
      avgValue: times.reduce((sum, value) => sum + value, 0) / times.length,
      maxValue: Math.max(...times),
    };
  });
  return exportGroupedChart(session, options, data, {
    title: 'Node Network Computation Time',
    xLabel: 'Parameter',
    yLabel: 'Compute Time (ms)',
    colors: ['#059669', '#dc2626'],
    legends: ['Average Compute Time', 'Maximum Compute Time'],
  });
};

// Download blob as file
export function downloadChartAsPNG(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Export all charts as a ZIP file
export async function exportAllChartsAsZip(
  session: RecordingSession,
  options: ChartExportOptions = {},
): Promise<Blob> {
  const zip = new JSZip();

  // Create a folder for the charts
  const chartsFolder = zip.folder('charts');

  if (!chartsFolder) {
    throw new Error('Failed to create charts folder in ZIP');
  }

  // Export all chart types
  const chartExports = [
    {
      name: 'fps_performance',
      exportFn: () => exportFPSChart(session, options),
    },
    {
      name: 'memory_usage',
      exportFn: () => exportMemoryChart(session, options),
    },
    {
      name: 'frame_budget',
      exportFn: () => exportFrameBudgetChart(session, options),
    },
    {
      name: 'layer_performance',
      exportFn: () => exportLayerPerformanceChart(session, options),
    },
    {
      name: 'node_network_performance',
      exportFn: () => exportNodeNetworkPerformanceChart(session, options),
    },
  ];

  // Generate all charts and add to ZIP
  for (const chart of chartExports) {
    try {
      const blob = await chart.exportFn();
      const filename = `${session.name.replace(/[^a-z0-9]/gi, '_')}_${chart.name}.png`;
      chartsFolder.file(filename, blob);
    } catch (error) {
      console.warn(`Failed to export ${chart.name} chart:`, error);
      // Continue with other charts even if one fails
    }
  }

  // Add a README file with information about the charts
  const readmeContent = `Performance Charts Export
Session: ${session.name}
Generated: ${new Date().toISOString()}

Charts included:
- fps_performance.png: FPS performance over time
- memory_usage.png: Memory usage over time  
- frame_budget.png: Frame budget usage over time
- layer_performance.png: Layer performance breakdown
- node_network_performance.png: Node network computation time

Each chart is exported as a high-resolution PNG image suitable for reports and documentation.
`;

  zip.file('README.txt', readmeContent);

  // Generate the ZIP file
  return await zip.generateAsync({ type: 'blob' });
}

// Download ZIP file
export function downloadAllChartsAsZip(blob: Blob, sessionName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sessionName.replace(/[^a-z0-9]/gi, '_')}_all_charts.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
