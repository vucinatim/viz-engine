'use client';

import { Comp } from '@/components/config/create-component';
import {
  createEditorComponentPreviewPlan,
} from '@/lib/editor-component-preview-plan';
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
import {
  createVizThreePreviewController,
  type VizThreePreviewController,
} from '@viz-engine/renderer-three';

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
  const [audioLoaded, setAudioLoaded] = useState(false);

  const runtimeControllerRef = useRef<VizThreePreviewController | null>(null);

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

  // Initialize network evaluators once
  useEffect(() => {
    if (comp.defaultNetworks && !networkEvaluatorsRef.current) {
      networkEvaluatorsRef.current = createDefaultNetworkEvaluators(
        comp.defaultNetworks,
      );
    }
  }, [comp]);

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

      const internalWidth = Math.round(width * PREVIEW_RESOLUTION);
      const internalHeight = Math.round(height * PREVIEW_RESOLUTION);
      const runtimeRenderPlan = createEditorComponentPreviewPlan({
        comp,
        viewportWidth: internalWidth,
        viewportHeight: internalHeight,
        time: loopTime,
        configValues,
        audioFrameData: {
          frequencyData,
          sampleRate: syntheticAnalyzer.current.context.sampleRate,
          fftSize: syntheticAnalyzer.current.fftSize,
        },
      });
      if (!runtimeControllerRef.current) {
        canvasRef.current.width = internalWidth;
        canvasRef.current.height = internalHeight;
      }
      if (runtimeControllerRef.current) {
        runtimeControllerRef.current.update(runtimeRenderPlan);
      } else {
        runtimeControllerRef.current = createVizThreePreviewController({
          canvas: canvasRef.current,
          renderPlan: runtimeRenderPlan,
        });
      }
    },
    [comp, height, width],
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
    renderFrame(0);

    return () => {
      // Cleanup
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      runtimeControllerRef.current?.dispose();
      runtimeControllerRef.current = null;
    };
  }, [comp, renderFrame]);

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
