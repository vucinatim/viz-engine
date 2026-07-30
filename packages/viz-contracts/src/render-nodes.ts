import type { VizBlendMode } from './project.js';

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

export type VizRenderImageFitMode = 'fill' | 'contain' | 'cover';

export interface VizRenderGroupNode {
  kind: 'group';
  id?: string;
  transform?: VizRenderTransform;
  style?: VizRenderStyle;
  children: VizRenderNode[];
}

export interface VizRenderRectNode {
  kind: 'rect';
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  style?: VizRenderStyle;
}

export interface VizRenderCircleNode {
  kind: 'circle';
  id?: string;
  cx: number;
  cy: number;
  r: number;
  style?: VizRenderStyle;
}

export interface VizRenderPoint {
  x: number;
  y: number;
}

export interface VizRenderPolylineGlow {
  color: string;
  blur: number;
  opacity?: number;
}

export interface VizRenderPolylineNode {
  kind: 'polyline';
  id?: string;
  points: VizRenderPoint[];
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  style?: VizRenderStyle;
  glow?: VizRenderPolylineGlow;
}

export interface VizRenderImageNode {
  kind: 'image';
  id?: string;
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fitMode?: VizRenderImageFitMode;
  style?: VizRenderStyle;
}

export type VizRenderTextAnchor = 'start' | 'middle' | 'end';

export type VizRenderTextBaseline = 'top' | 'middle' | 'alphabetic' | 'bottom';

export interface VizRenderTextNode {
  kind: 'text';
  id?: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: number | 'normal' | 'bold';
  anchor?: VizRenderTextAnchor;
  baseline?: VizRenderTextBaseline;
  style?: VizRenderStyle;
}

export type VizShaderUniformValue =
  | number
  | boolean
  | {
      type: 'color';
      value: string;
    }
  | {
      type: 'vec2';
      value: [number, number];
    }
  | {
      type: 'vec3';
      value: [number, number, number];
    }
  | {
      type: 'vec4';
      value: [number, number, number, number];
    };

export interface VizRenderShaderNode {
  kind: 'shader';
  id?: string;
  programId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, VizShaderUniformValue>;
  transparent?: boolean;
  blendMode?: VizBlendMode;
}

export type VizRenderProgramValue =
  | null
  | boolean
  | number
  | string
  | VizRenderProgramValue[]
  | {
      [key: string]: VizRenderProgramValue;
    };

export interface VizRenderThreeProgramNode {
  kind: 'three-program';
  id?: string;
  programId: string;
  parameters: Record<string, VizRenderProgramValue>;
}

export type VizRenderNode =
  | VizRenderGroupNode
  | VizRenderRectNode
  | VizRenderCircleNode
  | VizRenderPolylineNode
  | VizRenderImageNode
  | VizRenderTextNode
  | VizRenderShaderNode
  | VizRenderThreeProgramNode;
