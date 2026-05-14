import type {
  VizComponentImplementation,
  VizRenderGroupNode,
  VizRenderRectNode,
} from "@viz-engine/contracts";
import { asNumber } from "./shared.js";

const CHANNELS = [
  { key: "kick", color: "#ef4444" },
  { key: "snare", color: "#f59e0b" },
  { key: "bass", color: "#22c55e" },
  { key: "melody", color: "#60a5fa" },
  { key: "percussion", color: "#a78bfa" },
] as const;

export const featureChannelBarsComponent: VizComponentImplementation = {
  id: "feature-channel-bars",
  name: "Feature Channel Bars",
  rendererFamily: "three",
  description: "Port of the V1 feature-extraction bars concept as five reactive channels.",
  inputs: CHANNELS.map((channel) => ({
    key: channel.key,
    label: channel.key[0]!.toUpperCase() + channel.key.slice(1),
    supportedSources: ["artifact-feature", "graph-output", "literal"],
    required: true,
  })),
  render: ({ viewport, layer, resolvedInputs }) => {
    const padX = viewport.width * 0.08;
    const padY = viewport.height * 0.08;
    const channelCount = CHANNELS.length;
    const columnAreaWidth = (viewport.width - padX * 2) / channelCount;
    const gap = Math.max(8, columnAreaWidth * 0.12);
    const barWidth = Math.max(20, columnAreaWidth - gap * 2);
    const barAreaHeight = viewport.height - padY * 2;

    const trackNodes: VizRenderRectNode[] = [];
    const fillNodes: VizRenderRectNode[] = [];

    for (const [index, channel] of CHANNELS.entries()) {
      const x = padX + columnAreaWidth * index + gap;
      const normalized = Math.max(0, Math.min(asNumber(resolvedInputs[channel.key]?.value, 0), 1));
      const height = normalized * barAreaHeight;
      const y = viewport.height - padY - height;

      trackNodes.push({
        kind: "rect",
        id: `${layer.id}-${channel.key}-track`,
        x,
        y: padY,
        width: barWidth,
        height: barAreaHeight,
        radius: Math.min(18, barWidth / 2),
        style: {
          fill: "#0f1822",
          opacity: 0.72,
          stroke: "#273444",
          strokeWidth: 2,
        },
      });

      fillNodes.push({
        kind: "rect",
        id: `${layer.id}-${channel.key}-fill`,
        x,
        y,
        width: barWidth,
        height: Math.max(8, height),
        radius: Math.min(18, barWidth / 2),
        style: {
          fill: channel.color,
          opacity: 0.85,
        },
      });
    }

    return {
      kind: "group",
      id: layer.id,
      children: [...trackNodes, ...fillNodes],
      style: {
        opacity: layer.opacity,
        blendMode: layer.blendMode,
      },
    } satisfies VizRenderGroupNode;
  },
};
