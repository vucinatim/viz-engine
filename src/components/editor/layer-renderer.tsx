import type {
  LayerData,
  LayerRuntimeDebugAttachment,
} from '@/lib/editor-layer-types';
import {
  createEditorRuntimePreviewAttachment,
  type EditorRuntimePreviewAttachment,
} from '@/lib/editor-runtime-preview-attachment';
import useDebug from '@/lib/hooks/use-debug';
import { useLayerFPSTracker } from '@/lib/hooks/use-layer-fps-tracker';
import useOnResize from '@/lib/hooks/use-on-resize';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import useEditorStore from '@/lib/stores/editor-store';
import { studioThreeProgramRegistry } from '@/lib/viz-capabilities';
import { memo, useEffect, useRef } from 'react';

interface LayerDebugRendererProps {
  layer: LayerData;
  resolutionMultiplier: number;
}

const LayerDebugRenderer = ({
  layer,
  resolutionMultiplier,
}: LayerDebugRendererProps) => {
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);
  const debugContainerRef = useRef<HTMLDivElement>(null);
  const withDebug = useDebug(debugCanvasRef, resolutionMultiplier);
  const profiler = useLayerFPSTracker(layer.id, layer.comp.name);
  const registerDebugAttachment = useEditorRuntimePreviewAttachmentStore(
    (state) => state.registerDebugAttachment,
  );
  const unregisterDebugAttachment = useEditorRuntimePreviewAttachmentStore(
    (state) => state.unregisterDebugAttachment,
  );
  const layerRef = useRef(layer);
  layerRef.current = layer;

  useOnResize(debugContainerRef, (entries) => {
    const width = entries.at(-1)?.contentRect.width ?? 0;
    const canvas = debugCanvasRef.current;
    if (!canvas || width <= 0) {
      return;
    }
    const pixelWidth = Math.max(1, Math.round(width * resolutionMultiplier));
    if (canvas.width !== pixelWidth) {
      canvas.width = pixelWidth;
    }
  });

  useEffect(() => {
    const attachment: LayerRuntimeDebugAttachment = {
      render: ({ audioFrameData, layerPlan, stats }) => {
        if (stats) {
          profiler.recordRender(stats.milliseconds, stats.drawCalls);
        }
        const currentLayer = layerRef.current;
        withDebug(() => undefined, {
          dataArray: audioFrameData.frequencyData,
          config:
            layerPlan.resolvedSettings ??
            layerPlan.settings ??
            currentLayer.values,
          configSchema: currentLayer.comp.authoring.settings,
          renderMilliseconds: stats?.milliseconds,
        });
      },
    };
    registerDebugAttachment(layer.id, attachment);
    return () => unregisterDebugAttachment(layer.id, attachment);
  }, [
    layer.id,
    profiler,
    registerDebugAttachment,
    unregisterDebugAttachment,
    withDebug,
  ]);

  if (!layer.isDebugEnabled) {
    return null;
  }

  return (
    <>
      <div className="absolute inset-0 w-[300px] border-r border-white/10 bg-black/60" />
      <div
        ref={debugContainerRef}
        data-testid="layer-debug-overlay"
        data-layer-id={layer.id}
        className="scrollbar-hide pointer-events-none absolute inset-0 overflow-y-auto">
        <canvas
          ref={debugCanvasRef}
          data-testid="layer-debug-canvas"
          className="pointer-events-auto w-full"
        />
      </div>
    </>
  );
};

interface LayerRendererProps {
  layers: LayerData[];
}

const LayerRenderer = ({ layers }: LayerRendererProps) => {
  const resolutionMultiplier = useEditorStore(
    (state) => state.resolutionMultiplier,
  );
  const registerPreviewAttachment = useEditorRuntimePreviewAttachmentStore(
    (state) => state.registerPreviewAttachment,
  );
  const updatePreviewLayerIds = useEditorRuntimePreviewAttachmentStore(
    (state) => state.updatePreviewLayerIds,
  );
  const unregisterPreviewAttachment = useEditorRuntimePreviewAttachmentStore(
    (state) => state.unregisterPreviewAttachment,
  );
  const mirrorCanvasesByLayerId = useEditorRuntimePreviewAttachmentStore(
    (state) => state.mirrorCanvasesByLayerId,
  );
  const compositeMirrorCanvases = useEditorRuntimePreviewAttachmentStore(
    (state) => state.compositeMirrorCanvases,
  );
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewAttachmentRef = useRef<EditorRuntimePreviewAttachment | null>(
    null,
  );
  const layersRef = useRef(layers);
  const mirrorCanvasesRef = useRef(mirrorCanvasesByLayerId);
  const compositeMirrorCanvasesRef = useRef(compositeMirrorCanvases);
  layersRef.current = layers;
  mirrorCanvasesRef.current = mirrorCanvasesByLayerId;
  compositeMirrorCanvasesRef.current = compositeMirrorCanvases;

  useOnResize(canvasContainerRef, (entries) => {
    const newestEntry = entries.at(-1);
    if (!newestEntry) {
      return;
    }
    previewAttachmentRef.current?.resize(
      newestEntry.contentRect.width,
      newestEntry.contentRect.height,
    );
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const attachment = createEditorRuntimePreviewAttachment({
      layers: layersRef.current,
      canvas,
      resolutionMultiplier,
      getMirrorCanvasesByLayerId: () => mirrorCanvasesRef.current,
      getCompositeMirrorCanvases: () => compositeMirrorCanvasesRef.current,
      programRegistry: studioThreeProgramRegistry,
    });
    previewAttachmentRef.current = attachment;
    if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
      attachment.resize(canvas.clientWidth, canvas.clientHeight);
    }
    registerPreviewAttachment(
      attachment,
      layersRef.current.map((layer) => layer.id),
    );

    return () => {
      unregisterPreviewAttachment(attachment);
      attachment.destroy();
      previewAttachmentRef.current = null;
    };
  }, [
    registerPreviewAttachment,
    resolutionMultiplier,
    unregisterPreviewAttachment,
  ]);

  useEffect(() => {
    previewAttachmentRef.current?.updateLayers(layers);
    updatePreviewLayerIds(layers.map((layer) => layer.id));
  }, [layers, updatePreviewLayerIds]);

  return (
    <div ref={canvasContainerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute h-full w-full"
        data-runtime-preview-canvas
      />
      {layers.map((layer) => (
        <LayerDebugRenderer
          key={layer.id}
          layer={layer}
          resolutionMultiplier={resolutionMultiplier}
        />
      ))}
    </div>
  );
};

LayerRenderer.displayName = 'LayerRenderer';

export default memo(LayerRenderer);
