'use client';

import useKeypress from '@/lib/hooks/use-keypress';
import useWavesurferSetup from '@/lib/hooks/use-wavesurfer-setup';
import useAudioStore from '@/lib/stores/audio-store';
import useEditorStore from '@/lib/stores/editor-store';
import { Pause, Play } from 'lucide-react';
import { Toggle } from '../ui/toggle';
import AudioFileLoader from './audio-file-loader';
import CaptureAudio from './capture-audio';
import LiveWaveform from './live-waveform';
import VolumeFader from './volume-fader';

const AudioPanel = () => {
  const setIsPlaying = useEditorStore((state) => state.setIsPlaying);
  const {
    waveformDisplayRef,
    audioElementRef,
    isPlaying: _wsPlaying,
    currentTime,
  } = useWavesurferSetup();
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const isCapturingTab = useAudioStore((s) => s.isCapturingTab);

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
            <p className="font-mono text-xs text-white">
              {
                // Format the currentTime in float seconds to a human readable format
                Math.floor(currentTime / 60)
                  .toString()
                  .padStart(2, '0') +
                  ':' +
                  Math.floor(currentTime % 60)
                    .toString()
                    .padStart(2, '0') +
                  '.' +
                  // Only show two numbers for milliseconds
                  Math.floor((currentTime % 1) * 1000)
                    .toString()
                    .slice(0, 2)
                    .padStart(2, '0')
              }
            </p>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPanel;
