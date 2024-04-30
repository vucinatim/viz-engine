import useAudioStore from "@/lib/stores/audio-store";
import { LayerData } from "@/lib/stores/layer-store";
import { useEffect, useRef } from "react";
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
  presets?: Preset<ConfigSchema>[];
  draw: (
    ctx: CanvasRenderingContext2D,
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
    analyzer: AnalyserNode,
    config: z.infer<TConfig>
  ) => void;
}) {
  return {
    id: `${definition.name}-${new Date().getTime()}`,
    ...definition,
  } as Comp;
}

interface LayerRendererProps {
  layer: LayerData;
}

const LayerRenderer = ({ layer }: LayerRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { audioAnalyzer } = useAudioStore();
  console.log("Rendering layer", layer.comp.name);

  useEffect(() => {
    if (!audioAnalyzer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderFrame = () => {
      if (layer?.valuesRef?.current) {
        layer.comp.draw(ctx, audioAnalyzer, layer?.valuesRef.current);
      }

      requestAnimationFrame(renderFrame);
    };

    renderFrame();
  }, [audioAnalyzer, layer.comp, layer?.valuesRef]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasRef.current?.clientWidth ?? 1000}
      height={canvasRef.current?.clientHeight ?? 500}
      className="absolute m-auto w-full aspect-video"
      style={{
        opacity: layer.layerSettings.opacity,
        background: `${layer.layerSettings.background}`,
        display: layer.layerSettings.visible ? "block" : "none",
        mixBlendMode: layer.layerSettings.blendingMode,
      }}
    />
  );
};

export default LayerRenderer;
