export function mirrorToCanvases(
  original: HTMLCanvasElement | null,
  copies?: HTMLCanvasElement[],
) {
  if (!original) return;
  copies?.forEach((copyCanvas) => {
    if (!copyCanvas) return;
    if (original.width === 0 || original.height === 0) return;

    const width = copyCanvas.width;
    const height = copyCanvas.height;
    const mirrorCtx = copyCanvas.getContext('2d');
    if (mirrorCtx) {
      mirrorCtx.clearRect(0, 0, width, height);
      // Scale the canvas to fit the mirror canvas and draw the image
      mirrorCtx.drawImage(
        original,
        0,
        0,
        original.width,
        original.height,
        0,
        0,
        width,
        height,
      );
    }
  });
}
