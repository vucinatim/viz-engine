import {
  advanceEditorPreviewFrameDeadline,
  isEditorPreviewFrameDue,
  resolveMediaSynchronizedPreviewFrame,
} from '@/lib/editor-runtime-preview-clock';
import { subscribeEditorRuntimePreviewInvalidation } from '@/lib/editor-runtime-preview-invalidation';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
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
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(
    typeof performance !== 'undefined' ? performance.now() : Date.now(),
  );
  const nextFrameDeadlineRef = useRef(lastFrameTimeRef.current);

  useEffect(() => {
    lastFrameTimeRef.current =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    nextFrameDeadlineRef.current = lastFrameTimeRef.current;
    let hasForcedPresentation = false;

    const scheduleRender = () => {
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(renderFrame);
      }
    };

    const scheduleForcedPresentation = () => {
      hasForcedPresentation = true;
      scheduleRender();
    };

    const renderFrame = () => {
      rafIdRef.current = null;
      const isForcedPresentation = hasForcedPresentation;
      hasForcedPresentation = false;
      const state = getVizSessionState();
      const currentTransport = vizSessionHost.getSnapshot().transport;
      const attachmentStore = useEditorRuntimePreviewAttachmentStore.getState();
      const isLiveCapture = state.audio.session.source?.kind === 'stream';
      const shouldRenderContinuously =
        currentTransport.isPlaying ||
        isLiveCapture ||
        attachmentStore.requiresContinuousRendering();
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const elapsedMilliseconds = now - lastFrameTimeRef.current;
      const targetIntervalMilliseconds =
        1000 / Math.min(60, Math.max(1, currentTransport.fps));

      // High-refresh displays can invoke rAF at 120 Hz or more. The authored
      // timeline is the useful ceiling; evaluating the same canonical frame
      // twice only burns CPU/GPU and can make editor interactions less smooth.
      if (
        shouldRenderContinuously &&
        !isForcedPresentation &&
        !isEditorPreviewFrameDue(now, nextFrameDeadlineRef.current)
      ) {
        scheduleRender();
        return;
      }

      const dt =
        shouldRenderContinuously && !isForcedPresentation
          ? elapsedMilliseconds / 1000
          : 0;
      if (currentTransport.isPlaying && !isForcedPresentation) {
        const audio = audioElementRef.current;
        const source = state.audio.session.source;
        const hasMediaClock =
          (source?.kind === 'file' || source?.kind === 'media-element') &&
          audio !== null;
        const timelineDurationSeconds =
          currentTransport.durationFrames / currentTransport.fps;
        const hasReachedMediaBoundary =
          hasMediaClock &&
          audio !== null &&
          (audio.ended || audio.currentTime >= timelineDurationSeconds);

        if (hasReachedMediaBoundary && audio) {
          if (currentTransport.loop) {
            audio.currentTime = 0;
            void audio.play().catch(() => {});
            vizSessionActions.preview.syncCurrentFrame(0);
          } else {
            audio.pause();
            vizSessionActions.preview.syncCurrentFrame(
              currentTransport.durationFrames - 1,
            );
            vizSessionActions.preview.pause();
          }
        } else if (
          hasMediaClock &&
          audio !== null &&
          !audio.paused &&
          Number.isFinite(audio.currentTime)
        ) {
          vizSessionActions.preview.syncCurrentFrame(
            resolveMediaSynchronizedPreviewFrame(
              currentTransport.currentFrame,
              Math.floor(audio.currentTime * currentTransport.fps),
            ),
          );
        } else {
          vizSessionActions.preview.advanceBySeconds(1 / currentTransport.fps);
        }
      }

      const { currentFrame, fps } = vizSessionHost.getSnapshot().transport;
      if (!isForcedPresentation) {
        lastFrameTimeRef.current = now;
        nextFrameDeadlineRef.current = shouldRenderContinuously
          ? advanceEditorPreviewFrameDeadline(
              now,
              nextFrameDeadlineRef.current,
              targetIntervalMilliseconds,
            )
          : now;
      }

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
      vizSessionHost.subscribeLiveProjectValues(scheduleForcedPresentation),
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
  }, [audioElementRef]);

  return null;
};

export default EditorRuntimePreviewDriver;
