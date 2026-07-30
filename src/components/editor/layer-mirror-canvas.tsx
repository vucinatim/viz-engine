import { LayerData } from '@/lib/stores/editor-layer-projection-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import { useEffect, useRef } from 'react';
import { LayerCanvas } from './layer-renderer';

interface LayerMirrorCanvasProps {
  layer: LayerData;
}

const LayerMirrorCanvas = ({ layer }: LayerMirrorCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const registerMirrorCanvas = useEditorRuntimePreviewAttachmentStore(
    (s) => s.registerMirrorCanvas,
  );
  const unregisterMirrorCanvas = useEditorRuntimePreviewAttachmentStore(
    (s) => s.unregisterMirrorCanvas,
  );

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
  }, [canvasRef, registerMirrorCanvas, unregisterMirrorCanvas, layer.id]);

  return <LayerCanvas layer={layer} ref={canvasRef} />;
};

export default LayerMirrorCanvas;
