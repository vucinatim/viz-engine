import { useWavesurfer } from '@wavesurfer/react';
import { useEffect, useMemo } from 'react';
import useAudioStore from '../stores/audio-store';
import useEditorStore from '../stores/editor-store';
import { AUDIO_THEME } from '../theme/audio-theme';
import useCanvasGradient from './use-canvas-gradient';

function useWavesurferSetup() {
  const {
    audioSource,
    audioContext,
    audioAnalyzer,
    gainNode,
    setWavesurfer,
    setAudioContext,
    setAnalyzer,
    setGainNode,
  } = useAudioStore();
  // const waveformDisplayRef = useRef<HTMLDivElement>(null);
  // const audioElementRef = useRef<HTMLAudioElement>(null);
  const { playerRef, playerFPS } = useEditorStore();
  const { waveformDisplayRef, audioElementRef } = useAudioStore();

  // Keep height in one constant and use it for both WS and gradient length
  const WAVEFORM_HEIGHT = AUDIO_THEME.waveform.height; // theme-driven height
  const gradient = useCanvasGradient(WAVEFORM_HEIGHT);

  const { wavesurfer, isPlaying, currentTime } = useWavesurfer({
    container: waveformDisplayRef,
    height: WAVEFORM_HEIGHT,
    waveColor: gradient ? gradient : AUDIO_THEME.waveform.fallbackWaveColor,
    // Use the same gradient for progress to keep a cohesive look
    progressColor: AUDIO_THEME.waveform.fallbackProgressColor,
    media: audioElementRef.current || undefined,
    minPxPerSec: 100,
    hideScrollbar: true,
    autoCenter: true,
    autoScroll: true,

    plugins: useMemo(() => {
      // Check if we are on client because these plugins are not available on server
      if (typeof window === 'undefined') return [];

      // Import the plugins
      const Timeline = require('wavesurfer.js/dist/plugins/timeline.esm.js');
      const Minimap = require('wavesurfer.js/dist/plugins/minimap.esm.js');
      const Hover = require('wavesurfer.js/dist/plugins/hover.esm.js');

      return [
        Timeline.create(),
        Minimap.create({
          height: 20,
          waveColor: AUDIO_THEME.waveform.minimap.waveColor,
          progressColor: AUDIO_THEME.waveform.minimap.progressColor,
          // the Minimap takes all the same options as the WaveSurfer itself
          plugins: [Timeline.create(), Hover.create()],
        }),
        Hover.create({
          lineColor: AUDIO_THEME.waveform.hover.lineColor,
          lineWidth: 2,
          labelBackground: AUDIO_THEME.waveform.hover.labelBackground,
          labelColor: AUDIO_THEME.waveform.hover.labelColor,
          labelSize: AUDIO_THEME.waveform.hover.labelSize,
        }),
      ];
    }, []),
  });

  // Set the wavesurfer instance in the store
  useEffect(() => {
    if (!wavesurfer) return;
    setWavesurfer(wavesurfer);
  }, [wavesurfer, setWavesurfer]);

  // Create the audio context, analyzer, and gain node
  useEffect(() => {
    const ac = new AudioContext();
    const an = ac.createAnalyser();
    an.fftSize = 2048; // Default is 2048, try adjusting if needed
    an.minDecibels = -90; // Default is -100 dB
    an.maxDecibels = -10; // Default is -30 dB
    const gn = ac.createGain();
    setAudioContext(ac);
    setAnalyzer(an);
    setGainNode(gn);

    return () => {
      ac.close();
    };
  }, [setAnalyzer, setAudioContext, setGainNode]);

  // Connect the audio source to the audio analyzer
  useEffect(() => {
    if (!wavesurfer || !audioContext || !audioAnalyzer || !gainNode) return;
    wavesurfer.on('play', async () => {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      // Check if source has not been created yet and create it
      if (audioElementRef.current && !audioSource.current) {
        audioSource.current = audioContext.createMediaElementSource(
          audioElementRef.current,
        );
        // Tap the analyzer but do NOT route analyzer to destination to avoid double audio
        audioSource.current.connect(audioAnalyzer);
        // Playback path is controlled via gain node only
        audioSource.current.connect(gainNode);
        gainNode.connect(audioContext.destination);
      }
    });
  }, [
    audioAnalyzer,
    audioContext,
    audioElementRef,
    audioSource,
    gainNode,
    wavesurfer,
  ]);

  useEffect(() => {
    if (!wavesurfer || !playerRef.current) return;
    wavesurfer.on('seeking', () => {
      playerRef.current?.seekTo(wavesurfer.getCurrentTime() * playerFPS);
    });
  }, [playerFPS, playerRef, wavesurfer]);

  return {
    waveformDisplayRef,
    audioElementRef,
    wavesurfer,
    isPlaying,
    currentTime,
  };
}

export default useWavesurferSetup;
