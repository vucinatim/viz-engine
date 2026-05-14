import {
  createVizThreePreviewController,
  type VizThreePreviewController,
} from "@viz-engine/renderer-three";
import type { VizRenderPlan } from "@viz-engine/contracts";
import { useEffect, useRef } from "react";

interface ThreePreviewPaneProps {
  renderPlan: VizRenderPlan;
  width: number;
  height: number;
}

export function ThreePreviewPane({
  renderPlan,
  width,
  height,
}: ThreePreviewPaneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<VizThreePreviewController | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const controller = createVizThreePreviewController({
      canvas,
      renderPlan,
    });
    controllerRef.current = controller;

    return () => {
      controllerRef.current = null;
      controller.dispose();
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.update(renderPlan);
  }, [renderPlan]);

  return <canvas ref={canvasRef} width={width} height={height} />;
}
