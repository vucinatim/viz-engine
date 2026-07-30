import type { GraphNodeData } from '../graph-types';

export interface NodeBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

export const prepareNodeCanvas = (
  canvas: HTMLCanvasElement,
):
  | { context: CanvasRenderingContext2D; width: number; height: number }
  | undefined => {
  const context = canvas.getContext('2d');
  if (!context) {
    return undefined;
  }

  const bounds = canvas.getBoundingClientRect();
  const scale =
    typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(bounds.width));
  const height = Math.max(1, Math.floor(bounds.height));
  const pixelWidth = width * scale;
  const pixelHeight = height * scale;
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(scale, 0, 0, scale, 0, 0);

  return { context, width, height };
};
