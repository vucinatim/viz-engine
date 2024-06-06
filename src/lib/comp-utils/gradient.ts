interface GradientProps {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  stops: { offset: number; color: string }[];
}

// White to black top to bottom gradient
const defaultProps = {
  x0: 0,
  y0: 0,
  x1: 0,
  y1: 100,
  stops: [
    { offset: 0, color: "white" },
    { offset: 1, color: "black" },
  ],
};

export const gradient = (
  ctx: CanvasRenderingContext2D,
  props?: GradientProps
) => {
  const { x0, y0, x1, y1, stops } = props || defaultProps;

  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(({ offset, color }) => grad.addColorStop(offset, color));
  return grad;
};

export const convertCssGradientToCanvasGradient = (
  ctx: CanvasRenderingContext2D,
  cssGradient: string,
  width: number,
  height: number
) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const canvasCtx = canvas.getContext("2d");
  if (!canvasCtx) return;

  canvasCtx.fillStyle = cssGradient;
  canvasCtx.fillRect(0, 0, width, height);
  return canvasCtx.createPattern(canvas, "no-repeat");
};
