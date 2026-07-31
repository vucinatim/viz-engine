import { LayerData } from '@/lib/editor-layer-types';
import { invalidateEditorRuntimePreview } from '@/lib/editor-runtime-preview-invalidation';
import useOnResize from '@/lib/hooks/use-on-resize';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import useEditorStore from '@/lib/stores/editor-store';
import { useCallback, useEffect, useRef } from 'react';

interface LayerMirrorCanvasProps {
  layer: LayerData;
}

const LayerMirrorCanvas = ({ layer }: LayerMirrorCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resolutionMultiplier = useEditorStore(
    (state) => state.resolutionMultiplier,
  );
  const registerMirrorCanvas = useEditorRuntimePreviewAttachmentStore(
    (s) => s.registerMirrorCanvas,
  );
  const unregisterMirrorCanvas = useEditorRuntimePreviewAttachmentStore(
    (s) => s.unregisterMirrorCanvas,
  );
  const resizeCanvas = useCallback(
    (entries: ResizeObserverEntry[]) => {
      const canvas = canvasRef.current;
      const contentRect = entries.at(-1)?.contentRect;
      if (!canvas || !contentRect) {
        return;
      }

      const width = Math.max(
        1,
        Math.round(contentRect.width * resolutionMultiplier),
      );
      const height = Math.max(
        1,
        Math.round(contentRect.height * resolutionMultiplier),
      );
      if (canvas.width === width && canvas.height === height) {
        return;
      }
      canvas.width = width;
      canvas.height = height;
      invalidateEditorRuntimePreview();
    },
    [resolutionMultiplier],
  );

  useOnResize(canvasRef, resizeCanvas);

  useEffect(() => {
    const canvas = canvasRef.current;
    // console.log("Registering mirror canvas", layer.id);
    if (!canvas) return;
    registerMirrorCanvas(layer.id, canvas);

    return () => {
      // console.log("Unregistering mirror canvas", layer.id);
      if (!canvas) return;
      unregisterMirrorCanvas(layer.id, canvas);
    };
  }, [registerMirrorCanvas, unregisterMirrorCanvas, layer.id]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute h-full w-full"
      data-layer-id={layer.id}
      data-testid="layer-mirror-canvas"
    />
  );
};

export default LayerMirrorCanvas;
