import useAudioStore from "@/lib/stores/audio-store";
import useCompStore from "@/lib/stores/comps-store";
import { useEffect, useRef } from "react";
import { z } from "zod";

export type ConfigValuesRef = React.MutableRefObject<ConfigSchema>;

export type ConfigSchema = z.ZodObject<any>;

export type Preset<TConfig extends ConfigSchema> = {
  name: string;
  values: z.infer<TConfig>;
};

export interface Comp {
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
  return definition as Comp;
}

interface CompRendererProps {
  comp: Comp;
}

const CompRenderer = ({ comp }: CompRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { audioAnalyzer } = useAudioStore();
  const compData = useCompStore().getComp(comp.name);

  useEffect(() => {
    if (!audioAnalyzer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderFrame = () => {
      if (!compData?.valuesRef?.current) return;

      comp.draw(ctx, audioAnalyzer, compData?.valuesRef.current);
      requestAnimationFrame(renderFrame);
    };

    renderFrame();
  }, [audioAnalyzer, comp, compData?.valuesRef]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasRef.current?.clientWidth ?? 1000}
      height={canvasRef.current?.clientHeight ?? 500}
      className="absolute inset-0"
    />
  );
};

export default CompRenderer;
