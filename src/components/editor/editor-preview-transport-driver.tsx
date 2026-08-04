import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import {
  useVizSessionSelector,
  vizSessionActions,
  vizSessionHost,
} from '@/lib/viz-session';
import { useEffect } from 'react';

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

  return null;
};

export default EditorPreviewTransportDriver;
