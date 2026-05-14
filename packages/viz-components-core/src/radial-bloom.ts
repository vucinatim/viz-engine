import type {
  VizComponentImplementation,
  VizRenderCircleNode,
  VizRenderGroupNode,
} from "@viz-engine/contracts";
import { asNumber, asString } from "./shared.js";

export const radialBloomComponent: VizComponentImplementation = {
  id: "radial-bloom",
  name: "Radial Bloom",
  rendererFamily: "three",
  description: "Accent bloom driven by spectral flux.",
  inputs: [
    {
      key: "intensity",
      label: "Intensity",
      supportedSources: ["artifact-feature", "graph-output", "literal"],
      required: true,
    },
  ],
  render: ({ viewport, layer, resolvedInputs }) => {
    const intensity = Math.max(0, Math.min(asNumber(resolvedInputs.intensity?.value, 0), 1));
    const color = asString(layer.settings?.color, "#3bd4ff");
    const cx = viewport.width / 2;
    const cy = viewport.height * 0.42;

    const innerCircle: VizRenderCircleNode = {
      kind: "circle",
      id: `${layer.id}-inner`,
      cx,
      cy,
      r: 70 + intensity * 90,
      style: {
        fill: color,
        opacity: 0.12 + intensity * 0.18,
      },
    };

    const outerCircle: VizRenderCircleNode = {
      kind: "circle",
      id: `${layer.id}-outer`,
      cx,
      cy,
      r: 140 + intensity * 170,
      style: {
        fill: color,
        opacity: 0.04 + intensity * 0.08,
      },
    };

    return {
      kind: "group",
      id: layer.id,
      children: [outerCircle, innerCircle],
      style: {
        opacity: layer.opacity,
        blendMode: layer.blendMode,
      },
    } satisfies VizRenderGroupNode;
  },
};
