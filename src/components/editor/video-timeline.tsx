'use client';

import { Button } from '@/components/ui/button';
import { RangeSlider } from '@/components/ui/range-slider';
import useAudioStore from '@/lib/stores/audio-store';
import { cn } from '@/lib/utils';
import {
  extractWaveform,
  type WaveformData,
} from '@/lib/utils/waveform-extractor';
import { Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface VideoTimelineProps {
  startTime: number;
  endTime: number;
  duration: number;
  fps?: number;
  currentTime?: number;
  onChange: (start: number, end: number) => void;
  onTimeChange?: (time: number) => void;
  className?: string;
}

const WAVEFORM_HEIGHT = 80; // Height of the timeline in pixels

export const VideoTimeline = ({
  startTime,
  endTime,
  duration,
  fps = 30,
  currentTime = 0,
  onChange,
  onTimeChange,
  className,
}: VideoTimelineProps) => {
  const audioElementRef = useAudioStore((s) => s.audioElementRef);
  const currentTrackUrl = useAudioStore((s) => s.currentTrackUrl);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isLoadingWaveform, setIsLoadingWaveform] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Extract waveform data when audio loads
  useEffect(() => {
    if (!currentTrackUrl) {
      console.log(
        'VideoTimeline: No currentTrackUrl, skipping waveform extraction',
      );
      return;
    }

    console.log('VideoTimeline: Extracting waveform for:', currentTrackUrl);

    const extractWaveformData = async () => {
      setIsLoadingWaveform(true);
      try {
        // Load and decode the audio
        const response = await fetch(currentTrackUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        console.log(
          'VideoTimeline: Audio buffer loaded, duration:',
          audioBuffer.duration,
        );

        // Extract waveform data
        const waveform = extractWaveform(audioBuffer, {
          peaksCount: 2000, // High resolution for smooth waveform
          normalize: true,
          useRMS: true,
        });

        console.log(
          'VideoTimeline: Waveform extracted, peaks count:',
          waveform.peaks.length,
        );
        setWaveformData(waveform);
        audioContext.close();
      } catch (error) {
        console.error('Error extracting waveform:', error);
      } finally {
        setIsLoadingWaveform(false);
      }
    };

    extractWaveformData();
  }, [currentTrackUrl]);

  // Audio event listeners
  useEffect(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (!isDragging) {
        onTimeChange?.(audioElement.currentTime);
      }
    };

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioElementRef, onTimeChange, isDragging]);

  // Draw waveform on canvas
  useEffect(() => {
    if (!canvasRef.current || !waveformData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = WAVEFORM_HEIGHT;

    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear canvas with dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, cssW, cssH);

    const centerY = cssH / 2;
    const { peaks, leftChannel, rightChannel } = waveformData;

    // Create gradients for left and right channels
    const leftGradient = ctx.createLinearGradient(0, 0, 0, centerY);
    leftGradient.addColorStop(0, 'rgba(34, 211, 238, 0.9)'); // cyan at top
    leftGradient.addColorStop(1, 'rgba(168, 85, 247, 0.7)'); // purple at center

    const rightGradient = ctx.createLinearGradient(0, centerY, 0, cssH);
    rightGradient.addColorStop(0, 'rgba(168, 85, 247, 0.7)'); // purple at center
    rightGradient.addColorStop(1, 'rgba(34, 211, 238, 0.9)'); // cyan at bottom

    // Draw center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(cssW, centerY);
    ctx.stroke();

    // Draw left channel (top half)
    if (leftChannel) {
      ctx.fillStyle = leftGradient;
      ctx.beginPath();
      ctx.moveTo(0, centerY);

      for (let i = 0; i < leftChannel.length; i++) {
        const peak = leftChannel[i];
        const x = (i / (leftChannel.length - 1)) * cssW;
        const y = centerY - peak * centerY * 0.8; // Scale amplitude upward from center

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Close the shape to create filled area
      ctx.lineTo(cssW, centerY);
      ctx.closePath();
      ctx.fill();

      // Add glow effect for left channel
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(34, 211, 238, 0.6)';
      ctx.shadowBlur = 3;
      ctx.stroke();
    }

    // Draw right channel (bottom half)
    if (rightChannel) {
      ctx.fillStyle = rightGradient;
      ctx.beginPath();
      ctx.moveTo(0, centerY);

      for (let i = 0; i < rightChannel.length; i++) {
        const peak = rightChannel[i];
        const x = (i / (rightChannel.length - 1)) * cssW;
        const y = centerY + peak * centerY * 0.8; // Scale amplitude downward from center

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Close the shape to create filled area
      ctx.lineTo(cssW, centerY);
      ctx.closePath();
      ctx.fill();

      // Add glow effect for right channel
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(34, 211, 238, 0.6)';
      ctx.shadowBlur = 3;
      ctx.stroke();
    }

    // Reset shadow for future drawing
    ctx.shadowBlur = 0;
  }, [waveformData]);

  const handleRangeChange = (value: [number, number]) => {
    onChange(value[0], value[1]);
  };

  const handleTimeChange = (time: number) => {
    onTimeChange?.(time);
  };

  // Playback control functions
  const togglePlayPause = useCallback(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    if (audioElement.paused) {
      audioElement.play().catch(console.error);
    } else {
      audioElement.pause();
    }
  }, [audioElementRef]);

  const stopPlayback = useCallback(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    audioElement.pause();
    audioElement.currentTime = 0;
    onTimeChange?.(0);
  }, [audioElementRef, onTimeChange]);

  const skipBackward = useCallback(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    audioElement.currentTime = Math.max(0, audioElement.currentTime - 10);
    onTimeChange?.(audioElement.currentTime);
  }, [audioElementRef, onTimeChange]);

  const skipForward = useCallback(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    audioElement.currentTime = Math.min(
      audioElement.duration,
      audioElement.currentTime + 10,
    );
    onTimeChange?.(audioElement.currentTime);
  }, [audioElementRef, onTimeChange]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  // Timeline click and drag handlers
  const handleTimelineClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * duration;

      const audioElement = audioElementRef.current;
      if (audioElement) {
        audioElement.currentTime = newTime;
        onTimeChange?.(newTime);
      }
    },
    [duration, audioElementRef, onTimeChange],
  );

  const handleTimelineMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      setIsDragging(true);
      handleTimelineClick(event);
    },
    [handleTimelineClick],
  );

  const handleTimelineMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging) return;

      // Get the main timeline container (parent of the draggable area)
      const timelineElement = canvasRef.current?.parentElement;
      if (!timelineElement) return;

      const rect = timelineElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percentage * duration;

      const audioElement = audioElementRef.current;
      if (audioElement) {
        audioElement.currentTime = newTime;
        onTimeChange?.(newTime);
      }
    },
    [isDragging, duration, audioElementRef, onTimeChange],
  );

  const handleTimelineMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleTimelineMouseMove);
      document.addEventListener('mouseup', handleTimelineMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleTimelineMouseMove);
        document.removeEventListener('mouseup', handleTimelineMouseUp);
      };
    }
  }, [isDragging, handleTimelineMouseMove, handleTimelineMouseUp]);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Timeline header with time labels */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Start: {formatTime(startTime)}</span>
        <span>Duration: {formatTime(endTime - startTime)}</span>
        <span>End: {formatTime(endTime)}</span>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={skipBackward}
          className="h-8 w-8 p-0">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={stopPlayback}
          className="h-8 w-8 p-0">
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlayPause}
          className="h-8 w-8 p-0">
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={skipForward}
          className="h-8 w-8 p-0">
          <SkipForward className="h-4 w-4" />
        </Button>

        {/* Current time indicator */}
        <div className="rounded bg-black/70 px-2 py-1 font-mono text-xs text-white/90 backdrop-blur-sm">
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Timeline with waveform and range slider */}
      <div
        className="relative overflow-hidden rounded-lg border border-border bg-black/40 shadow-lg"
        style={{ height: WAVEFORM_HEIGHT + 26 }}>
        {/* Draggable playback pointer area at top */}
        <div
          className="relative cursor-pointer border-b border-border/50 bg-zinc-500/20"
          style={{ height: 24 }}
          onMouseDown={handleTimelineMouseDown}>
          {/* Triangle playhead indicator */}
          <div
            className="absolute -bottom-1 z-20"
            style={{
              left: `${(currentTime / duration) * 100}%`,
              transform: 'translateX(-50%)',
            }}>
            {/* Triangle pointing down */}
            <div
              className="h-0 w-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-white shadow-lg"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
            />
          </div>
        </div>

        {/* Waveform background */}
        <canvas
          ref={canvasRef}
          className="absolute h-full w-full"
          style={{ top: 24, height: WAVEFORM_HEIGHT }}
        />

        {/* Loading indicator */}
        {isLoadingWaveform && (
          <div
            className="absolute flex items-center justify-center bg-black/40"
            style={{ top: 24, height: WAVEFORM_HEIGHT, width: '100%' }}>
            <div className="text-xs text-muted-foreground">
              Loading waveform...
            </div>
          </div>
        )}

        {/* No audio loaded indicator */}
        {!currentTrackUrl && !isLoadingWaveform && (
          <div
            className="absolute flex items-center justify-center bg-black/40"
            style={{ height: WAVEFORM_HEIGHT, width: '100%' }}>
            <div className="text-xs text-muted-foreground">No audio loaded</div>
          </div>
        )}

        {/* Overlay gradient for better visibility */}
        <div
          className="pointer-events-none absolute bg-gradient-to-t from-black/30 to-transparent"
          style={{ height: WAVEFORM_HEIGHT, width: '100%' }}
        />

        {/* Range slider overlay */}
        <div className="relative" style={{ height: WAVEFORM_HEIGHT }}>
          <div className="absolute inset-0">
            <RangeSlider
              value={[startTime, endTime]}
              onChange={handleRangeChange}
              min={0}
              max={duration}
              step={0.1}
              className="h-full px-0 [&_[role=slider]]:border-none [&_[role=slider]]:shadow-none"
            />
          </div>

          {/* Vertical line indicator (without triangle) */}
          <div className="pointer-events-none absolute inset-0">
            <div className="relative h-full">
              <div
                className="absolute top-0 z-20"
                style={{
                  left: `${(currentTime / duration) * 100}%`,
                  transform: 'translateX(-50%)',
                }}>
                {/* Vertical line only */}
                <div
                  className="w-0.5 bg-white shadow-lg"
                  style={{
                    height: `${WAVEFORM_HEIGHT}px`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Time markers */}
          <div className="pointer-events-none absolute bottom-1 left-0 right-0 flex justify-between px-2">
            {Array.from({ length: 5 }).map((_, i) => {
              const time = (i / 4) * duration;
              return (
                <div
                  key={i}
                  className="rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white/90 backdrop-blur-sm">
                  {formatTime(time)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Additional info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Total duration: {formatTime(duration)}</span>
        <span>
          Selected: {formatTime(endTime - startTime)} (
          {Math.ceil((endTime - startTime) * fps)} frames @ {fps}fps)
        </span>
      </div>
    </div>
  );
};
