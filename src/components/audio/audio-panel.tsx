'use client';

import useAudioEngine from '@/lib/hooks/use-audio-engine';
import useAudioPlaybackSync from '@/lib/hooks/use-audio-playback-sync';
import useKeypress from '@/lib/hooks/use-keypress';
import useAudioStore from '@/lib/stores/audio-store';
import useEditorStore from '@/lib/stores/editor-store';
import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import TickerText from '../ui/ticker-text';
import { Toggle } from '../ui/toggle';
import AudioFileLoader from './audio-file-loader';
import CaptureAudio from './capture-audio';
import LiveWaveform from './live-waveform';
import RhythmSelectionStrip from './rhythm-selection-strip';
import VolumeFader from './volume-fader';
import WaveformDisplay from './waveform-display';

const AudioPanel = () => {
  const setIsPlaying = useEditorStore((state) => state.setIsPlaying);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const isCapturingTab = useAudioStore((s) => s.isCapturingTab);
  const setAudioElementRef = useAudioStore((s) => s.setAudioElementRef);
  const skipToPrevious = useAudioStore((s) => s.skipToPrevious);
  const skipToNext = useAudioStore((s) => s.skipToNext);
  const isRhythmLabOpen = useEditorStore((s) => s.isRhythmLabOpen);

  // Create proper React refs locally
  const audioElementRef = useRef<HTMLAudioElement>(null);

  // Pass the refs to the store so other components can access them
  useEffect(() => {
    setAudioElementRef(audioElementRef);
  }, [setAudioElementRef]);

  const { peaksLevels, duration, bufferDuration, isLoading } = useAudioEngine();
  useAudioPlaybackSync();

  const playPause = () => {
    // Toggle global play state; RemotionPlayer syncs the actual Player via effect
    setIsPlaying(!isPlaying);
  };
  useKeypress('Space', playPause);

  return (
    <div className="absolute inset-0 flex items-stretch justify-stretch">
      <div className="w-20 border-r border-white/20">
        <VolumeFader />
      </div>
      <div className="flex grow flex-col items-stretch">
        <div className="grid h-14 grid-cols-3 content-center p-2">
          {!isCapturingTab ? (
            <AudioFileLoader />
          ) : (
            <div className="justify-self-start">
              <Button disabled>
                <TickerText leadingIcon={<Music />} text="External Audio" />
              </Button>
            </div>
          )}
          <div className="flex items-center justify-center gap-1">
            {!isCapturingTab && (
              <Button
                variant="ghost"
                size="icon"
                onClick={skipToPrevious}
                tooltip="Previous track / Restart (< 3s)"
                className="h-9 w-9 opacity-80 hover:opacity-100">
                <SkipBack className="h-5 w-5" />
              </Button>
            )}
            <Toggle
              aria-label="Play/Pause"
              className="border !border-white/20"
              tooltip="Play/Pause (Space)"
              onClick={playPause}>
              {isPlaying ? <Pause /> : <Play />}
            </Toggle>
            {!isCapturingTab && (
              <Button
                variant="ghost"
                size="icon"
                onClick={skipToNext}
                tooltip="Next track"
                className="h-9 w-9 opacity-80 hover:opacity-100">
                <SkipForward className="h-5 w-5" />
              </Button>
            )}
          </div>
          <div className="mr-3 flex items-center justify-end gap-3">
            <CaptureAudio />
            <TimecodeText />
          </div>
        </div>
        <div className="relative grow">
          <div className="absolute inset-0">
            <audio ref={audioElementRef} />
            {/* Live waveform shown only while capturing */}
            {isCapturingTab && (
              <div className="absolute inset-0">
                <LiveWaveform />
              </div>
            )}
            {/* Waveform view hidden during capture */}
            {!isCapturingTab && (
              <div className="h-full w-full">
                <WaveformDisplay
                  peaksLevels={peaksLevels}
                  duration={duration}
                  bufferDuration={bufferDuration}
                  isLoading={isLoading}
                />
              </div>
            )}
            {!isCapturingTab && isRhythmLabOpen && <RhythmSelectionStrip />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPanel;

const TimecodeText = () => {
  const audioElementRef = useAudioStore((s) => s.audioElementRef);
  const spanRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    let raf: number | null = null;
    const update = () => {
      const audio = audioElementRef.current;
      if (!spanRef.current || !audio) {
        raf = requestAnimationFrame(update);
        return;
      }
      const t = audio.currentTime || 0;
      const mm = Math.floor(t / 60)
        .toString()
        .padStart(2, '0');
      const ss = Math.floor(t % 60)
        .toString()
        .padStart(2, '0');
      const cs = Math.floor((t % 1) * 100)
        .toString()
        .padStart(2, '0');
      spanRef.current.textContent = `${mm}:${ss}.${cs}`;
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [audioElementRef]);
  return <p ref={spanRef} className="font-mono text-xs text-white" />;
};
