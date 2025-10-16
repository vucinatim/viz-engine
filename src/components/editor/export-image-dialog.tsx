'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import useEditorStore from '@/lib/stores/editor-store';
import useLayerStore from '@/lib/stores/layer-store';
import { fastCaptureFrame } from '@/lib/utils/fast-frame-capture';
import { Download, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface ExportImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const resolutionPresets = [
  { label: '720p (1280×720)', width: 1280, height: 720 },
  { label: '1080p (1920×1080)', width: 1920, height: 1080 },
  { label: '1440p (2560×1440)', width: 2560, height: 1440 },
  { label: '4K (3840×2160)', width: 3840, height: 2160 },
];

type ImageFormat = 'jpeg' | 'png';

const ExportImageDialog = ({ open, onOpenChange }: ExportImageDialogProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [quality, setQuality] = useState(0.95);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const playerRef = useEditorStore((s) => s.playerRef);
  const playerFPS = useEditorStore((s) => s.playerFPS);
  const layerStore = useLayerStore();

  // Clean up the image URL when dialog closes
  useEffect(() => {
    if (!open && imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const captureCurrentFrame = async () => {
    setIsCapturing(true);
    try {
      // Find the renderer container
      const rendererContainer = document.querySelector(
        '[data-renderer-container]',
      ) as HTMLElement;

      if (!rendererContainer) {
        toast.error('Renderer not found');
        return;
      }

      // Find all canvas elements that are layers
      // Skip any canvases that haven't been sized yet (0x0 will render black)
      const canvases = Array.from(
        rendererContainer.querySelectorAll('canvas'),
      ).filter(
        (c) =>
          (c as HTMLCanvasElement).width > 0 &&
          (c as HTMLCanvasElement).height > 0,
      ) as HTMLCanvasElement[];

      // Get current player time (in SECONDS) and dt based on the player's FPS
      const currentFrame = playerRef.current?.getCurrentFrame?.() ?? 0;
      const fps = playerFPS > 0 ? playerFPS : 60;
      const currentTime = currentFrame / fps;
      const deltaTime = 1 / fps;

      // CRITICAL: Manually render all layers with current time
      // This ensures we have fresh rendering before capture
      layerStore.renderAllLayers(currentTime, deltaTime);

      // CRITICAL: Force WebGL to finish rendering before capture
      // WebGL commands are asynchronous - we need to ensure GPU completes work
      for (const canvas of canvases) {
        // Get existing WebGL context (returns existing context if one exists)
        const gl = (canvas.getContext('webgl2') ||
          canvas.getContext('webgl')) as
          | WebGL2RenderingContext
          | WebGLRenderingContext
          | null;
        if (gl) {
          // Ensure commands are flushed to the GPU, then block until done
          if ('flush' in gl && typeof (gl as any).flush === 'function') {
            (gl as any).flush();
          }
          if ('finish' in gl && typeof (gl as any).finish === 'function') {
            (gl as any).finish();
          }
        }
      }

      // Use double RAF to ensure DOM and canvas are fully painted
      // This gives the browser time to flush all rendering commands
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      let blob: Blob;

      if (format === 'jpeg') {
        // Use the same fast path as video export for consistency
        blob = await fastCaptureFrame(rendererContainer, {
          width,
          height,
          backgroundColor: '#000000',
          quality,
        });
      } else {
        // PNG needs alpha – do manual compositing with alpha context
        const composite = document.createElement('canvas');
        composite.width = width;
        composite.height = height;
        const ctx = composite.getContext('2d', { alpha: true });
        if (!ctx) {
          toast.error('Failed to create canvas context');
          return;
        }

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

        blob = await new Promise<Blob>((resolve, reject) => {
          composite.toBlob(
            (b) =>
              b
                ? resolve(b)
                : reject(new Error('Failed to convert canvas to blob')),
            'image/png',
          );
        });
      }

      // Create an object URL for the blob and use it directly in an <img> for preview
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    } catch (error) {
      console.error('Failed to capture frame:', error);
      toast.error('Failed to capture frame');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;

    // Create a download link
    const link = document.createElement('a');
    link.href = imageUrl;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format === 'png' ? 'png' : 'jpg';
    link.download = `viz-engine-${width}x${height}-${timestamp}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Image downloaded!');
  };

  const handleResolutionChange = (value: string) => {
    const preset = resolutionPresets.find((p) => p.label === value);
    if (preset) {
      setWidth(preset.width);
      setHeight(preset.height);
      // Clear current image when resolution changes
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
        setImageUrl(null);
      }
    }
  };

  const selectedPreset = resolutionPresets.find(
    (p) => p.width === width && p.height === height,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export Current Frame</DialogTitle>
          <DialogDescription>
            Capture and download the current frame as a high-quality image
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resolution and Format Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Resolution</Label>
              <Select
                value={selectedPreset?.label || 'Custom'}
                onValueChange={handleResolutionChange}
                disabled={isCapturing}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  {resolutionPresets.map((preset) => (
                    <SelectItem key={preset.label} value={preset.label}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={format}
                onValueChange={(v) => {
                  setFormat(v as ImageFormat);
                  // Clear current image when format changes
                  if (imageUrl) {
                    URL.revokeObjectURL(imageUrl);
                    setImageUrl(null);
                  }
                }}
                disabled={isCapturing}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Output</Label>
              <div className="flex h-8 items-center rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm">
                {width} × {height} • {format.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Quality Slider (JPEG only) */}
          {format === 'jpeg' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Quality</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <Slider
                value={quality}
                onChange={(value: number) => {
                  setQuality(value);
                  // Clear current image when quality changes
                  if (imageUrl) {
                    URL.revokeObjectURL(imageUrl);
                    setImageUrl(null);
                  }
                }}
                min={0.5}
                max={1}
                step={0.05}
              />
            </div>
          )}

          {/* Preview */}
          <div className="flex flex-col items-center gap-4">
            {isCapturing ? (
              <div className="flex h-64 w-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Rendering frame...
                  </p>
                </div>
              </div>
            ) : imageUrl ? (
              <div className="relative w-full overflow-hidden rounded-lg border border-zinc-700 bg-black">
                {/* Show exactly what will be downloaded */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Export preview"
                  className="w-full select-none"
                />
              </div>
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900">
                <p className="text-sm text-muted-foreground">
                  Click &quot;Capture Frame&quot; to preview
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCapturing}>
            Cancel
          </Button>
          <Button
            onClick={captureCurrentFrame}
            disabled={isCapturing}
            variant="secondary">
            {isCapturing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Capturing...
              </>
            ) : imageUrl ? (
              'Recapture Frame'
            ) : (
              'Capture Frame'
            )}
          </Button>
          <Button onClick={handleDownload} disabled={!imageUrl || isCapturing}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportImageDialog;
