import useProfilerStore from '@/lib/stores/profiler-store';
import { useEffect, useRef } from 'react';

/**
 * Hook to track FPS for an individual layer
 * Call this in each LayerRenderer component
 */
export function useLayerFPSTracker(layerId: string, layerName: string) {
  const removeLayerFPS = useProfilerStore((s) => s.removeLayerFPS);

  const frameCountRef = useRef(0);
  const fpsUpdateTimeRef = useRef(performance.now());
  const renderStartTimeRef = useRef(0);
  const lastRenderTimeRef = useRef(0);
  const drawCallsRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Check if enabled at cleanup time
      const enabled = useProfilerStore.getState().enabled;
      if (enabled) {
        removeLayerFPS(layerId);
      }
    };
  }, [layerId, removeLayerFPS]);

  // Return a function to call before and after render
  return {
    /**
     * Call this right before starting the layer render
     */
    startRender: () => {
      // Check enabled state dynamically each time
      const enabled = useProfilerStore.getState().enabled;
      if (!enabled) return;
      renderStartTimeRef.current = performance.now();
    },

    /**
     * Call this right after finishing the layer render
     * @param drawCalls - Optional number of draw calls made this frame
     */
    endRender: (drawCalls: number = 0) => {
      // Check enabled state dynamically each time
      const enabled = useProfilerStore.getState().enabled;
      if (!enabled) return;

      const now = performance.now();
      const renderTime = now - renderStartTimeRef.current;
      lastRenderTimeRef.current = renderTime;
      drawCallsRef.current = drawCalls;

      frameCountRef.current++;

      // Update FPS every 500ms
      if (now - fpsUpdateTimeRef.current >= 500) {
        const elapsed = (now - fpsUpdateTimeRef.current) / 1000;
        const fps = frameCountRef.current / elapsed;

        // Get the update function at call time
        const updateLayerFPS = useProfilerStore.getState().updateLayerFPS;
        updateLayerFPS(
          layerId,
          layerName,
          fps,
          lastRenderTimeRef.current,
          drawCallsRef.current,
        );

        // Reset counters
        frameCountRef.current = 0;
        fpsUpdateTimeRef.current = now;
      }
    },
  };
}
