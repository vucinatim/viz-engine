import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import { useEffect, useRef } from 'react';

const CompositeMirrorCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const register = useEditorRuntimePreviewAttachmentStore(
    (state) => state.registerCompositeMirrorCanvas,
  );
  const unregister = useEditorRuntimePreviewAttachmentStore(
    (state) => state.unregisterCompositeMirrorCanvas,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    register(canvas);
    return () => unregister(canvas);
  }, [register, unregister]);

  return <canvas ref={canvasRef} className="absolute h-full w-full" />;
};

export default CompositeMirrorCanvas;
