'use client';

import { Comp } from '@/components/config/create-component';
import {
  StandaloneNetworkEvaluator,
  createDefaultNetworkEvaluators,
} from '@/lib/utils/standalone-network-evaluator';
import {
  createSyntheticAnalyzer,
  generateSyntheticFrequency,
  generateSyntheticTimeDomain,
  preloadAudioData,
} from '@/lib/utils/synthetic-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

interface CompPreviewProps {
  comp: Comp;
  isHovered: boolean;
  width?: number;
  height?: number;
}

const LOOP_DURATION = 5; // 5 second loop
const PREVIEW_RESOLUTION = 0.75; // Lower resolution for performance

const CompPreview = ({
  comp,
  isHovered,
  width = 160,
  height = 90,
}: CompPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const stateRef = useRef<any>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);

  // 3D refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);

  const syntheticAnalyzer = useRef(createSyntheticAnalyzer());

  // Network evaluators for animated parameters
  const networkEvaluatorsRef = useRef<Map<
    string,
    StandaloneNetworkEvaluator
  > | null>(null);

  // Preload audio data (defer to not block initial render)
  useEffect(() => {
    // Use requestIdleCallback if available, otherwise setTimeout
    const loadAudio = () => {
      preloadAudioData().then(() => {
        setAudioLoaded(true);
      });
    };

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(loadAudio);
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(loadAudio, 100);
      return () => clearTimeout(id);
    }
  }, []);

  // Initialize state and network evaluators once
  useEffect(() => {
    if (comp.createState && !stateRef.current) {
      stateRef.current = comp.createState();
    }

    // Initialize network evaluators from defaultNetworks
    if (comp.defaultNetworks && !networkEvaluatorsRef.current) {
      networkEvaluatorsRef.current = createDefaultNetworkEvaluators(
        comp.defaultNetworks,
      );
    }
  }, [comp]);

  // Setup 3D if needed
  const setup3D = useCallback(() => {
    if (!comp.draw3D || !canvasRef.current || rendererRef.current) return;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: false, // Disable for performance
      alpha: true,
    });

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    (renderer as any).useLegacyLights = false;
    renderer.shadowMap.enabled = false; // Disable shadows for preview

    const internalWidth = Math.round(width * PREVIEW_RESOLUTION);
    const internalHeight = Math.round(height * PREVIEW_RESOLUTION);

    canvasRef.current.width = internalWidth;
    canvasRef.current.height = internalHeight;
    renderer.setSize(internalWidth, internalHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const composer = new EffectComposer(renderer);
    const renderScene = new RenderPass(scene, camera);
    composer.addPass(renderScene);
    composerRef.current = composer;

    // Initialize with default config
    const frequencyData = generateSyntheticFrequency(0, LOOP_DURATION);
    const timeDomainData = generateSyntheticTimeDomain(0, LOOP_DURATION);

    comp.init3D?.({
      state: stateRef.current,
      threeCtx: {
        renderer,
        scene,
        camera,
        composer,
      },
      config: comp.config.getValues({
        audioSignal: timeDomainData,
        frequencyAnalysis: {
          frequencyData,
          sampleRate: syntheticAnalyzer.current.context.sampleRate,
          fftSize: syntheticAnalyzer.current.fftSize,
        },
        time: 0,
      }),
      debugEnabled: false,
    });

    cameraRef.current = camera;
    sceneRef.current = scene;
    rendererRef.current = renderer;
  }, [comp, width, height]);

  // Render a single frame (static or animated)
  const renderFrame = useCallback(
    (time: number) => {
      if (!canvasRef.current) return;

      const loopTime = time % LOOP_DURATION;
      const frequencyData = generateSyntheticFrequency(loopTime, LOOP_DURATION);
      const timeDomainData = generateSyntheticTimeDomain(
        loopTime,
        LOOP_DURATION,
      );

      const animInputData = {
        audioSignal: timeDomainData,
        frequencyData,
        time: loopTime,
        frequencyAnalysis: {
          frequencyData,
          sampleRate: syntheticAnalyzer.current.context.sampleRate,
          fftSize: syntheticAnalyzer.current.fftSize,
        },
      };

      // Get base config values
      const configValues = comp.config.getValues(animInputData);

      // Apply network-driven values if evaluators exist
      if (
        networkEvaluatorsRef.current &&
        networkEvaluatorsRef.current.size > 0
      ) {
        // Evaluate each network and override config values
        networkEvaluatorsRef.current.forEach((evaluator, paramPath) => {
          try {
            // The Output node returns the value directly, not wrapped
            const outputValue = evaluator.evaluate(animInputData);

            if (outputValue !== undefined) {
              // Handle nested paths (e.g., "group.param")
              const parts = paramPath.split('.');
              if (parts.length === 1) {
                configValues[paramPath] = outputValue;
              } else {
                // Navigate to nested object and set the value
                let current: any = configValues;
                for (let i = 0; i < parts.length - 1; i++) {
                  if (!current[parts[i]]) current[parts[i]] = {};
                  current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = outputValue;
              }
            }
          } catch (error) {
            console.warn(`[Preview] ${comp.name} - ${paramPath}:`, error);
          }
        });
      }

      if (comp.draw3D) {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
          setup3D();
          if (!rendererRef.current || !sceneRef.current || !cameraRef.current)
            return;
        }

        comp.draw3D({
          threeCtx: {
            renderer: rendererRef.current,
            scene: sceneRef.current,
            camera: cameraRef.current,
          },
          state: stateRef.current,
          debugEnabled: false,
          dt: 0.016, // Assume ~60fps
          audioData: {
            dataArray: frequencyData,
            analyzer: syntheticAnalyzer.current as any,
          },
          config: configValues,
        });

        if (composerRef.current) {
          composerRef.current.render();
        }
      } else if (comp.draw) {
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        comp.draw({
          canvasCtx: ctx,
          state: stateRef.current,
          debugEnabled: false,
          dt: 0.016,
          audioData: {
            dataArray: frequencyData,
            analyzer: syntheticAnalyzer.current as any,
          },
          config: configValues,
        });
      }
    },
    [comp, setup3D],
  );

  // Animation loop for hover state
  useEffect(() => {
    if (isHovered) {
      startTimeRef.current = performance.now() / 1000;

      const animate = () => {
        const currentTime = performance.now() / 1000 - startTimeRef.current;
        renderFrame(currentTime);
        rafIdRef.current = requestAnimationFrame(animate);
      };

      rafIdRef.current = requestAnimationFrame(animate);
    } else {
      // Stop animation and render static frame
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // Render one frame at time=0
      renderFrame(0);
    }

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isHovered, renderFrame]);

  // Initial render when component mounts
  useEffect(() => {
    if (comp.draw3D) {
      setup3D();
    }
    renderFrame(0);

    return () => {
      // Cleanup
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      sceneRef.current = null;
      cameraRef.current = null;
      composerRef.current = null;
    };
  }, [comp, setup3D, renderFrame]);

  // Re-render when audio loads
  useEffect(() => {
    if (audioLoaded) {
      renderFrame(0);
    }
  }, [audioLoaded, renderFrame]);

  return (
    <div
      className="relative"
      style={{ width: `${width}px`, height: `${height}px` }}>
      <canvas
        ref={canvasRef}
        className="rounded border border-zinc-700 bg-black"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
      {!audioLoaded && (
        <div className="absolute inset-0 flex items-center justify-center rounded border border-zinc-700 bg-black/80 text-xs text-zinc-500">
          Loading...
        </div>
      )}
    </div>
  );
};

export default CompPreview;
