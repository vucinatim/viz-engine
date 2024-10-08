import { mirrorToCanvases } from '@/lib/comp-utils/mirror-to-canvases';
import useDebug from '@/lib/hooks/use-debug';
import useFrozenAudioData from '@/lib/hooks/use-frozen-audio-data';
import useOnResize from '@/lib/hooks/use-on-resize';
import useAudioStore from '@/lib/stores/audio-store';
import { LayerData } from '@/lib/stores/layer-store';
import { forwardRef, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';

interface LayerRendererProps {
  layer: LayerData;
}

const LayerRenderer = ({ layer }: LayerRendererProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const layerCanvasRef = useRef<HTMLCanvasElement>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);
  const { audioAnalyzer, wavesurfer } = useAudioStore();

  // Time tracking
  const lastFrameTimeRef = useRef(Date.now());

  // 3D refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // on panel resize, update canvas size
  useOnResize(canvasContainerRef, (entries, element) => {
    // If the canvas is not available, return
    console.log('Resizing canvas');
    if (!layerCanvasRef.current) return;
    const newestEntry = entries[entries.length - 1];

    const { width, height } = newestEntry.contentRect;
    console.log(`Setting canvas size to ${width}x${height}`);
    layerCanvasRef.current.width = width;
    layerCanvasRef.current.height = height;
    if (debugCanvasRef.current) {
      debugCanvasRef.current.width = width;
      debugCanvasRef.current.height = height;
    }

    if (sceneRef.current && cameraRef.current && rendererRef.current) {
      rendererRef.current.setSize(width, height);
      const camera = cameraRef.current;
      if (camera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    }
  });

  // Get the debug function
  const withDebug = useDebug(debugCanvasRef);

  // Get the function to get the next data array
  const getNextDataArray = useFrozenAudioData({
    isFrozen: layer.layerSettings.freeze,
    analyzer: audioAnalyzer,
    wavesurfer: wavesurfer,
  });

  const setup3D = useCallback(() => {
    if (!layer.comp.draw3D || !layerCanvasRef.current) return;

    console.log(`Setting up 3D renderer [${layer.comp.name}_${layer.id}]`);

    const renderer = new THREE.WebGLRenderer({
      canvas: layerCanvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(
      layerCanvasRef.current.clientWidth,
      layerCanvasRef.current.clientHeight,
    ); // Ensure renderer size matches the canvas size

    const scene = new THREE.Scene();
    if (layer.isDebugEnabled) {
      const gridHelper = new THREE.GridHelper(10, 10);
      scene.add(gridHelper);
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
    }
    const camera = new THREE.PerspectiveCamera(
      75,
      layerCanvasRef.current.clientWidth / layerCanvasRef.current.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    layer.comp.init3D?.({
      state: layer.comp.state,
      threeCtx: {
        renderer,
        scene,
        camera,
      },
      config: layer.config.getValues(),
      debugEnabled: layer.isDebugEnabled,
    });

    // Store the renderer, scene and camera for later use
    cameraRef.current = camera;
    sceneRef.current = scene;
    rendererRef.current = renderer;
  }, [layer.comp, layer.config, layer.id, layer.isDebugEnabled]);

  useEffect(() => {
    if (!audioAnalyzer || !layerCanvasRef.current) return;

    let renderFunction = null;

    if (layer.comp.draw3D) {
      // Setup the 3D renderer and the 3D draw function
      setup3D();

      renderFunction = (dataArray: Uint8Array, deltaTime: number) => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
          return;
        }
        layer.comp.draw3D?.({
          threeCtx: {
            renderer: rendererRef.current,
            scene: sceneRef.current,
            camera: cameraRef.current,
          },
          audioData: { dataArray, analyzer: audioAnalyzer },
          config: layer.config.getValues(),
          dt: deltaTime,
          state: layer.comp.state,
          debugEnabled: layer.isDebugEnabled,
        });
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      };
    } else {
      // Setup the 2D draw function
      const ctx = layerCanvasRef.current.getContext('2d');
      if (!ctx) return;
      renderFunction = (dataArray: Uint8Array, deltaTime: number) => {
        layer.comp.draw?.({
          canvasCtx: ctx,
          audioData: { dataArray, analyzer: audioAnalyzer },
          config: layer.config.getValues(),
          dt: deltaTime,
          state: layer.comp.state,
          debugEnabled: layer.isDebugEnabled,
        });
      };
    }

    const renderFrame = () => {
      const now = Date.now();
      const dt = (now - lastFrameTimeRef.current) / 1000.0; // time in seconds
      lastFrameTimeRef.current = now; // update last frame time

      const dataArray = getNextDataArray();

      withDebug(() => renderFunction(dataArray, dt), {
        dataArray: dataArray,
        wavesurfer: wavesurfer,
        config: layer.config.getValues(),
      });

      // Mirror the rendered canvas to other canvases
      mirrorToCanvases(layerCanvasRef.current, layer.mirrorCanvases);

      requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      // Cleanup renderer and other three.js resources when component unmounts or before reinitializing
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [
    audioAnalyzer,
    getNextDataArray,
    layer.comp,
    layer.config,
    layer.isDebugEnabled,
    layer.mirrorCanvases,
    setup3D,
    wavesurfer,
    withDebug,
  ]);

  return (
    <div ref={canvasContainerRef} className="absolute inset-0">
      <LayerCanvas layer={layer} ref={layerCanvasRef} />
      {layer.isDebugEnabled && (
        <canvas ref={debugCanvasRef} className="absolute h-full w-full" />
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
          mixBlendMode: layer.layerSettings.blendingMode,
        }}
      />
    );
  },
);

LayerCanvas.displayName = 'LayerCanvas';

export default LayerRenderer;
