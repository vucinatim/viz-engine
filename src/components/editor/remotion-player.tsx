import useDimensions from '@/lib/hooks/use-dimensions';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import { useVizSessionSelector, vizSessionActions } from '@/lib/viz-session';
import { Player, PlayerRef } from '@remotion/player';
import { useEffect, useMemo, useRef } from 'react';
import CustomPlayerControls from './custom-player-controls';
import Renderer from './renderer';

type AspectRatio = 'free' | number;
const FPS = 60;
const ASPECT_RATIO = 'free' as AspectRatio;

const RemotionPlayer = () => {
  const setPlayerRef = useEditorRuntimePreviewAttachmentStore(
    (state) => state.setPlayerRef,
  );
  const isPlaying = useVizSessionSelector(
    (state) => state.preview.transport.isPlaying,
  );
  const currentFrame = useVizSessionSelector(
    (state) => state.preview.transport.currentFrame,
  );
  const durationInFrames = useVizSessionSelector(
    (state) => state.preview.transport.durationFrames,
  );

  const audioElementRef = useAudioEngineStore((s) => s.audioElementRef);
  const isCapturingTab = useVizSessionSelector(
    (state) => state.audio.session.source?.kind === 'stream',
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);

  const { width: containerWidth, height: containerHeight } =
    useDimensions(containerRef);
  const src = audioElementRef.current?.src || '';

  // Register the player ref
  useEffect(() => {
    setPlayerRef(playerRef);
    return () => {
      setPlayerRef({ current: null });
    };
  }, [playerRef, setPlayerRef]);

  useEffect(() => {
    const audioElement = audioElementRef.current;

    if (!audioElement) return;

    const updateDuration = () => {
      const dur = audioElement.duration;
      if (Number.isFinite(dur) && dur > 0) {
        const nextDurationFrames = Math.max(1, Math.ceil(dur * FPS));
        vizSessionActions.preview.setDurationFrames(nextDurationFrames);
      } else if (isCapturingTab) {
        // MediaStreams often report Infinity
        const fallbackSeconds = 60 * 30; // 30 min
        const nextDurationFrames = Math.max(
          1,
          Math.ceil(fallbackSeconds * FPS),
        );
        vizSessionActions.preview.setDurationFrames(nextDurationFrames);
      } // else keep previous duration
    };

    audioElement.addEventListener('loadedmetadata', updateDuration);
    audioElement.addEventListener('durationchange', updateDuration);

    // Call manually in case the audio is already loaded
    if (audioElement.readyState >= 1) {
      updateDuration();
    }

    return () => {
      audioElement.removeEventListener('loadedmetadata', updateDuration);
      audioElement.removeEventListener('durationchange', updateDuration);
    };
  }, [audioElementRef, src, isCapturingTab]);

  // While capturing tab audio, MediaStream duration is Infinity.
  // Provide a large finite duration so <Player/> remains happy.
  useEffect(() => {
    if (isCapturingTab) {
      const fallbackSeconds = 60 * 30; // 30 minutes
      const nextDurationFrames = Math.max(1, Math.ceil(fallbackSeconds * FPS));
      vizSessionActions.preview.setDurationFrames(nextDurationFrames);
    }
  }, [isCapturingTab]);

  const isFullscreen = playerRef.current?.isFullscreen();

  const { width, height } = useMemo(() => {
    const compWidth = Math.max(1, containerWidth || 1920);
    const compHeight = Math.max(1, containerHeight || 1080);

    // If player is fullscreen, return the window dimensions
    if (isFullscreen) {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }

    // If aspect ratio is free, return the container dimensions
    if (ASPECT_RATIO === 'free') {
      return {
        width: compWidth,
        height: compHeight,
      };
    }

    // Make sure the ratio is 16:9
    if (compWidth / compHeight > ASPECT_RATIO) {
      return {
        width: Math.round(compHeight * ASPECT_RATIO),
        height: compHeight,
      };
    } else {
      return {
        width: compWidth,
        height: Math.round(compWidth / ASPECT_RATIO),
      };
    }
  }, [containerWidth, containerHeight, isFullscreen]);

  // Drive Player from store state
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const actualFrame = p.getCurrentFrame?.() ?? 0;
    const currentlyPlaying = p.isPlaying();

    if (Math.abs(actualFrame - currentFrame) > 1) {
      p.seekTo(currentFrame);
    }

    if (isPlaying && !currentlyPlaying) {
      p.play();
    }

    if (!isPlaying && currentlyPlaying) {
      p.pause();
    }
  }, [currentFrame, isPlaying]);

  // Poll current frame so preview transport stays canonical while the player runs
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = playerRef.current;
      if (p) {
        const frame = p.getCurrentFrame?.() ?? 0;
        vizSessionActions.preview.syncCurrentFrame(frame);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="preview-player"
      className="remotion-player absolute inset-0 flex items-center justify-center">
      <Player
        ref={playerRef}
        component={Renderer}
        style={{
          width,
          height,
        }}
        spaceKeyToPlayOrPause={false}
        compositionWidth={width}
        compositionHeight={height}
        durationInFrames={durationInFrames}
        fps={FPS}
        clickToPlay={false}
        loop
        showPlaybackRateControl={false}
        showVolumeControls={false}
        allowFullscreen={true}
        doubleClickToFullscreen={false}
        controls={false}
      />
      <CustomPlayerControls durationInFrames={durationInFrames} />
    </div>
  );
};

export default RemotionPlayer;
