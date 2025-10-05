import { mirrorToCanvases } from '@/lib/comp-utils/mirror-to-canvases';
import useAudioFrameData from '@/lib/hooks/use-audio-frame-data';
import useDebug from '@/lib/hooks/use-debug';
import useOnResize from '@/lib/hooks/use-on-resize';
import useAudioStore from '@/lib/stores/audio-store';
import useEditorStore from '@/lib/stores/editor-store';
import { LayerData } from '@/lib/stores/layer-store';
import { forwardRef, memo, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

// Custom hook to track dependency changes for debugging
const useDependencyTracker = (
  deps: any[],
  depNames: string[],
  name: string,
) => {
  const prevDepsRef = useRef<any[]>();
  const callCountRef = useRef(0);

  useEffect(() => {
    if (prevDepsRef.current) {
      const changedDeps: {
        index: number;
        name: string;
        prev: any;
        next: any;
      }[] = [];

      deps.forEach((dep, index) => {
        const prevDep = prevDepsRef.current![index];
        if (prevDep !== dep) {
          changedDeps.push({
            index,
            name: depNames[index] || `dependency-${index}`,
            prev: prevDep,
            next: dep,
          });
        }
      });

      if (changedDeps.length > 0) {
        console.group(
          `🔄 ${name} callback recreated (call #${++callCountRef.current})`,
        );
        console.log('Changed dependencies:');
        changedDeps.forEach(({ index, name, prev, next }) => {
          console.log(`  [${index}] ${name}:`, { prev, next });
        });
        console.log(
          'All dependencies:',
          deps.map((dep, i) => ({
            name: depNames[i] || `dep-${i}`,
            value: dep,
          })),
        );
        console.groupEnd();
      }
    } else {
      console.log(
        `🆕 ${name} callback created (call #${++callCountRef.current})`,
      );
    }

    prevDepsRef.current = [...deps];
  }, deps);

  return callCountRef.current;
};

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
  const { resolutionMultiplier, playerRef, playerFPS } = useEditorStore();

  // Time tracking
  const lastFrameTimeRef = useRef(
    typeof performance !== 'undefined' ? performance.now() : Date.now(),
  );
  const rafIdRef = useRef<number | null>(null);

  // 3D refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Post-processing ref
  const composerRef = useRef<EffectComposer | null>(null);

  // on panel resize, update canvas size
  useOnResize(canvasContainerRef, (entries, element) => {
    console.log('Resizing canvas');
    if (!layerCanvasRef.current) return;
    const newestEntry = entries[entries.length - 1];

    const { width, height } = newestEntry.contentRect;

    // Calculate the new internal resolution based on the multiplier
    const newWidth = Math.round(width * resolutionMultiplier);
    const newHeight = Math.round(height * resolutionMultiplier);

    console.log(
      `Display: ${width}x${height}, Resolution: ${newWidth}x${newHeight} (${resolutionMultiplier}x)`,
    );

    // Set the canvas internal bitmap size (this is what changes with multiplier)
    layerCanvasRef.current.width = newWidth;
    layerCanvasRef.current.height = newHeight;

    if (debugCanvasRef.current) {
      debugCanvasRef.current.width = newWidth;
      debugCanvasRef.current.height = newHeight;
    }

    if (sceneRef.current && cameraRef.current && rendererRef.current) {
      // *** THE FIX ***
      // The third parameter 'false' tells setSize NOT to update the canvas's CSS style.
      // This allows our CSS classes ('h-full', 'w-full') to control the display size.
      rendererRef.current.setSize(newWidth, newHeight, false);

      const camera = cameraRef.current;
      if (camera) {
        // The camera's aspect ratio should always be based on the DISPLAY size.
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      // Update post-processing composer size if it exists
      if (composerRef.current) {
        composerRef.current.setSize(newWidth, newHeight);
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

  // Use refs for frequently changing values that don't need to trigger full 3D recreation
  const layerStateRef = useRef(layer.state);
  const layerDebugEnabledRef = useRef(layer.isDebugEnabled);

  // Update refs when values change (but don't trigger callback recreation)
  useEffect(() => {
    layerStateRef.current = layer.state;
  }, [layer.state]);

  useEffect(() => {
    layerDebugEnabledRef.current = layer.isDebugEnabled;
  }, [layer.isDebugEnabled]);

  // Track setup3D dependencies for debugging
  // Removed wavesurfer, layer.state, and layer.isDebugEnabled since they're accessed via refs
  // These only need to trigger recreation when the component or config structure changes
  const setup3DDeps = [
    audioAnalyzer?.context.sampleRate,
    audioAnalyzer?.fftSize,
    layer.comp,
    layer.config,
    resolutionMultiplier,
  ];

  // Add descriptive names for each dependency to make debugging easier
  const setup3DDepNames = [
    'audioAnalyzer.sampleRate',
    'audioAnalyzer.fftSize',
    'layer.comp',
    'layer.config',
    'resolutionMultiplier',
  ];

  const setup3DCallCount = useDependencyTracker(
    setup3DDeps,
    setup3DDepNames,
    'setup3D',
  );

  const setup3D = useCallback(() => {
    if (!layer.comp.draw3D || !layerCanvasRef.current) return;

    console.log(
      `🚀 setup3D executing (call #${setup3DCallCount}) for layer: ${layer.comp.name}`,
    );

    // Add stack trace to see what's calling setup3D
    console.trace('setup3D execution call stack:');

    const renderer = new THREE.WebGLRenderer({
      canvas: layerCanvasRef.current,
      antialias: true,
      alpha: true,
    });

    // Improve color fidelity and contrast
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    // three@0.164+ defaults to physically correct; keep legacy off
    (renderer as any).useLegacyLights = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const containerWidth = layerCanvasRef.current.clientWidth;
    const containerHeight = layerCanvasRef.current.clientHeight;

    // Calculate the initial internal resolution based on the multiplier
    const newWidth = Math.round(containerWidth * resolutionMultiplier);
    const newHeight = Math.round(containerHeight * resolutionMultiplier);

    // Set the canvas internal bitmap size
    layerCanvasRef.current.width = newWidth;
    layerCanvasRef.current.height = newHeight;

    // *** THE FIX ***
    // The third parameter 'false' tells setSize NOT to update the canvas's CSS style.
    renderer.setSize(newWidth, newHeight, false);

    const scene = new THREE.Scene();
    if (layerDebugEnabledRef.current) {
      const gridHelper = new THREE.GridHelper(10, 10);
      scene.add(gridHelper);
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
    }
    const camera = new THREE.PerspectiveCamera(
      75,
      containerWidth / containerHeight, // Aspect ratio uses display size
      0.1,
      1000,
    );
    camera.position.set(0, 0, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    // Use fallback time for initial setup - actual time is handled in render loop
    const time = 0;

    // Setup post-processing composer for 3D components
    // Component can add its own passes in init3D
    const composer = new EffectComposer(renderer);
    const renderScene = new RenderPass(scene, camera);
    composer.addPass(renderScene);
    composerRef.current = composer;

    console.log('init3D called', layer.comp.name);
    layer.comp.init3D?.({
      state: layerStateRef.current,
      threeCtx: {
        renderer,
        scene,
        camera,
        composer,
      },
      config: layer.config.getValues({
        audioSignal: new Uint8Array(),
        frequencyAnalysis: {
          frequencyData: new Uint8Array(),
          sampleRate: audioAnalyzer?.context.sampleRate || 44100,
          fftSize: audioAnalyzer?.fftSize || 2048,
        },
        time,
      }),
      debugEnabled: layerDebugEnabledRef.current,
    });

    // Store the renderer, scene and camera for later use
    cameraRef.current = camera;
    sceneRef.current = scene;
    rendererRef.current = renderer;
  }, setup3DDeps);

  // Use refs for frequently changing values that don't need to trigger full render setup recreation
  const layerSettingsRef = useRef(layer.layerSettings);
  const mirrorCanvasesRef = useRef(layer.mirrorCanvases);
  const wavesurferRef = useRef(wavesurfer);

  // Update refs when values change (but don't trigger effect recreation)
  useEffect(() => {
    layerSettingsRef.current = layer.layerSettings;
  }, [layer.layerSettings]);

  useEffect(() => {
    mirrorCanvasesRef.current = layer.mirrorCanvases;
  }, [layer.mirrorCanvases]);

  useEffect(() => {
    wavesurferRef.current = wavesurfer;
  }, [wavesurfer]);

  // Track useEffect dependencies for debugging
  // Removed layer.layerSettings, layer.mirrorCanvases, and wavesurfer since they're accessed via refs
  // These only need to trigger recreation when the component structure changes, not UI settings
  const renderEffectDeps = [
    audioAnalyzer,
    getNextAudioFrame,
    layer.id,
    layer.comp,
    layer.config,
    layer.isExpanded,
    layer.isDebugEnabled,
    setup3D,
    withDebug,
    playerRef,
    playerFPS,
  ];

  const renderEffectDepNames = [
    'audioAnalyzer',
    'getNextAudioFrame',
    'layer.id',
    'layer.comp',
    'layer.config',
    'layer.isExpanded',
    'layer.isDebugEnabled',
    'setup3D',
    'withDebug',
    'playerRef',
    'playerFPS',
  ];

  const renderEffectCallCount = useDependencyTracker(
    renderEffectDeps,
    renderEffectDepNames,
    'renderEffect (calls setup3D)',
  );

  useEffect(() => {
    console.log(
      `🎬 renderEffect executing (call #${renderEffectCallCount}) for layer: ${layer.comp.name}`,
    );

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
          state: layerStateRef.current,
          debugEnabled: layerDebugEnabledRef.current,
          ...data,
        });

        // Render with composer (post-processing handled by component)
        if (composerRef.current) {
          composerRef.current.render();
        }
      };
    } else {
      // Setup the 2D draw function
      const ctx = layerCanvasRef.current.getContext('2d');
      if (!ctx) return;
      renderFunction = (data) => {
        layer.comp.draw?.({
          canvasCtx: ctx,
          state: layerStateRef.current,
          debugEnabled: layerDebugEnabledRef.current,
          ...data,
        });
      };
    }

    const renderFrame = () => {
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const dt = (now - lastFrameTimeRef.current) / 1000.0; // time in seconds
      lastFrameTimeRef.current = now; // update last frame time

      const { frequencyData, timeDomainData, sampleRate, fftSize } =
        getNextAudioFrame();
      // Prefer Remotion Player's clock to drive animation time; fallback to WaveSurfer
      const frame = playerRef?.current?.getCurrentFrame?.() ?? null;
      const time =
        frame !== null && typeof frame === 'number' && playerFPS > 0
          ? frame / playerFPS
          : wavesurferRef.current?.getCurrentTime() || 0;

      const animInputData = {
        audioSignal: timeDomainData,
        frequencyData,
        time,
        frequencyAnalysis: {
          frequencyData,
          sampleRate,
          fftSize,
        },
      };

      const configValues = layer.config.getValues(animInputData);
      withDebug(
        () =>
          renderFunction?.({
            dt,
            audioData: { dataArray: frequencyData, analyzer: audioAnalyzer },
            config: configValues,
          }),
        {
          dataArray: frequencyData,
          wavesurfer: wavesurferRef.current,
          config: configValues,
        },
      );

      // Mirror the rendered canvas to preview canvases
      if (layer.mirrorCanvases && layer.mirrorCanvases.length > 0) {
        mirrorToCanvases(layerCanvasRef.current, layer.mirrorCanvases);
      }

      rafIdRef.current = requestAnimationFrame(renderFrame);
    };

    rafIdRef.current = requestAnimationFrame(renderFrame);
    return () => {
      // Cleanup renderer and other three.js resources when component unmounts or before reinitializing
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, renderEffectDeps);

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
          mixBlendMode: layer.layerSettings.blendingMode, // Cast to any to support non-standard values
        }}
      />
    );
  },
);

LayerCanvas.displayName = 'LayerCanvas';

LayerRenderer.displayName = 'LayerRenderer';

export default memo(LayerRenderer);
