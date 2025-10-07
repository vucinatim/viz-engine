'use client';

import useKeypress from '@/lib/hooks/use-keypress';
import useWavesurferSetup from '@/lib/hooks/use-wavesurfer-setup';
import useAudioStore from '@/lib/stores/audio-store';
import useEditorStore from '@/lib/stores/editor-store';
import { Pause, Play } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Toggle } from '../ui/toggle';
import AudioFileLoader from './audio-file-loader';
import CaptureAudio from './capture-audio';
import LiveWaveform from './live-waveform';
import VolumeFader from './volume-fader';

const AudioPanel = () => {
  const setIsPlaying = useEditorStore((state) => state.setIsPlaying);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const isCapturingTab = useAudioStore((s) => s.isCapturingTab);
  const setAudioElementRef = useAudioStore((s) => s.setAudioElementRef);
  const setWaveformDisplayRef = useAudioStore((s) => s.setWaveformDisplayRef);

  // Create proper React refs locally
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const waveformDisplayRef = useRef<HTMLDivElement>(null);

  // Pass the refs to the store so other components can access them
  useEffect(() => {
    setAudioElementRef(audioElementRef);
    setWaveformDisplayRef(waveformDisplayRef);
  }, [setAudioElementRef, setWaveformDisplayRef]);

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
          <AudioFileLoader />
          <div className="place-self-center">
            <Toggle
              aria-label="Play/Pause"
              tooltip={'Play/Pause (Space)'}
              onClick={playPause}>
              {isPlaying ? <Pause /> : <Play />}
            </Toggle>
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
            {/* WaveSurfer view hidden during capture */}
            <div
              ref={waveformDisplayRef}
              className={
                isCapturingTab
                  ? 'pointer-events-none my-auto w-full opacity-0'
                  : 'my-auto w-full opacity-100'
              }
            />
            <WavesurferController />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPanel;

// Child component to isolate WaveSurfer hook updates from the parent tree
const WavesurferController = () => {
  const wavesurfer = useAudioStore((s) => s.wavesurfer);
  const isPlaying = useEditorStore((s) => s.isPlaying);

  useWavesurferSetup();

  // Sync WaveSurfer playback with global play state
  useEffect(() => {
    if (!wavesurfer) return;

    const wsPlaying = wavesurfer.isPlaying();

    if (isPlaying && !wsPlaying) {
      wavesurfer.play();
    } else if (!isPlaying && wsPlaying) {
      wavesurfer.pause();
    }
  }, [wavesurfer, isPlaying]);

  return null;
};

const TimecodeText = () => {
  const wavesurfer = useAudioStore((s) => s.wavesurfer);
  const spanRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    let raf: number | null = null;
    const update = () => {
      if (!spanRef.current || !wavesurfer) {
        raf = requestAnimationFrame(update);
        return;
      }
      const t = wavesurfer.getCurrentTime ? wavesurfer.getCurrentTime() : 0;
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
  }, [wavesurfer]);
  return <p ref={spanRef} className="font-mono text-xs text-white" />;
};
