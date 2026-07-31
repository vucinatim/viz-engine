import { LayerData } from '@/lib/editor-layer-types';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import { useEffect, useRef } from 'react';

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

  return <canvas ref={canvasRef} className="absolute h-full w-full" />;
};

export default LayerMirrorCanvas;
