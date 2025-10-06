import {
  BaseConfigOption,
  ButtonConfigOption,
  GroupConfigOption,
} from '@/components/config/config';
import {
  UnknownConfig,
  UnknownConfigValues,
} from '@/components/config/create-component';
import React, { useCallback, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { calculateAudioLevel } from '../comp-utils/audio-utils';

function useDebug(
  debugCanvasRef: React.RefObject<HTMLCanvasElement>,
  resolutionMultiplier: number = 1,
) {
  // High-precision timing for FPS estimation
  const prevTsRef = useRef<number | null>(null);
  const smoothedFpsRef = useRef(0);
  const contentHeightRef = useRef(0);

  // Enhances the given draw function with debugging
  const withDebug = useCallback(
    (
      drawFunction: Function,
      {
        wavesurfer,
        dataArray,
        config,
        configSchema,
      }: {
        wavesurfer: WaveSurfer | null;
        dataArray: Uint8Array;
        config: UnknownConfigValues;
        configSchema: UnknownConfig;
      },
    ) => {
      const drawStart = performance.now();
      drawFunction(); // Execute the original draw function
      const drawEnd = performance.now();

      // Instantaneous FPS from consecutive calls; smooth with EMA
      const nowTs = performance.now();
      if (prevTsRef.current !== null) {
        const instFps = 1000 / Math.max(0.0001, nowTs - prevTsRef.current);
        const alpha = 0.15; // smoothing factor
        smoothedFpsRef.current =
          smoothedFpsRef.current === 0
            ? instFps
            : smoothedFpsRef.current * (1 - alpha) + instFps * alpha;
      }
      prevTsRef.current = nowTs;

      // Prepare debug information
      const debugInfo = {
        fps: smoothedFpsRef.current,
        currentTime: wavesurfer?.getCurrentTime() || 0,
        currentLevel: calculateAudioLevel(dataArray),
        lastFrameTime: drawEnd - drawStart,
      };

      // Render debug overlay if debug canvas is available
      if (debugCanvasRef.current) {
        const totalHeight = renderDebugOverlay(
          debugCanvasRef.current,
          config,
          configSchema,
          debugInfo,
          resolutionMultiplier,
        );

        // Adjust canvas height to fit content exactly
        if (debugCanvasRef.current.height !== totalHeight) {
          contentHeightRef.current = totalHeight;
          debugCanvasRef.current.height = totalHeight;
        }
      }
    },
    [debugCanvasRef, resolutionMultiplier],
  );

  return withDebug;
}

export default useDebug;

// Helper functions for rendering different value types
type RenderContext = {
  ctx: CanvasRenderingContext2D;
  valueX: number;
  yOffset: number;
  lineHeight: number;
  debugWidth: number;
  padding: number;
};

type RenderResult = {
  yOffset: number;
  shouldContinue: boolean;
};

const renderBoolean = (
  value: boolean,
  context: RenderContext,
): RenderResult => {
  const { ctx, valueX, yOffset, lineHeight } = context;
  const indicator = value ? '●' : '○';
  ctx.font = '18px monospace';
  ctx.fillStyle = value ? '#00ff88' : '#ff4444';
  ctx.fillText(indicator, valueX, yOffset - 2);
  ctx.font = '16px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(value.toString(), valueX + 26, yOffset);
  return { yOffset: yOffset + lineHeight, shouldContinue: true };
};

const renderNumber = (value: number, context: RenderContext): RenderResult => {
  const { ctx, valueX, yOffset, lineHeight } = context;
  ctx.fillStyle = '#ffaa00';
  const numStr = value % 1 === 0 ? value.toString() : value.toFixed(2);
  ctx.fillText(numStr, valueX, yOffset);
  return { yOffset: yOffset + lineHeight, shouldContinue: true };
};

const renderColor = (value: string, context: RenderContext): RenderResult => {
  const { ctx, valueX, yOffset, lineHeight } = context;
  const boxHeight = 20;
  const boxY = yOffset - (lineHeight - boxHeight) / 2;

  ctx.fillStyle = value;
  ctx.fillRect(valueX, boxY, 28, boxHeight);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(valueX, boxY, 28, boxHeight);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(value, valueX + 34, yOffset);
  return { yOffset: yOffset + lineHeight, shouldContinue: true };
};

const renderString = (value: string, context: RenderContext): RenderResult => {
  const { ctx, valueX, yOffset, lineHeight, debugWidth, padding } = context;

  // Check if it's a color
  const isColor =
    /^#[0-9A-F]{6}$/i.test(value) ||
    value.startsWith('rgb') ||
    value.startsWith('hsl');

  if (isColor) {
    return renderColor(value, context);
  }

  ctx.fillStyle = '#88ff88';
  const maxStringWidth = debugWidth - valueX - padding - 10;
  let displayString = `"${value}"`;
  const stringMetrics = ctx.measureText(displayString);

  if (stringMetrics.width > maxStringWidth) {
    let truncated = value;
    while (
      ctx.measureText(`"${truncated}..."`).width > maxStringWidth &&
      truncated.length > 0
    ) {
      truncated = truncated.slice(0, -1);
    }
    displayString = `"${truncated}..."`;
  }
  ctx.fillText(displayString, valueX, yOffset);
  return { yOffset: yOffset + lineHeight, shouldContinue: true };
};

const renderButton = (value: any, context: RenderContext): RenderResult => {
  const { ctx, valueX, yOffset, lineHeight } = context;
  ctx.fillStyle = '#88ccff';
  const buttonLabel =
    value.options?.buttonLabel || value.buttonLabel || value.label || 'Click';
  const buttonText = `[Button: ${buttonLabel}]`;
  ctx.fillText(buttonText, valueX, yOffset);
  return { yOffset: yOffset + lineHeight, shouldContinue: true };
};

const renderVector = (value: any, context: RenderContext): RenderResult => {
  const { ctx, valueX, yOffset, lineHeight } = context;
  ctx.fillStyle = '#ff88ff';
  const keys = Object.keys(value);
  const vectorStr = `{ ${keys.map((k) => `${k}: ${value[k]}`).join(', ')} }`;
  ctx.fillText(vectorStr, valueX, yOffset);
  return { yOffset: yOffset + lineHeight, shouldContinue: true };
};

const renderArray = (value: any[], context: RenderContext): RenderResult => {
  const { ctx, valueX, yOffset, lineHeight, debugWidth, padding } = context;
  ctx.fillStyle = '#ff88ff';
  const maxArrayWidth = debugWidth - valueX - padding - 10;
  let preview =
    value.length > 3
      ? `[${value.slice(0, 3).join(', ')}... +${value.length - 3}]`
      : `[${value.join(', ')}]`;

  const arrayMetrics = ctx.measureText(preview);
  if (arrayMetrics.width > maxArrayWidth) {
    preview = `[Array(${value.length})]`;
  }

  ctx.fillText(preview, valueX, yOffset);
  return { yOffset: yOffset + lineHeight, shouldContinue: true };
};

const renderOther = (value: any, context: RenderContext): RenderResult => {
  const { ctx, valueX, yOffset, lineHeight, debugWidth, padding } = context;
  ctx.fillStyle = '#888888';
  const str = String(value);
  const maxWidth = debugWidth - valueX - padding - 10;
  let displayStr = str;
  const metrics = ctx.measureText(str);

  if (metrics.width > maxWidth) {
    let truncated = str;
    while (
      ctx.measureText(truncated + '...').width > maxWidth &&
      truncated.length > 0
    ) {
      truncated = truncated.slice(0, -1);
    }
    displayStr = truncated + '...';
  }

  ctx.fillText(displayStr, valueX, yOffset);
  return { yOffset: yOffset + lineHeight, shouldContinue: true };
};

function renderDebugOverlay(
  canvas: HTMLCanvasElement | null,
  config: UnknownConfigValues,
  configSchema: UnknownConfig,
  debugInfo: {
    fps: number;
    currentTime: number;
    currentLevel: number;
    lastFrameTime: number;
  },
  resolutionMultiplier: number = 1,
): number {
  const ctx = canvas?.getContext('2d');
  if (!ctx || !canvas) return 0;

  const { width, height } = canvas;

  // Scale the entire context by resolution multiplier - everything else stays the same!
  ctx.save();
  ctx.scale(resolutionMultiplier / 2, resolutionMultiplier / 2);

  // Now work in display coordinates
  const displayWidth = width / resolutionMultiplier;
  const displayHeight = height / resolutionMultiplier;

  const debugWidth = displayWidth / 4;
  const padding = 20;
  const lineHeight = 28;
  const maxKeyWidth = 200;

  // Clear entire canvas
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  let yOffset = padding;

  // Section header helper
  const drawSectionHeader = (text: string) => {
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText(text, padding, yOffset);
    yOffset += lineHeight + 6;
  };

  // Performance section
  drawSectionHeader('⚡ Performance');
  ctx.font = '16px monospace';
  ctx.fillStyle = '#ffffff';

  const perfMetrics = [
    {
      label: 'FPS',
      value: debugInfo.fps.toFixed(1),
      color:
        debugInfo.fps > 55
          ? '#00ff00'
          : debugInfo.fps > 30
            ? '#ffaa00'
            : '#ff0000',
    },
    {
      label: 'Frame Time',
      value: `${debugInfo.lastFrameTime.toFixed(2)}ms`,
      color: '#ffffff',
    },
    {
      label: 'Time',
      value: `${debugInfo.currentTime.toFixed(2)}s`,
      color: '#ffffff',
    },
    {
      label: 'Volume',
      value: debugInfo.currentLevel.toFixed(2),
      color: '#ffffff',
    },
    {
      label: 'Canvas',
      value: `${Math.round(displayWidth)}×${Math.round(displayHeight)}px`,
      color: '#888888',
    },
  ];

  perfMetrics.forEach(({ label, value, color }) => {
    ctx.fillStyle = '#999999';
    ctx.fillText(label, padding, yOffset);
    ctx.fillStyle = color;
    ctx.fillText(value, padding + 140, yOffset);
    yOffset += lineHeight;
  });

  yOffset += 12;

  // Config section
  drawSectionHeader('⚙️ Config');

  // Render config values with type-specific formatting
  const renderValue = (
    key: string,
    value: any,
    option: BaseConfigOption<any>,
    indent = 0,
  ): boolean => {
    const x = padding + indent * 16;

    ctx.font = '16px monospace';

    // Truncate long keys
    const availableKeyWidth = maxKeyWidth - indent * 16;
    let displayKey = key;
    ctx.fillStyle = '#6699ff';
    const keyMetrics = ctx.measureText(key);

    if (keyMetrics.width > availableKeyWidth) {
      let truncated = key;
      while (
        ctx.measureText(truncated + '...').width > availableKeyWidth &&
        truncated.length > 0
      ) {
        truncated = truncated.slice(0, -1);
      }
      displayKey = truncated + '...';
    }

    ctx.fillText(displayKey, x, yOffset);

    const valueX = x + maxKeyWidth + 10;
    const context: RenderContext = {
      ctx,
      valueX,
      yOffset,
      lineHeight,
      debugWidth,
      padding,
    };

    let result: RenderResult;

    // Use config schema to determine rendering
    if (option instanceof ButtonConfigOption) {
      result = renderButton(value, context);
    } else if (option instanceof GroupConfigOption) {
      // Group - render children
      yOffset += lineHeight;
      for (const [k, childOption] of Object.entries(option.options)) {
        const childValue = value?.[k];
        const shouldContinue = renderValue(
          k,
          childValue,
          childOption as BaseConfigOption<any>,
          indent + 1,
        );
        if (!shouldContinue) return false;
      }
      return true;
    } else if (typeof value === 'boolean') {
      result = renderBoolean(value, context);
    } else if (typeof value === 'number') {
      result = renderNumber(value, context);
    } else if (typeof value === 'string') {
      result = renderString(value, context);
    } else if (Array.isArray(value)) {
      result = renderArray(value, context);
    } else if (value && typeof value === 'object') {
      // Check if it's a vector
      const keys = Object.keys(value);
      const isVector =
        keys.length <= 4 &&
        keys.every((k) => ['x', 'y', 'z', 'w'].includes(k)) &&
        Object.values(value).every((v) => typeof v === 'number');

      if (isVector) {
        result = renderVector(value, context);
      } else {
        result = renderOther(value, context);
      }
    } else {
      result = renderOther(value, context);
    }

    yOffset = result.yOffset;
    return result.shouldContinue;
  };

  // Render all config entries using schema
  for (const [key, option] of Object.entries(configSchema.options)) {
    const value = config[key];
    renderValue(key, value, option as BaseConfigOption<any>);
  }

  ctx.restore();

  // Return total content height
  return yOffset + padding + 200;
}
