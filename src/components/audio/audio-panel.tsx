import editorControl from '@/lib/editor-control';
import useAudioEngine from '@/lib/hooks/use-audio-engine';
import useAudioPlaybackSync from '@/lib/hooks/use-audio-playback-sync';
import useKeypress from '@/lib/hooks/use-keypress';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import { getVisualTime } from '@/lib/utils/audio-time';
import { useVizSessionSelector, vizSessionActions } from '@/lib/viz-session';
import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import TickerText from '../ui/ticker-text';
import { Toggle } from '../ui/toggle';
import AudioFileLoader from './audio-file-loader';
import CaptureAudio from './capture-audio';
import LiveWaveform from './live-waveform';
import VolumeFader from './volume-fader';
import WaveformDisplay from './waveform-display';

const AudioPanel = () => {
  const isPlaying = useVizSessionSelector(
    (state) => state.preview.transport.isPlaying,
  );
  const isCapturingTab = useVizSessionSelector(
    (state) => state.audio.session.source?.kind === 'stream',
  );
  const setCurrentTime = vizSessionActions.audio.setCurrentTime;
  const setVisualTime = vizSessionActions.audio.setVisualTime;
  const setAudioElementRef = useAudioEngineStore((s) => s.setAudioElementRef);
  const audioContext = useAudioEngineStore((s) => s.audioContext);

  // Create proper React refs locally
  const audioElementRef = useRef<HTMLAudioElement>(null);

  // Pass the refs to the store so other components can access them
  useEffect(() => {
    setAudioElementRef(audioElementRef);
  }, [setAudioElementRef]);

  useEffect(() => {
    const updateTimes = () => {
      const audio = audioElementRef.current;
      if (!audio) {
        return;
      }
      const raw = audio.currentTime || 0;
      setCurrentTime(raw);
      setVisualTime(getVisualTime(raw, audioContext));
    };

    if (!isPlaying && !isCapturingTab) {
      updateTimes();
      return;
    }

    let raf: number | null = null;
    const tick = () => {
      updateTimes();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [audioContext, isCapturingTab, isPlaying, setCurrentTime, setVisualTime]);

  const { peaksLevels, duration, bufferDuration, isLoading } = useAudioEngine();
  useAudioPlaybackSync();

  const playPause = () => {
    editorControl.preview.togglePlayback();
  };
  useKeypress('Space', playPause);

  useEffect(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    const resetPreviewPosition = () => {
      editorControl.preview.seekToFrame(0);
    };

    audioElement.addEventListener('loadedmetadata', resetPreviewPosition);
    audioElement.addEventListener('emptied', resetPreviewPosition);

    return () => {
      audioElement.removeEventListener('loadedmetadata', resetPreviewPosition);
      audioElement.removeEventListener('emptied', resetPreviewPosition);
    };
  }, []);

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
                onClick={editorControl.audio.skipToPrevious}
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
                onClick={editorControl.audio.skipToNext}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPanel;

const TimecodeText = () => {
  const currentTime = useVizSessionSelector((state) => state.audio.currentTime);
  const t = currentTime || 0;
  const mm = Math.floor(t / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(t % 60)
    .toString()
    .padStart(2, '0');
  const cs = Math.floor((t % 1) * 100)
    .toString()
    .padStart(2, '0');
  return <p className="font-mono text-xs text-white">{`${mm}:${ss}.${cs}`}</p>;
};
