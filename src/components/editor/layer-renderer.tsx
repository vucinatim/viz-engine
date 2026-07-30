import { installEditorRuntimeHostAttachments } from '@/lib/editor-runtime-host-attachments';
import {
  createEditorRuntimePreviewAttachment,
  EditorRuntimePreviewAttachment,
} from '@/lib/editor-runtime-preview-attachment';
import useDebug from '@/lib/hooks/use-debug';
import { useLayerFPSTracker } from '@/lib/hooks/use-layer-fps-tracker';
import useOnResize from '@/lib/hooks/use-on-resize';
import { LayerData } from '@/lib/stores/editor-layer-projection-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import useEditorStore from '@/lib/stores/editor-store';
import { studioThreeProgramRegistry } from '@/lib/viz-capabilities';
import { forwardRef, memo, useEffect, useRef } from 'react';

const EMPTY_MIRROR_CANVASES: HTMLCanvasElement[] = [];

interface LayerRendererProps {
  layer: LayerData;
}

const LayerRenderer = ({ layer }: LayerRendererProps) => {
  const resolutionMultiplier = useEditorStore((s) => s.resolutionMultiplier);
  const registerLayerAttachment = useEditorRuntimePreviewAttachmentStore(
    (s) => s.registerLayerAttachment,
  );
  const unregisterLayerAttachment = useEditorRuntimePreviewAttachmentStore(
    (s) => s.unregisterLayerAttachment,
  );
  const mirrorCanvases = useEditorRuntimePreviewAttachmentStore(
    (state) => state.mirrorCanvasesByLayerId[layer.id] ?? EMPTY_MIRROR_CANVASES,
  );

  // Profiler tracking for this layer
  const layerFPSTracker = useLayerFPSTracker(layer.id, layer.comp.name);

  const debugCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const layerCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewAttachmentRef = useRef<EditorRuntimePreviewAttachment | null>(
    null,
  );

  // on panel resize, update canvas size
  useOnResize(canvasContainerRef, (entries) => {
    const previewAttachment = previewAttachmentRef.current;
    if (!previewAttachment) return;
    const newestEntry = entries[entries.length - 1];

    const { width, height } = newestEntry.contentRect;
    previewAttachment.resize(width, height);
  });

  // Get the debug function
  const withDebug = useDebug(debugCanvasRef, resolutionMultiplier);

  const mirrorCanvasesRef = useRef<HTMLCanvasElement[]>([]);

  // Update refs when values change (but don't trigger effect recreation)
  useEffect(() => {
    mirrorCanvasesRef.current = mirrorCanvases;
  }, [mirrorCanvases]);

  useEffect(() => {
    if (!layerCanvasRef.current) return;
    const previewAttachment = createEditorRuntimePreviewAttachment({
      layer,
      canvas: layerCanvasRef.current,
      debugCanvas: debugCanvasRef.current,
      resolutionMultiplier,
      withDebug,
      getMirrorCanvases: () => mirrorCanvasesRef.current,
      profiler: layerFPSTracker,
      programRegistry: studioThreeProgramRegistry,
    });
    previewAttachmentRef.current = previewAttachment;
    const removeHostAttachments = installEditorRuntimeHostAttachments({
      layer,
      preview: previewAttachment,
    });

    const displayWidth = layerCanvasRef.current.clientWidth;
    const displayHeight = layerCanvasRef.current.clientHeight;
    if (displayWidth > 0 && displayHeight > 0) {
      previewAttachment.resize(displayWidth, displayHeight);
    }

    registerLayerAttachment(layer.id, previewAttachment);

    return () => {
      removeHostAttachments();
      previewAttachment.destroy();
      previewAttachmentRef.current = null;
      unregisterLayerAttachment(layer.id);
    };
  }, [
    layer.id,
    layer.comp,
    layer.config,
    layer,
    layerFPSTracker,
    resolutionMultiplier,
    withDebug,
    registerLayerAttachment,
    unregisterLayerAttachment,
  ]);

  return (
    <div ref={canvasContainerRef} className="absolute inset-0">
      <LayerCanvas layer={layer} ref={layerCanvasRef} />
      {layer.isDebugEnabled && (
        <>
          <div className="absolute inset-0 w-[300px] border-r border-white/10 bg-black/60" />
          <div className="scrollbar-hide pointer-events-none absolute inset-0 overflow-y-auto">
            <canvas
              ref={debugCanvasRef}
              className="pointer-events-auto w-full"
            />
          </div>
        </>
      )}
    </div>
  );
};

interface LayerCanvasProps {
  layer: LayerData;
}

export const LayerCanvas = forwardRef<HTMLCanvasElement, LayerCanvasProps>(
  ({ layer }, ref) => {
    return (
      <canvas
        ref={ref}
        className="absolute h-full w-full"
        style={{
          opacity: layer.layerSettings.opacity,
          background: `${layer.layerSettings.background}`,
          display: layer.layerSettings.visible ? 'block' : 'none',
          mixBlendMode: layer.layerSettings.blendingMode, // Cast to any to support non-standard values
        }}
      />
    );
  },
);

LayerCanvas.displayName = 'LayerCanvas';

LayerRenderer.displayName = 'LayerRenderer';

export default memo(LayerRenderer);
