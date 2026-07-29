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
  const currentFrame = useEditorPreviewStore(
    (state) => state.transport.currentFrame,
  );
  const fps = useEditorPreviewStore((state) => state.transport.fps);
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
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const dt = (now - lastFrameTimeRef.current) / 1000;
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
  }, [audioElementRef, currentFrame, fps, isExporting]);

  return null;
};

export default EditorRuntimePreviewDriver;
