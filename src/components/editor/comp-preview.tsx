import { Comp } from '@/components/config/create-component';
import { createEditorComponentPreviewPlan } from '@/lib/editor-component-preview-plan';
import {
  createSyntheticAnalyzer,
  generateSyntheticFrequency,
  generateSyntheticTimeDomain,
  preloadAudioData,
} from '@/lib/utils/synthetic-audio';
import { studioThreeProgramRegistry } from '@/lib/viz-capabilities';
import {
  createVizThreeRenderHost,
  type VizThreeRenderHost,
} from '@viz-engine/renderer-three';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [failure, setFailure] = useState<string | null>(null);

  const runtimeControllerRef = useRef<VizThreeRenderHost | null>(null);

  const syntheticAnalyzer = useRef(createSyntheticAnalyzer());

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

  // Render a single frame (static or animated)
  const renderFrame = useCallback(
    (time: number) => {
      if (!canvasRef.current) return false;

      try {
        const loopTime = time % LOOP_DURATION;
        const frequencyData = generateSyntheticFrequency(
          loopTime,
          LOOP_DURATION,
        );
        const timeDomainData = generateSyntheticTimeDomain(
          loopTime,
          LOOP_DURATION,
        );

        const internalWidth = Math.round(width * PREVIEW_RESOLUTION);
        const internalHeight = Math.round(height * PREVIEW_RESOLUTION);
        const runtimeRenderPlan = createEditorComponentPreviewPlan({
          comp,
          viewportWidth: internalWidth,
          viewportHeight: internalHeight,
          time: loopTime,
          configValues: comp.defaultValues,
          audioFrameData: {
            frequencyData,
            timeDomainData,
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
          runtimeControllerRef.current = createVizThreeRenderHost({
            canvas: canvasRef.current,
            renderPlan: runtimeRenderPlan,
            programRegistry: studioThreeProgramRegistry,
          });
        }
        return true;
      } catch (error) {
        runtimeControllerRef.current?.dispose();
        runtimeControllerRef.current = null;
        setFailure(
          error instanceof Error ? error.message : 'Preview rendering failed.',
        );
        return false;
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
        rafIdRef.current = renderFrame(currentTime)
          ? requestAnimationFrame(animate)
          : null;
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
    setFailure(null);
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
      {failure && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded border border-red-500/40 bg-black/90 px-2 text-center text-[10px] leading-tight text-red-300"
          title={failure}>
          Preview unavailable
        </div>
      )}
    </div>
  );
};

export default CompPreview;
