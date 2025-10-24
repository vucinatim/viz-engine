import useProfilerStore from '@/lib/stores/profiler-store';
import { useEffect, useRef } from 'react';

// Constants for update intervals (in ms)
const MEMORY_UPDATE_INTERVAL = 100; // Update memory every 100ms (match display refresh rate)
const INDEXEDDB_UPDATE_INTERVAL = 5000; // Update IndexedDB every 5 seconds
const CPU_UPDATE_INTERVAL = 100; // Update CPU estimate every 100ms (increased for accuracy)

/**
 * Hook to monitor memory usage using Performance API
 * Only works in Chrome/Edge with performance.memory available
 */
export function useMemoryMonitor() {
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
export function useIndexedDBMonitor() {
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
export function useGPUMonitor() {
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
 * Hook to monitor main thread activity and long tasks
 * Measures frame budget usage and detects blocking tasks
 *
 * Note: Real CPU usage % is not available in browsers for security reasons.
 * Instead, we measure main thread blocking time and frame budget utilization.
 */
export function useCPUMonitor() {
  const updateCPU = useProfilerStore((s) => s.updateCPU);
  const updateFrameTimes = useProfilerStore((s) => s.updateFrameTimes);
  const enabled = useProfilerStore((s) => s.enabled);
  const frameTimesRef = useRef<number[]>([]);
  const longTaskCountRef = useRef(0);
  const longTaskDurationRef = useRef(0);
  const lastUpdateRef = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;
    let timeoutId: NodeJS.Timeout;
    let observer: PerformanceObserver | null = null;

    // Setup Long Task API observer (detects tasks >50ms)
    if ('PerformanceObserver' in window) {
      try {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'longtask') {
              longTaskCountRef.current++;
              longTaskDurationRef.current += entry.duration;
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long Task API not supported in this browser
        console.warn('Long Task API not available');
      }
    }

    // Measure frame times to estimate main thread utilization
    let lastFrameTime = performance.now();
    const measureFrameTiming = () => {
      const now = performance.now();
      const frameTime = now - lastFrameTime;
      lastFrameTime = now;

      // Store frame times (cap at 100 samples for rolling window)
      frameTimesRef.current.push(frameTime);
      if (frameTimesRef.current.length > 100) {
        frameTimesRef.current.shift();
      }

      animationFrameId = requestAnimationFrame(measureFrameTiming);
    };

    const updateCPUMetrics = () => {
      const now = performance.now();
      const elapsed = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      // Calculate frame budget usage (target: 16.67ms for 60fps)
      const targetFrameTime = 16.67;
      const frameTimes = frameTimesRef.current;

      let usage = 0;
      let maxTaskDuration = 0;

      if (frameTimes.length > 0) {
        // Average frame time over the measurement window
        const avgFrameTime =
          frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        maxTaskDuration = Math.max(...frameTimes);

        // Usage = how much of the frame budget we're using
        // 100% = consistently hitting 16.67ms (full 60fps budget)
        // >100% = dropping frames (capped at 100 for display)
        usage = Math.min(100, (avgFrameTime / targetFrameTime) * 100);
      }

      // Factor in long tasks (heavy blocking)
      if (longTaskCountRef.current > 0) {
        // If we detected long tasks, boost usage to reflect blocking
        const blockingPercent = Math.min(
          100,
          (longTaskDurationRef.current / elapsed) * 100,
        );
        usage = Math.max(usage, blockingPercent);
      }

      updateCPU({
        usage: Math.round(usage),
        taskDuration: maxTaskDuration,
      });

      // Update frame times for accurate maxFrameTimeMs calculation
      const currentFrameTimes = [...frameTimes];
      const currentMaxFrameTime = maxTaskDuration;
      const currentMeanFrameTime =
        frameTimes.length > 0
          ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
          : 0;

      updateFrameTimes(
        currentFrameTimes,
        currentMaxFrameTime,
        currentMeanFrameTime,
      );

      // Reset long task counters
      longTaskCountRef.current = 0;
      longTaskDurationRef.current = 0;
    };

    // Start measuring
    animationFrameId = requestAnimationFrame(measureFrameTiming);

    // Update metrics periodically
    timeoutId = setInterval(updateCPUMetrics, CPU_UPDATE_INTERVAL);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(timeoutId);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [enabled, updateCPU, updateFrameTimes]);
}

/**
 * Hook to monitor editor FPS (main render loop)
 */
export function useEditorFPSMonitor() {
  const updateEditorFPS = useProfilerStore((s) => s.updateEditorFPS);
  const enabled = useProfilerStore((s) => s.enabled);
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const fpsUpdateTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;

    const measureFPS = () => {
      const now = performance.now();
      frameCountRef.current++;

      // Update FPS every 500ms
      if (now - fpsUpdateTimeRef.current >= 500) {
        const elapsed = (now - fpsUpdateTimeRef.current) / 1000;
        const fps = frameCountRef.current / elapsed;

        updateEditorFPS(fps);

        // Reset counters
        frameCountRef.current = 0;
        fpsUpdateTimeRef.current = now;
      }

      lastFrameTimeRef.current = now;
      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, updateEditorFPS]);
}

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
  useCPUMonitor();
  useEditorFPSMonitor();
}
