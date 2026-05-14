import type { VizBlendMode } from "./project.js";

export interface VizRenderStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  blendMode?: VizBlendMode;
}

export interface VizRenderTransform {
  translateX?: number;
  translateY?: number;
  scaleX?: number;
  scaleY?: number;
  rotationDegrees?: number;
}

export type VizRenderImageFitMode = "fill" | "contain" | "cover";

export interface VizRenderGroupNode {
  kind: "group";
  id?: string;
  transform?: VizRenderTransform;
  style?: VizRenderStyle;
  children: VizRenderNode[];
}

export interface VizRenderRectNode {
  kind: "rect";
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  style?: VizRenderStyle;
}

export interface VizRenderCircleNode {
  kind: "circle";
  id?: string;
  cx: number;
  cy: number;
  r: number;
  style?: VizRenderStyle;
}

export interface VizRenderImageNode {
  kind: "image";
  id?: string;
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fitMode?: VizRenderImageFitMode;
  style?: VizRenderStyle;
}

export type VizRenderNode =
  | VizRenderGroupNode
  | VizRenderRectNode
  | VizRenderCircleNode
  | VizRenderImageNode;
