import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import {
  getVizSessionState,
  useVizSessionSelector,
  vizSessionActions,
  vizSessionHost,
} from '@/lib/viz-session';
import { useEffect } from 'react';

const MAX_FRAME_DELTA_SECONDS = 0.25;

const EditorPreviewTransportDriver = () => {
  const audioElementRef = useAudioEngineStore((state) => state.audioElementRef);
  const currentTrackUrl = useVizSessionSelector(
    (state) => state.audio.currentTrackUrl,
  );
  const sourceKind = useVizSessionSelector(
    (state) => state.audio.session.source?.kind,
  );
  const isPlaying = useVizSessionSelector(
    (state) => state.preview.transport.isPlaying,
  );
  const fps = useVizSessionSelector((state) => state.preview.transport.fps);

  useEffect(() => {
    const audio = audioElementRef.current;
    const hasMediaSource =
      sourceKind === 'file' || sourceKind === 'media-element';
    if (!audio || !hasMediaSource) {
      return;
    }

    const updateDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        vizSessionActions.preview.setDurationFrames(
          Math.max(1, Math.ceil(audio.duration * fps)),
        );
      }
    };

    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      updateDuration();
    }

    return () => {
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
    };
  }, [audioElementRef, currentTrackUrl, fps, sourceKind]);

  useEffect(() => {
    if (sourceKind !== 'stream') {
      return;
    }

    vizSessionActions.preview.setDurationFrames(30 * 60 * fps);
  }, [fps, sourceKind]);

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) {
      return;
    }

    // Timeline looping belongs to the canonical transport. Native media
    // looping only understands the source duration and can diverge from an
    // explicitly authored project duration.
    audio.loop = false;
    if (!isPlaying) {
      audio.pause();
      return;
    }

    const hasMediaSource =
      sourceKind === 'file' || sourceKind === 'media-element';
    if (hasMediaSource) {
      const targetTime =
        vizSessionHost.getSnapshot().transport.currentFrame / Math.max(1, fps);
      if (Math.abs(audio.currentTime - targetTime) > 1 / Math.max(1, fps)) {
        audio.currentTime = targetTime;
      }
      void audio.play().catch(() => {
        // The transport's elapsed-time clock remains available when media
        // playback is unavailable or browser autoplay policy rejects the call.
      });
    }
  }, [audioElementRef, currentTrackUrl, fps, isPlaying, sourceKind]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let animationFrame = 0;
    let previousTime = performance.now();

    const tick = (now: number) => {
      const state = getVizSessionState();
      const transport = vizSessionHost.getSnapshot().transport;
      if (!transport.isPlaying) {
        return;
      }

      const audio = audioElementRef.current;
      const source = state.audio.session.source;
      const hasMediaClock =
        (source?.kind === 'file' || source?.kind === 'media-element') &&
        audio !== null;
      const timelineDurationSeconds = transport.durationFrames / transport.fps;
      const hasReachedMediaBoundary =
        hasMediaClock &&
        audio !== null &&
        (audio.ended || audio.currentTime >= timelineDurationSeconds);

      if (hasReachedMediaBoundary && audio) {
        if (transport.loop) {
          audio.currentTime = 0;
          void audio.play().catch(() => {});
          vizSessionActions.preview.syncCurrentFrame(0);
        } else {
          audio.pause();
          vizSessionActions.preview.syncCurrentFrame(
            transport.durationFrames - 1,
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
          Math.floor(audio.currentTime * transport.fps),
        );
      } else {
        const elapsedSeconds = Math.min(
          MAX_FRAME_DELTA_SECONDS,
          Math.max(0, (now - previousTime) / 1_000),
        );
        vizSessionActions.preview.advanceBySeconds(elapsedSeconds);
      }

      previousTime = now;
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [audioElementRef, isPlaying]);

  return null;
};

export default EditorPreviewTransportDriver;
