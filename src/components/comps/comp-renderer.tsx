import useAudioStore from "@/lib/stores/audio-store";
import useCompStore from "@/lib/stores/comps-store";
import { useEffect, useRef } from "react";
import { z } from "zod";

export type ConfigSchema = z.ZodObject<any>;

export interface Comp<TConfig extends ConfigSchema> {
  name: string;
  description: string;
  config: TConfig;
  draw: (
    ctx: CanvasRenderingContext2D,
    analyzer: AnalyserNode,
    config: z.infer<TConfig>
  ) => void;
}

export function createComponent<TConfig extends ConfigSchema>(definition: {
  name: string;
  description: string;
  config: TConfig;
  draw: (
    ctx: CanvasRenderingContext2D,
    analyzer: AnalyserNode,
    config: z.infer<TConfig>
  ) => void;
}) {
  return definition as Comp<TConfig>;
}

interface CompRendererProps<TConfig extends ConfigSchema> {
  comp: Comp<TConfig>;
}

const CompRenderer = ({ comp }: CompRendererProps<ConfigSchema>) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { audioAnalyzer } = useAudioStore();
  const compData = useCompStore().getComp(comp.name);

  useEffect(() => {
    if (!audioAnalyzer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Correctly handle default config values using Zod schema parsing
    const defaultConfig = comp.config.parse({});

    const renderFrame = () => {
      comp.draw(
        ctx,
        audioAnalyzer,
        compData?.valuesRef.current ?? defaultConfig
      );
      requestAnimationFrame(renderFrame);
    };

    renderFrame();
  }, [audioAnalyzer, comp, compData?.valuesRef]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasRef.current?.clientWidth ?? 1000}
      height={canvasRef.current?.clientHeight ?? 500}
      className="w-full h-full"
    />
  );
};

export default CompRenderer;
