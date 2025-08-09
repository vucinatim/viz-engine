import { UnknownConfigValues } from '@/components/config/create-component';
import { debugStringify } from '@/lib/utils';
import React, { useCallback, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { calculateAudioLevel } from '../comp-utils/audio-utils';

function useDebug(debugCanvasRef: React.RefObject<HTMLCanvasElement>) {
  // High-precision timing for FPS estimation
  const prevTsRef = useRef<number | null>(null);
  const smoothedFpsRef = useRef(0);

  // Enhances the given draw function with debugging
  const withDebug = useCallback(
    (
      drawFunction: Function,
      {
        wavesurfer,
        dataArray,
        config,
      }: {
        wavesurfer: WaveSurfer | null;
        dataArray: Uint8Array;
        config: UnknownConfigValues;
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
        renderDebugOverlay(debugCanvasRef.current, config, debugInfo);
      }
    },
    [debugCanvasRef],
  );

  return withDebug;
}

export default useDebug;

function renderDebugOverlay(
  canvas: HTMLCanvasElement | null,
  config: UnknownConfigValues,
  debugInfo: {
    fps: number;
    currentTime: number;
    currentLevel: number;
    lastFrameTime: number;
  },
) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  const { width, height } = ctx.canvas;
  const debugWidth = width / 3; // Width of the debug panel

  ctx.save(); // Save current state to restore after drawing debug info

  ctx.clearRect(0, 0, width, height); // Ensure the canvas is clear
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black
  ctx.fillRect(0, 0, debugWidth, height); // Background for debug text for visibility

  ctx.font = '14px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Set labels in green
  ctx.fillStyle = '#00FF00'; // Vibrant green color for text
  ctx.fillText('Performance Info:', 10, 10);
  ctx.fillStyle = 'white'; // White color for values
  ctx.fillText(`Time: ${debugInfo.currentTime.toFixed(2)}s`, 10, 50);
  ctx.fillText(`FPS: ${debugInfo.fps.toFixed(1)}`, 10, 30);
  ctx.fillText(`Volume Level: ${debugInfo.currentLevel.toFixed(2)}`, 10, 70);
  ctx.fillText(
    `Last Frame Time: ${debugInfo.lastFrameTime.toFixed(2)}ms`,
    10,
    90,
  );
  ctx.fillText(`width: ${width}px`, 10, 110);
  ctx.fillText(`height: ${height}px`, 10, 130);

  // Display configuration data
  ctx.fillStyle = '#00FF00'; // Green color for "Config Values" label
  ctx.fillText('Config Values:', 10, 160);
  const configEntries = Object.entries(config);
  ctx.fillStyle = 'white'; // White color for config values
  let yOffset = 180;

  // Function to render nested JSON objects with robust stringification
  function drawConfigText(key: string, value: any, indent: string) {
    const text = debugStringify(value);
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      ctx?.fillText(
        `${indent}${index === 0 ? key + ': ' : ''}${line}`,
        10,
        yOffset,
      );
      yOffset += 20;
    });
  }

  configEntries.forEach(([key, value]) => {
    drawConfigText(key, value, '');
  });

  ctx.restore(); // Restore the previous state
}
