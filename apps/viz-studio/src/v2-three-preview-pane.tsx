import type { VizRenderPlan } from "@viz-engine/contracts";
import {
  createVizThreePreviewController,
  type VizThreePreviewController,
} from "@viz-engine/renderer-three";
import React, { useEffect, useRef } from "react";

interface V2ThreePreviewPaneProps {
  renderPlan: VizRenderPlan;
  width: number;
  height: number;
}

export const V2ThreePreviewPane = ({
  renderPlan,
  width,
  height,
}: V2ThreePreviewPaneProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<VizThreePreviewController | null>(null);
  const initialRenderPlanRef = useRef(renderPlan);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const controller = createVizThreePreviewController({
      canvas,
      renderPlan: initialRenderPlanRef.current,
    });
    controllerRef.current = controller;

    return () => {
      controllerRef.current = null;
      controller.dispose();
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.resize(width, height);
    controllerRef.current?.update(renderPlan);
  }, [height, renderPlan, width]);

  return <canvas ref={canvasRef} width={width} height={height} />;
};
