import type {
  VizComponentImplementation,
  VizRenderGroupNode,
  VizRenderRectNode,
} from "@viz-engine/contracts";
import { asNumber, asString } from "./shared.js";

export const solidColorComponent: VizComponentImplementation = {
  id: "solid-color",
  name: "Solid Color",
  rendererFamily: "three",
  description: "Simple background fill layer.",
  inputs: [
    {
      key: "glow",
      label: "Glow",
      supportedSources: ["literal"],
    },
  ],
  render: ({ viewport, layer, settings, resolvedInputs }) => {
    const color = asString(settings.color, "#000000");
    const glowValue = asNumber(resolvedInputs.glow?.value, 0);
    const overlayOpacity = Math.max(0, Math.min(glowValue, 0.35));

    const baseRect: VizRenderRectNode = {
      kind: "rect",
      id: `${layer.id}-base`,
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
      style: {
        fill: color,
      },
    };

    const glowRect: VizRenderRectNode = {
      kind: "rect",
      id: `${layer.id}-glow`,
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
      style: {
        fill: "#0e4963",
        opacity: overlayOpacity,
      },
    };

    const group: VizRenderGroupNode = {
      kind: "group",
      id: layer.id,
      children: [baseRect, glowRect],
      style: {
        opacity: layer.opacity,
        blendMode: layer.blendMode,
      },
    };

    return group;
  },
};
