'use client';

import useAudioStore from '@/lib/stores/audio-store';
import useEditorStore from '@/lib/stores/editor-store';
import { cn } from '@/lib/utils';
import { Maximize2, Minimize2, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import CustomSeekerSlider from './custom-seeker-slider';

interface CustomPlayerControlsProps {
  className?: string;
  durationInFrames: number;
}

const CustomPlayerControls = ({
  className,
  durationInFrames,
}: CustomPlayerControlsProps) => {
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const setIsPlaying = useEditorStore((state) => state.setIsPlaying);
  const playerRef = useEditorStore((state) => state.playerRef);

  const audioElementRef = useAudioStore((s) => s.audioElementRef);
  const isCapturingTab = useAudioStore((s) => s.isCapturingTab);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Update current time and duration from audio element
  useEffect(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    const updateTime = () => setCurrentTime(audioElement.currentTime);
    const updateDuration = () => setDuration(audioElement.duration);

    audioElement.addEventListener('timeupdate', updateTime);
    audioElement.addEventListener('durationchange', updateDuration);

    // Initial values
    updateTime();
    updateDuration();

    return () => {
      audioElement.removeEventListener('timeupdate', updateTime);
      audioElement.removeEventListener('durationchange', updateDuration);
    };
  }, [audioElementRef]);

  // Update fullscreen state from document
  useEffect(() => {
    const updateFullscreen = () => {
      const playerContainer = document.querySelector('.remotion-player');
      setIsFullscreen(
        !!(
          document.fullscreenElement &&
          document.fullscreenElement === playerContainer
        ),
      );
    };

    // Check initial state
    updateFullscreen();

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', updateFullscreen);

    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreen);
    };
  }, []);

  // Handle hover detection on player container
  useEffect(() => {
    const playerContainer = document.querySelector('.remotion-player');
    if (!playerContainer) return;

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
    };

    const handleMouseMove = () => {
      if (!isHovered) {
        setIsHovered(true);
      }
    };

    playerContainer.addEventListener('mouseenter', handleMouseEnter);
    playerContainer.addEventListener('mouseleave', handleMouseLeave);
    playerContainer.addEventListener('mousemove', handleMouseMove);

    return () => {
      playerContainer.removeEventListener('mouseenter', handleMouseEnter);
      playerContainer.removeEventListener('mouseleave', handleMouseLeave);
      playerContainer.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isHovered]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const handleSeek = useCallback(
    (newTime: number) => {
      setCurrentTime(newTime);

      const audioElement = audioElementRef.current;
      if (audioElement) {
        audioElement.currentTime = newTime;
      }

      // Also seek the Remotion player
      const player = playerRef.current;
      if (player && duration > 0 && durationInFrames > 0) {
        const frame = Math.floor((newTime / duration) * durationInFrames);
        player.seekTo(frame);
      }
    },
    [audioElementRef, playerRef, duration, durationInFrames],
  );

  const handleFullscreenToggle = useCallback(async () => {
    try {
      if (isFullscreen) {
        await document.exitFullscreen();
      } else {
        // Find the player container and make it fullscreen
        const playerContainer = document.querySelector('.remotion-player');
        if (playerContainer) {
          await playerContainer.requestFullscreen();
        }
      }
    } catch (error) {
      console.warn('Fullscreen toggle failed:', error);
    }
  }, [isFullscreen]);

  // Format time helper
  const formatTime = useCallback((time: number) => {
    if (!isFinite(time)) return '0:00';

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-all duration-200 ease-out',
        isHovered
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0',
        className,
      )}>
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePlayPause}
          className="pointer-events-auto h-10 w-10 p-0 text-white transition-colors hover:bg-white/20">
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </Button>

        {/* Custom Seeker Slider - Only show in internal playback mode */}
        <div className="flex flex-1 items-center gap-3">
          {!isCapturingTab && (
            <>
              <div className="pointer-events-auto min-w-0 flex-1">
                <CustomSeekerSlider
                  value={currentTime}
                  max={duration || 1}
                  onChange={handleSeek}
                />
              </div>

              {/* Time Display - Smaller and on the right */}
              <div className="min-w-[60px] text-right font-mono text-xs text-white/80">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </>
          )}
        </div>

        {/* Fullscreen Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFullscreenToggle}
          className="pointer-events-auto h-8 w-8 p-0 text-white transition-colors hover:bg-white/20">
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </Button>
      </div>
    </div>
  );
};

export default CustomPlayerControls;
