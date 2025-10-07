import useDimensions from '@/lib/hooks/use-dimensions';
import useAudioStore from '@/lib/stores/audio-store';
import useEditorStore from '@/lib/stores/editor-store';
import { Player, PlayerRef } from '@remotion/player';
import { useEffect, useMemo, useRef, useState } from 'react';
import Renderer from './renderer';

type AspectRatio = 'free' | number;
const FPS = 60;
const ASPECT_RATIO = 'free' as AspectRatio;

const RemotionPlayer = () => {
  const setPlayerRef = useEditorStore((s) => s.setPlayerRef);
  const setPlayerFPS = useEditorStore((s) => s.setPlayerFPS);
  const isPlayingStore = useEditorStore((s) => s.isPlaying);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);

  const audioElementRef = useAudioStore((s) => s.audioElementRef);
  const isCapturingTab = useAudioStore((s) => s.isCapturingTab);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);

  const { width: containerWidth, height: containerHeight } =
    useDimensions(containerRef);
  const [durationInFrames, setDurationInFrames] = useState(1);
  const src = audioElementRef.current?.src || '';

  // Register the player ref
  useEffect(() => {
    setPlayerRef(playerRef);
    setPlayerFPS(FPS);
  }, [playerRef, setPlayerFPS, setPlayerRef]);

  useEffect(() => {
    const audioElement = audioElementRef.current;

    if (!audioElement) return;

    const updateDuration = () => {
      const dur = audioElement.duration;
      if (Number.isFinite(dur) && dur > 0) {
        setDurationInFrames(Math.max(1, Math.ceil(dur * FPS)));
      } else if (isCapturingTab) {
        // MediaStreams often report Infinity
        const fallbackSeconds = 60 * 30; // 30 min
        setDurationInFrames(Math.max(1, Math.ceil(fallbackSeconds * FPS)));
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
      setDurationInFrames(Math.max(1, Math.ceil(fallbackSeconds * FPS)));
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
    const currently = p.isPlaying();
    if (isPlayingStore && !currently) p.play();
    if (!isPlayingStore && currently) p.pause();
  }, [isPlayingStore]);

  // Poll Player state to keep store in sync with built-in controls
  useEffect(() => {
    let raf = 0;
    let last = playerRef.current?.isPlaying() ?? false;
    const tick = () => {
      const p = playerRef.current;
      if (p) {
        const now = p.isPlaying();
        if (now !== last) {
          setIsPlaying(now);
          last = now;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setIsPlaying]);

  return (
    <div
      ref={containerRef}
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
        showPlaybackRateControl
        showVolumeControls={false}
        allowFullscreen
        doubleClickToFullscreen
        controls
      />
    </div>
  );
};

export default RemotionPlayer;
