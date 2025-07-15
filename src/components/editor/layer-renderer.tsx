import { mirrorToCanvases } from '@/lib/comp-utils/mirror-to-canvases';
import useAudioFrameData from '@/lib/hooks/use-audio-frame-data';
import useDebug from '@/lib/hooks/use-debug';
import useOnResize from '@/lib/hooks/use-on-resize';
import useAudioStore from '@/lib/stores/audio-store';
import { LayerData } from '@/lib/stores/layer-store';
import { forwardRef, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';

type RenderFunction = (data: {
  dt: number;
  audioData: { dataArray: Uint8Array; analyzer: AnalyserNode };
  config: Record<string, any>;
}) => void;

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
  const getNextAudioFrame = useAudioFrameData({
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
    const time = wavesurfer?.getCurrentTime() || 0;

    layer.comp.init3D?.({
      state: layer.state,
      threeCtx: {
        renderer,
        scene,
        camera,
      },
      config: layer.config.getValues({
        audioSignal: new Uint8Array(),
        frequencyData: new Uint8Array(),
        time,
        sampleRate: audioAnalyzer?.context.sampleRate || 44100,
        fftSize: audioAnalyzer?.fftSize || 2048,
      }),
      debugEnabled: layer.isDebugEnabled,
    });

    // Store the renderer, scene and camera for later use
    cameraRef.current = camera;
    sceneRef.current = scene;
    rendererRef.current = renderer;
  }, [
    audioAnalyzer?.context.sampleRate,
    audioAnalyzer?.fftSize,
    layer.comp,
    layer.config,
    layer.id,
    layer.isDebugEnabled,
    layer.state,
    wavesurfer,
  ]);

  useEffect(() => {
    if (!audioAnalyzer || !layerCanvasRef.current) return;

    let renderFunction: RenderFunction | null = null;

    if (layer.comp.draw3D) {
      // Setup the 3D renderer and the 3D draw function
      setup3D();

      renderFunction = (data) => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
          return;
        }
        layer.comp.draw3D?.({
          threeCtx: {
            renderer: rendererRef.current,
            scene: sceneRef.current,
            camera: cameraRef.current,
          },
          state: layer.state,
          debugEnabled: layer.isDebugEnabled,
          ...data,
        });
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      };
    } else {
      // Setup the 2D draw function
      const ctx = layerCanvasRef.current.getContext('2d');
      if (!ctx) return;
      renderFunction = (data) => {
        layer.comp.draw?.({
          canvasCtx: ctx,
          state: layer.state,
          debugEnabled: layer.isDebugEnabled,
          ...data,
        });
      };
    }

    const renderFrame = () => {
      const now = Date.now();
      const dt = (now - lastFrameTimeRef.current) / 1000.0; // time in seconds
      lastFrameTimeRef.current = now; // update last frame time

      const { frequencyData, timeDomainData, sampleRate, fftSize } =
        getNextAudioFrame();
      const time = wavesurfer?.getCurrentTime() || 0;

      const animInputData = {
        audioSignal: timeDomainData,
        frequencyData,
        time,
        sampleRate,
        fftSize,
      };

      withDebug(
        () =>
          renderFunction({
            dt,
            audioData: { dataArray: timeDomainData, analyzer: audioAnalyzer },
            config: layer.config.getValues(animInputData),
          }),
        {
          dataArray: timeDomainData,
          wavesurfer: wavesurfer,
          config: layer.config.getValues(animInputData),
        },
      );

      // Mirror the rendered canvas to other canvases
      mirrorToCanvases(layerCanvasRef.current, layer.mirrorCanvases);

      requestAnimationFrame(renderFrame);
    };

    renderFrame();

    console.log('Rendering frame USE EFFECT');
    return () => {
      // Cleanup renderer and other three.js resources when component unmounts or before reinitializing
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [audioAnalyzer, getNextAudioFrame, layer, setup3D, wavesurfer, withDebug]);

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
