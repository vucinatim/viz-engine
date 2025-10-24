import useProfilerStore from '@/lib/stores/profiler-store';
import { useEffect, useRef } from 'react';

// Constants for update intervals (in ms)
const MEMORY_UPDATE_INTERVAL = 1000; // Update memory every 1 second
const INDEXEDDB_UPDATE_INTERVAL = 5000; // Update IndexedDB every 5 seconds
const CPU_UPDATE_INTERVAL = 500; // Update CPU estimate every 500ms

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
    const perfMemory = (performance as any).memory;
    if (!perfMemory) {
      console.warn('Performance memory API not available in this browser');
      return;
    }

    const updateMemoryMetrics = () => {
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
 * Hook to monitor CPU usage estimate
 * Estimates CPU usage based on task execution time vs idle time
 */
export function useCPUMonitor() {
  const updateCPU = useProfilerStore((s) => s.updateCPU);
  const enabled = useProfilerStore((s) => s.enabled);
  const taskTimeRef = useRef(0);
  const idleTimeRef = useRef(0);
  const lastCheckRef = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;
    let timeoutId: NodeJS.Timeout;

    const measureCPU = () => {
      const now = performance.now();
      const taskStart = now;

      // Simulate a small task to measure execution time
      // This is a rough estimate - actual CPU usage is not directly measurable in browser
      const taskDuration = performance.now() - taskStart;
      taskTimeRef.current += taskDuration;

      // Request idle callback to measure idle time
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(
          (deadline: any) => {
            idleTimeRef.current += deadline.timeRemaining();
          },
          { timeout: 100 },
        );
      }

      animationFrameId = requestAnimationFrame(measureCPU);
    };

    const updateCPUMetrics = () => {
      const now = performance.now();
      const elapsed = now - lastCheckRef.current;
      lastCheckRef.current = now;

      const totalTime = taskTimeRef.current + idleTimeRef.current;
      const usage = totalTime > 0 ? (taskTimeRef.current / totalTime) * 100 : 0;

      updateCPU({
        usage: Math.min(100, Math.max(0, usage)), // Clamp between 0-100
        taskDuration: taskTimeRef.current,
      });

      // Reset counters
      taskTimeRef.current = 0;
      idleTimeRef.current = 0;
    };

    // Start measuring
    animationFrameId = requestAnimationFrame(measureCPU);

    // Update metrics periodically
    timeoutId = setInterval(updateCPUMetrics, CPU_UPDATE_INTERVAL);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(timeoutId);
    };
  }, [enabled, updateCPU]);
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
