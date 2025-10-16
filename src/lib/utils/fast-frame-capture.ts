/**
 * Fast Frame Capture - Direct Canvas Compositing
 *
 * Captures frames by directly compositing canvases, implementing CSS blend modes
 * manually. This is 10-50x faster than html2canvas but requires manual blending.
 */

export interface FastCaptureOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  quality?: number;
}

/**
 * Fast capture using direct canvas compositing
 * Finds all layer canvases and composites them with blend modes
 */
export async function fastCaptureFrame(
  containerElement: HTMLElement,
  options: FastCaptureOptions,
): Promise<Blob> {
  const {
    width,
    height,
    backgroundColor = '#000000',
    quality = 0.95,
  } = options;

  // Find all canvas elements that are layers
  const canvases = Array.from(
    containerElement.querySelectorAll('canvas'),
  ) as HTMLCanvasElement[];

  // Create composite canvas
  const composite = document.createElement('canvas');
  composite.width = width;
  composite.height = height;
  const ctx = composite.getContext('2d', {
    alpha: true,
    willReadFrequently: false, // Optimize for write operations
  });

  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Composite each canvas with its blend mode and opacity
  for (const canvas of canvases) {
    const style = window.getComputedStyle(canvas);
    const opacity = parseFloat(style.opacity || '1');
    const cssBlendMode = style.mixBlendMode || 'normal';

    // Map CSS blend mode to Canvas globalCompositeOperation
    // CSS "normal" = Canvas "source-over"
    // Most other blend modes have the same name in both APIs
    const blendMode: GlobalCompositeOperation =
      cssBlendMode === 'normal'
        ? 'source-over'
        : (cssBlendMode as GlobalCompositeOperation);

    const display = style.display;
    const background = style.background || style.backgroundColor;

    // Skip hidden canvases
    if (display === 'none' || opacity === 0) continue;

    // CRITICAL FIX for multiply/blend modes:
    // We need to composite the layer's background + canvas content together FIRST,
    // then blend that combined result with the layers below.
    // Otherwise, if we apply multiply to the background, it turns everything black.

    // Create a temporary canvas for this layer
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d', { alpha: true });

    if (!tempCtx) continue;

    // Draw background on temp canvas (without blend mode)
    if (
      background &&
      background !== 'rgba(0, 0, 0, 0)' &&
      background !== 'transparent'
    ) {
      tempCtx.fillStyle = background;
      tempCtx.fillRect(0, 0, width, height);
    }

    // Draw canvas content on top of background (without blend mode)
    const scale = Math.min(width / canvas.width, height / canvas.height);
    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;
    const x = (width - scaledWidth) / 2;
    const y = (height - scaledHeight) / 2;
    tempCtx.drawImage(canvas, x, y, scaledWidth, scaledHeight);

    // Now composite the complete layer onto the main canvas with blend mode
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = blendMode;
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
  }

  // Convert to blob using JPEG for much faster encoding
  // JPEG is 5-10x faster than PNG and quality parameter actually works
  // FFmpeg will handle the final video quality, so JPEG is fine for intermediate frames
  return new Promise<Blob>((resolve, reject) => {
    composite.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/jpeg',
      quality,
    );
  });
}
