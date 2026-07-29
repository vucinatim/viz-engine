import type {
  VizComponentImplementation,
  VizRenderThreeProgramNode,
} from "@viz-engine/contracts";
import { asNumber, asString } from "./shared.js";

export const simpleCubeComponent: VizComponentImplementation = {
  id: "simple-cube",
  name: "Simple Cube",
  rendererFamily: "three",
  description: "Deterministic package-runtime rotating cube scene.",
  render: ({ frameContext, layer }) => {
    const color = asString(layer.settings?.color, "#FF00FF");
    const size = Math.max(0.1, asNumber(layer.settings?.size, 1.5));
    const rotationSpeedX = asNumber(
      layer.settings?.rotationSpeedX,
      1,
    );
    const rotationSpeedY = asNumber(
      layer.settings?.rotationSpeedY,
      1,
    );

    return {
      kind: "three-program",
      id: layer.id,
      programId: "viz-core/simple-cube/v1",
      parameters: {
        color,
        size,
        rotationX: frameContext.timeInSeconds * rotationSpeedX,
        rotationY: frameContext.timeInSeconds * rotationSpeedY,
      },
    } satisfies VizRenderThreeProgramNode;
  },
};
