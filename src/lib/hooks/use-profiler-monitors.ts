import useProfilerStore from '@/lib/stores/profiler-store';
import { getVizSessionState, vizSessionActions } from '@/lib/viz-session';
import { useEffect, useRef } from 'react';

// Constants for update intervals (in ms)
const TELEMETRY_UPDATE_INTERVAL = 500;
const MEMORY_UPDATE_INTERVAL = 1000;
const INDEXEDDB_UPDATE_INTERVAL = 5000; // Update IndexedDB every 5 seconds
const MAX_FOREGROUND_FRAME_INTERVAL = 250;

/**
 * Hook to monitor memory usage using Performance API
 * Only works in Chrome/Edge with performance.memory available
 */
function useMemoryMonitor() {
  const updateMemory = useProfilerStore((s) => s.updateMemory);
  const enabled = useProfilerStore((s) => s.enabled);

  useEffect(() => {
    if (!enabled) return;

    // Check if performance.memory is available (Chrome/Edge only)
    if (!(performance as any).memory) {
      console.warn('Performance memory API not available in this browser');
      return;
    }

    const updateMemoryMetrics = () => {
      // Read performance.memory FRESH each time - don't cache the reference!
      const perfMemory = (performance as any).memory;
      const usedJSHeapSize = perfMemory.usedJSHeapSize / (1024 * 1024); // Convert to MB
      const totalJSHeapSize = perfMemory.totalJSHeapSize / (1024 * 1024);
      const jsHeapSizeLimit = perfMemory.jsHeapSizeLimit / (1024 * 1024);
      const percentage = (usedJSHeapSize / jsHeapSizeLimit) * 100;

      updateMemory({
        usedJSHeapSize,
        totalJSHeapSize,
        jsHeapSizeLimit,
        percentage,
      });
    };

    // Initial update
    updateMemoryMetrics();

    // Set up interval
    const intervalId = setInterval(updateMemoryMetrics, MEMORY_UPDATE_INTERVAL);

    return () => clearInterval(intervalId);
  }, [enabled, updateMemory]);
}

/**
 * Hook to monitor IndexedDB storage usage
 */
function useIndexedDBMonitor() {
  const updateIndexedDB = useProfilerStore((s) => s.updateIndexedDB);
  const enabled = useProfilerStore((s) => s.enabled);

  useEffect(() => {
    if (!enabled) return;

    const updateIndexedDBMetrics = async () => {
      if (!navigator.storage || !navigator.storage.estimate) {
        console.warn('Storage API not available in this browser');
        return;
      }

      try {
        const estimate = await navigator.storage.estimate();
        const usage = (estimate.usage || 0) / (1024 * 1024); // Convert to MB
        const quota = (estimate.quota || 0) / (1024 * 1024);
        const percentage = quota > 0 ? (usage / quota) * 100 : 0;

        updateIndexedDB({
          usage,
          quota,
          percentage,
        });
      } catch (error) {
        console.error('Error estimating storage:', error);
      }
    };

    // Initial update
    updateIndexedDBMetrics();

    // Set up interval
    const intervalId = setInterval(
      updateIndexedDBMetrics,
      INDEXEDDB_UPDATE_INTERVAL,
    );

    return () => clearInterval(intervalId);
  }, [enabled, updateIndexedDB]);
}

/**
 * Hook to monitor GPU information using WebGL
 * Note: Does not track real-time GPU usage (not available in WebGL)
 * Only provides static GPU info
 */
function useGPUMonitor() {
  const updateGPU = useProfilerStore((s) => s.updateGPU);
  const enabled = useProfilerStore((s) => s.enabled);

  useEffect(() => {
    if (!enabled) return;

    const getGPUInfo = () => {
      try {
        // Create a temporary canvas to get WebGL context
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        if (!gl) {
          updateGPU({ available: false });
          return;
        }

        // Get GPU info using WEBGL_debug_renderer_info extension
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
          : 'Unknown';
        const renderer = debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          : 'Unknown';

        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

        updateGPU({
          available: true,
          vendor,
          renderer,
          maxTextureSize,
        });

        // Clean up
        const loseContext = gl.getExtension('WEBGL_lose_context');
        if (loseContext) {
          loseContext.loseContext();
        }
      } catch (error) {
        console.error('Error getting GPU info:', error);
        updateGPU({ available: false });
      }
    };

    // Get GPU info once (it's static)
    getGPUInfo();
  }, [enabled, updateGPU]);
}

/**
 * Browser-safe main-thread diagnostics. Browsers do not expose CPU
 * utilization, so the percentage is explicitly the share of each sample
 * window occupied by Long Task API entries. Display-frame intervals are
 * recorded separately and never presented as CPU usage.
 */
function useMainThreadMonitor() {
  const updateMainThread = useProfilerStore((s) => s.updateMainThread);
  const updateFrameTimes = useProfilerStore((s) => s.updateFrameTimes);
  const enabled = useProfilerStore((s) => s.enabled);
  const frameTimesRef = useRef<number[]>([]);
  const longTaskDurationRef = useRef(0);
  const longestTaskRef = useRef(0);
  const lastUpdateRef = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;
    let observer: PerformanceObserver | null = null;

    // Setup Long Task API observer (detects tasks >50ms)
    if ('PerformanceObserver' in window) {
      try {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'longtask') {
              longTaskDurationRef.current += entry.duration;
              longestTaskRef.current = Math.max(
                longestTaskRef.current,
                entry.duration,
              );
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch {
        // Long Task API not supported in this browser
        console.warn('Long Task API not available');
      }
    }

    // Record foreground display intervals independently from long tasks.
    let lastFrameTime = performance.now();
    const measureFrameTiming = () => {
      const now = performance.now();
      const frameTime = now - lastFrameTime;
      lastFrameTime = now;

      if (
        !document.hidden &&
        frameTime > 0 &&
        frameTime <= MAX_FOREGROUND_FRAME_INTERVAL
      ) {
        frameTimesRef.current.push(frameTime);
      }

      animationFrameId = requestAnimationFrame(measureFrameTiming);
    };

    const publishMetrics = () => {
      const now = performance.now();
      const elapsed = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      const frameTimes = frameTimesRef.current.splice(0);
      const longTaskShare =
        elapsed > 0
          ? Math.min(100, (longTaskDurationRef.current / elapsed) * 100)
          : 0;

      updateMainThread({
        longTaskShare,
        longestLongTask: longestTaskRef.current,
      });

      const currentMaxFrameTime =
        frameTimes.length > 0 ? Math.max(...frameTimes) : 0;
      const currentMeanFrameTime =
        frameTimes.length > 0
          ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
          : 0;

      updateFrameTimes(frameTimes, currentMaxFrameTime, currentMeanFrameTime);

      longTaskDurationRef.current = 0;
      longestTaskRef.current = 0;
    };

    // Start measuring
    animationFrameId = requestAnimationFrame(measureFrameTiming);

    // Update metrics periodically
    const resetFrameClock = () => {
      lastFrameTime = performance.now();
      lastUpdateRef.current = lastFrameTime;
      frameTimesRef.current = [];
      longTaskDurationRef.current = 0;
      longestTaskRef.current = 0;
    };
    document.addEventListener('visibilitychange', resetFrameClock);
    const timeoutId = setInterval(publishMetrics, TELEMETRY_UPDATE_INTERVAL);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(timeoutId);
      document.removeEventListener('visibilitychange', resetFrameClock);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [enabled, updateFrameTimes, updateMainThread]);
}

/**
 * Hook to monitor editor FPS (main render loop)
 */
function useEditorFPSMonitor() {
  const updateEditorFPS = useProfilerStore((s) => s.updateEditorFPS);
  const enabled = useProfilerStore((s) => s.enabled);
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const fpsUpdateTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;
    const reset = () => {
      frameCountRef.current = 0;
      fpsUpdateTimeRef.current = performance.now();
      lastFrameTimeRef.current = fpsUpdateTimeRef.current;
    };

    const measureFPS = () => {
      const now = performance.now();
      if (!document.hidden) {
        frameCountRef.current++;
      }

      if (now - fpsUpdateTimeRef.current >= TELEMETRY_UPDATE_INTERVAL) {
        const elapsed = (now - fpsUpdateTimeRef.current) / 1000;
        if (!document.hidden && elapsed <= 2) {
          updateEditorFPS(frameCountRef.current / elapsed);
        }

        reset();
      }

      lastFrameTimeRef.current = now;
      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);
    document.addEventListener('visibilitychange', reset);

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', reset);
    };
  }, [enabled, updateEditorFPS]);
}

function useRuntimeMonitor() {
  const enabled = useProfilerStore((state) => state.enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let sampleStartedAt = performance.now();
    let renderedFrames = 0;

    return vizSessionActions.preview.subscribeRuntimePreview((inspection) => {
      if (!inspection.lastTimings || document.hidden) {
        return;
      }

      renderedFrames += 1;
      const now = performance.now();
      const elapsed = now - sampleStartedAt;
      if (elapsed < TELEMETRY_UPDATE_INTERVAL) {
        return;
      }

      const profiler = useProfilerStore.getState();
      const graphs = getCurrentProjectGraphs();
      const resultsById = new Map(
        inspection.lastGraphResults.map((result) => [result.graphId, result]),
      );
      profiler.updateNodeNetworks(
        graphs.map((graph) => {
          const result = resultsById.get(graph.id);
          return {
            parameterId: graph.id,
            parameterName: graph.name,
            computeTime: null,
            nodeCount: result
              ? Object.keys(result.nodes).length
              : graph.nodes.length,
            issueCount: result?.issues.length ?? 0,
          };
        }),
      );
      profiler.updateRuntime({
        fps: renderedFrames / (elapsed / 1000),
        framePlanTime: inspection.lastTimings.planMilliseconds,
        attachmentTime: inspection.lastTimings.attachmentMilliseconds,
        totalTime: inspection.lastTimings.totalMilliseconds,
        renderCycle: inspection.renderCycle,
        issueCount: inspection.lastPlanIssues.length,
      });
      sampleStartedAt = now;
      renderedFrames = 0;
    });
  }, [enabled]);
}

const getCurrentProjectGraphs = () =>
  getVizSessionState().project.workingProject.graphs ?? [];

/**
 * Main hook that initializes all profiler monitors
 * Use this in the root component to start monitoring
 */
export function useProfilerMonitors() {
  const enabled = useProfilerStore((s) => s.enabled);
  const initializeExistingLayersAndNetworks = useProfilerStore(
    (s) => s.initializeExistingLayersAndNetworks,
  );

  // Initialize existing layers and networks when profiler is enabled
  useEffect(() => {
    if (enabled) {
      // Small delay to ensure layers/networks are hydrated
      const timeoutId = setTimeout(() => {
        initializeExistingLayersAndNetworks();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [enabled, initializeExistingLayersAndNetworks]);

  useMemoryMonitor();
  useIndexedDBMonitor();
  useGPUMonitor();
  useMainThreadMonitor();
  useEditorFPSMonitor();
  useRuntimeMonitor();
}
