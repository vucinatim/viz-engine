export function captureCanvasToBlob(
  canvas: HTMLCanvasElement,
  options: { format?: 'png' | 'jpeg' | 'webp'; quality?: number } = {},
): Promise<Blob> {
  const { format = 'jpeg', quality = 0.95 } = options;
  const mimeType =
    format === 'png'
      ? 'image/png'
      : format === 'webp'
        ? 'image/webp'
        : 'image/jpeg';
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      mimeType,
      quality,
    );
  });
}
