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
  const { setPlayerRef, setPlayerFPS } = useEditorStore();
  const { audioElementRef } = useAudioStore();
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
      if (audioElement.duration) {
        console.log(
          `Duration of the loaded audio is: ${audioElement.duration} seconds.`,
        );
        setDurationInFrames(
          Math.max(1, Math.ceil(audioElement.duration * FPS)),
        );
      }
    };

    audioElement.addEventListener('loadedmetadata', updateDuration);

    // Call manually in case the audio is already loaded
    if (audioElement.readyState >= 1) {
      updateDuration();
    }

    return () => {
      audioElement.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [audioElementRef, src]);

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

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center">
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
