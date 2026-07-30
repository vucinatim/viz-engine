import {
  createVizSessionRuntimePreviewFrame,
  vizSessionActions,
} from '@/lib/viz-session';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorPreviewStore from '@/lib/stores/editor-preview-store';
import useExportStore from '@/lib/stores/export-store';
import { useEffect, useRef } from 'react';

const EditorRuntimePreviewDriver = () => {
  const audioElementRef = useAudioEngineStore((state) => state.audioElementRef);
  const isExporting = useExportStore((state) => state.isExporting);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(
    typeof performance !== 'undefined' ? performance.now() : Date.now(),
  );

  useEffect(() => {
    if (isExporting) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    lastFrameTimeRef.current =
      typeof performance !== 'undefined' ? performance.now() : Date.now();

    const renderFrame = () => {
      const { currentFrame, fps } =
        useEditorPreviewStore.getState().transport;
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const elapsedMilliseconds = now - lastFrameTimeRef.current;
      const targetIntervalMilliseconds =
        1000 / Math.min(60, Math.max(1, fps));

      // High-refresh displays can invoke rAF at 120 Hz or more. The authored
      // timeline is the useful ceiling; evaluating the same canonical frame
      // twice only burns CPU/GPU and can make editor interactions less smooth.
      if (
        elapsedMilliseconds + 1 <
        targetIntervalMilliseconds
      ) {
        rafIdRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const dt = elapsedMilliseconds / 1000;
      lastFrameTimeRef.current = now;

      const time =
        typeof currentFrame === 'number' && fps > 0
          ? currentFrame / fps
          : audioElementRef.current?.currentTime || 0;

      const frame = createVizSessionRuntimePreviewFrame({
        currentFrame,
        time,
        dt,
        fps,
        mode: 'live',
      });

      vizSessionActions.preview.renderRuntimePreviewFrame(frame);
      rafIdRef.current = requestAnimationFrame(renderFrame);
    };

    rafIdRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [audioElementRef, isExporting]);

  return null;
};

export default EditorRuntimePreviewDriver;
