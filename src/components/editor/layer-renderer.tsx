import { getDefaults } from "@/lib/schema-utils";
import useAudioStore from "@/lib/stores/audio-store";
import { LayerData } from "@/lib/stores/layer-store";
import { useEffect, useRef, forwardRef } from "react";
import { z } from "zod";

export type ConfigValuesRef = React.MutableRefObject<ConfigSchema>;

export type ConfigSchema = z.ZodObject<any>;

export type Preset<TConfig extends ConfigSchema> = {
  name: string;
  values: z.infer<TConfig>;
};

export interface Comp {
  id: string;
  name: string;
  description: string;
  config: ConfigSchema;
  defaultValues: z.infer<ConfigSchema>;
  presets?: Preset<ConfigSchema>[];
  draw: (
    ctx: CanvasRenderingContext2D,
    dataArray: Uint8Array,
    analyzer: AnalyserNode,
    config: ConfigSchema
  ) => void;
}

export function createComponent<TConfig extends ConfigSchema>(definition: {
  name: string;
  description: string;
  config: TConfig;
  presets?: Preset<TConfig>[];
  draw: (
    ctx: CanvasRenderingContext2D,
    dataArray: Uint8Array,
    analyzer: AnalyserNode,
    config: z.infer<TConfig>
  ) => void;
}) {
  return {
    id: `${definition.name}-${new Date().getTime()}`,
    defaultValues: getDefaults(definition.config),
    ...definition,
  } as Comp;
}

interface LayerRendererProps {
  layer: LayerData;
}

const LayerRenderer = ({ layer }: LayerRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { audioAnalyzer, wavesurfer } = useAudioStore();

  // Store the last data array to prevent flickering when the audio is paused
  const dataArrayRef = useRef<Uint8Array>(new Uint8Array());
  const lastDataArrayRef = useRef<Uint8Array>(new Uint8Array());

  // Stats for debugging
  const lastFrameTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);
  const fpsRef = useRef(0);
  const lastDrawDurationRef = useRef(0);

  useEffect(() => {
    if (!audioAnalyzer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderFrame = () => {
      // If freeze is disabled treat the layer as playing
      const isPlaying = !layer.layerSettings.freeze || wavesurfer?.isPlaying();

      // Fetch new data only if isPlaying is true
      if (isPlaying) {
        dataArrayRef.current = new Uint8Array(audioAnalyzer.frequencyBinCount);
        audioAnalyzer.getByteFrequencyData(dataArrayRef.current);
        lastDataArrayRef.current = new Uint8Array(dataArrayRef.current);
      }

      // Timing the draw operation
      let drawStart, drawEnd;
      if (layer?.valuesRef?.current) {
        drawStart = performance.now(); // More precise than Date.now()
        layer.comp.draw(
          ctx,
          isPlaying ? dataArrayRef.current : lastDataArrayRef.current,
          audioAnalyzer,
          layer.valuesRef.current
        );
        drawEnd = performance.now();
        lastDrawDurationRef.current = drawEnd - drawStart; // Time taken for the draw operation
      }

      if (layer.isDebugEnabled) {
        const now = Date.now();
        const deltaTime = now - lastFrameTimeRef.current;
        frameCountRef.current++;
        if (deltaTime >= 1000) {
          fpsRef.current = frameCountRef.current / (deltaTime / 1000);
          frameCountRef.current = 0;
          lastFrameTimeRef.current = now;
        }
        renderDebugOverlay(ctx, layer.valuesRef.current, {
          fps: fpsRef.current,
          currentTime: wavesurfer?.getCurrentTime() || 0,
          currentLevel: calculateAudioLevel(dataArrayRef.current),
          lastFrameTime: lastDrawDurationRef.current,
        });
      }

      // Mirror the rendered canvas to other canvases
      layer.mirrorCanvases?.forEach((mirrorCanvas) => {
        if (!mirrorCanvas.current) return;
        if (canvas.width === 0 || canvas.height === 0) return;
        const width = mirrorCanvas.current.width;
        const height = mirrorCanvas.current.height;
        const mirrorCtx = mirrorCanvas.current.getContext("2d");
        if (mirrorCtx) {
          mirrorCtx.clearRect(0, 0, width, height);
          // Scale the canvas to fit the mirror canvas and draw the image
          mirrorCtx.drawImage(
            canvas,
            0,
            0,
            canvas.width,
            canvas.height,
            0,
            0,
            width,
            height
          );
        }
      });

      requestAnimationFrame(renderFrame);
    };

    renderFrame();
  }, [
    audioAnalyzer,
    layer.comp,
    layer.isDebugEnabled,
    layer.layerSettings.freeze,
    layer.mirrorCanvases,
    layer.valuesRef,
    wavesurfer,
  ]);

  return <ControlledCanvas layer={layer} ref={canvasRef} />;
};

interface ControlledCanvasProps {
  layer: LayerData;
}

export const ControlledCanvas = forwardRef<
  HTMLCanvasElement,
  ControlledCanvasProps
>(({ layer }, ref) => {
  const refCurrent = (ref as React.MutableRefObject<HTMLCanvasElement> | null)
    ?.current;
  return (
    <canvas
      ref={ref}
      width={refCurrent?.clientWidth ?? 1000}
      height={refCurrent?.clientHeight ?? 500}
      className="absolute m-auto w-full aspect-video"
      style={{
        opacity: layer.layerSettings.opacity,
        background: `${layer.layerSettings.background}`,
        display: layer.layerSettings.visible ? "block" : "none",
        mixBlendMode: layer.layerSettings.blendingMode,
      }}
    />
  );
});

ControlledCanvas.displayName = "ControlledCanvas";

function renderDebugOverlay(
  ctx: CanvasRenderingContext2D,
  config: ConfigSchema,
  debugInfo: {
    fps: number;
    currentTime: number;
    currentLevel: number;
    lastFrameTime: number;
  }
) {
  const { width, height } = ctx.canvas;
  const debugWidth = width / 3; // Width of the debug panel

  ctx.save(); // Save current state to restore after drawing debug info
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Semi-transparent black
  ctx.fillRect(0, 0, debugWidth, height); // Background for debug text for visibility

  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Set labels in green
  ctx.fillStyle = "#00FF00"; // Vibrant green color for text
  ctx.fillText("Debug Info:", 10, 10);
  ctx.fillStyle = "white"; // White color for values
  ctx.fillText(`FPS: ${debugInfo.fps.toFixed(1)}`, 10, 30);
  ctx.fillText(`Time: ${debugInfo.currentTime.toFixed(2)}s`, 10, 50);
  ctx.fillText(`Level: ${debugInfo.currentLevel.toFixed(2)}`, 10, 70);
  ctx.fillText(
    `Last Frame Time: ${debugInfo.lastFrameTime.toFixed(2)}ms`,
    10,
    90
  );

  // Display configuration data
  ctx.fillStyle = "#00FF00"; // Green color for "Config Values" label
  ctx.fillText("Config Values:", 10, 130);
  const configEntries = Object.entries(config);
  ctx.fillStyle = "white"; // White color for config values
  let yOffset = 150;

  // Function to render nested JSON objects with proper indentations
  function drawConfigText(key: string, value: any, indent: string) {
    const lines = JSON.stringify(value, null, 2).split("\n");
    lines.forEach((line, index) => {
      ctx.fillText(
        `${indent}${index === 0 ? key + ": " : ""}${line}`,
        10,
        yOffset
      );
      yOffset += 20;
    });
  }

  configEntries.forEach(([key, value]) => {
    drawConfigText(key, value, "");
  });

  ctx.restore(); // Restore the previous state
}

function calculateAudioLevel(dataArray: Uint8Array) {
  let sum = dataArray.reduce((acc, val) => acc + val, 0);
  return sum / dataArray.length;
}

export default LayerRenderer;
