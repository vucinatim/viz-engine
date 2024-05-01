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
  // console.log("Rendering layer", layer.comp.name);

  useEffect(() => {
    if (!audioAnalyzer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dataArray = new Uint8Array();
    let lastDataArray = new Uint8Array();

    const renderFrame = () => {
      // If freeze is disabled treat the layer as playing
      const isPlaying = !layer.layerSettings.freeze || wavesurfer?.isPlaying();

      // Fetch new data only if isPlaying is true
      if (isPlaying) {
        dataArray = new Uint8Array(audioAnalyzer.frequencyBinCount);
        audioAnalyzer.getByteFrequencyData(dataArray);
        lastDataArray = new Uint8Array(dataArray);
      }

      if (layer?.valuesRef?.current) {
        layer.comp.draw(
          ctx,
          isPlaying ? dataArray : lastDataArray,
          audioAnalyzer,
          layer?.valuesRef.current
        );
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
    layer.layerSettings.freeze,
    layer.mirrorCanvases,
    layer?.valuesRef,
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

export default LayerRenderer;
