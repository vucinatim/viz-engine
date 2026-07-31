import {
  advanceEditorPreviewFrameDeadline,
  isEditorPreviewFrameDue,
} from '@/lib/editor-runtime-preview-clock';
import { subscribeEditorRuntimePreviewInvalidation } from '@/lib/editor-runtime-preview-invalidation';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import useExportStore from '@/lib/stores/export-store';
import { transportPresentationClock } from '@/lib/transport-presentation-clock';
import {
  createVizSessionRuntimePreviewFrame,
  getVizSessionState,
  vizSessionActions,
  vizSessionHost,
  vizSessionStore,
} from '@/lib/viz-session';
import { useEffect, useRef } from 'react';

const EditorRuntimePreviewDriver = () => {
  const audioElementRef = useAudioEngineStore((state) => state.audioElementRef);
  const isExporting = useExportStore((state) => state.isExporting);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(
    typeof performance !== 'undefined' ? performance.now() : Date.now(),
  );
  const nextFrameDeadlineRef = useRef(lastFrameTimeRef.current);

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
    nextFrameDeadlineRef.current = lastFrameTimeRef.current;

    const scheduleRender = () => {
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(renderFrame);
      }
    };

    const renderFrame = () => {
      rafIdRef.current = null;
      const state = getVizSessionState();
      const { currentFrame, fps, isPlaying } =
        vizSessionHost.getSnapshot().transport;
      const attachmentStore = useEditorRuntimePreviewAttachmentStore.getState();
      const isLiveCapture = state.audio.session.source?.kind === 'stream';
      const shouldRenderContinuously =
        isPlaying ||
        isLiveCapture ||
        attachmentStore.requiresContinuousRendering();
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const elapsedMilliseconds = now - lastFrameTimeRef.current;
      const targetIntervalMilliseconds = 1000 / Math.min(60, Math.max(1, fps));

      // High-refresh displays can invoke rAF at 120 Hz or more. The authored
      // timeline is the useful ceiling; evaluating the same canonical frame
      // twice only burns CPU/GPU and can make editor interactions less smooth.
      if (
        shouldRenderContinuously &&
        !isEditorPreviewFrameDue(now, nextFrameDeadlineRef.current)
      ) {
        scheduleRender();
        return;
      }

      const dt = shouldRenderContinuously ? elapsedMilliseconds / 1000 : 0;
      lastFrameTimeRef.current = now;
      nextFrameDeadlineRef.current = shouldRenderContinuously
        ? advanceEditorPreviewFrameDeadline(
            now,
            nextFrameDeadlineRef.current,
            targetIntervalMilliseconds,
          )
        : now;

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
      if (shouldRenderContinuously) {
        scheduleRender();
      }
    };

    const unsubscribers = [
      vizSessionStore.subscribe(scheduleRender),
      transportPresentationClock.subscribe(scheduleRender),
      vizSessionHost.subscribeLiveProjectValues(scheduleRender),
      useAudioEngineStore.subscribe(scheduleRender),
      useEditorRuntimePreviewAttachmentStore.subscribe(scheduleRender),
      subscribeEditorRuntimePreviewInvalidation(scheduleRender),
    ];
    scheduleRender();

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [audioElementRef, isExporting]);

  return null;
};

export default EditorRuntimePreviewDriver;
