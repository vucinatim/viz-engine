export function mirrorToCanvases(
  original: HTMLCanvasElement | null,
  copies?: HTMLCanvasElement[],
): void {
  if (!original || original.width === 0 || original.height === 0) {
    return;
  }

  for (const copyCanvas of copies ?? []) {
    const context = copyCanvas.getContext('2d');
    if (!context) {
      continue;
    }
    context.clearRect(0, 0, copyCanvas.width, copyCanvas.height);
    context.drawImage(
      original,
      0,
      0,
      original.width,
      original.height,
      0,
      0,
      copyCanvas.width,
      copyCanvas.height,
    );
  }
}
