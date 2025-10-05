import useLayerStore, { LayerData } from '@/lib/stores/layer-store';
import { useEffect, useRef } from 'react';
import { LayerCanvas } from './layer-renderer';

interface LayerMirrorCanvasProps {
  layer: LayerData;
}

const LayerMirrorCanvas = ({ layer }: LayerMirrorCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { registerMirrorCanvas, unregisterMirrorCanvas } = useLayerStore();

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
