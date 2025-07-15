import { useCallback, useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface UseAudioFrameDataProps {
  isFrozen: boolean;
  analyzer: AnalyserNode | null;
  wavesurfer: WaveSurfer | null;
}

const useAudioFrameData = ({
  isFrozen,
  analyzer,
  wavesurfer,
}: UseAudioFrameDataProps) => {
  const frequencyDataRef = useRef<Uint8Array>(new Uint8Array());
  const timeDomainDataRef = useRef<Uint8Array>(new Uint8Array());
  const lastFrequencyDataRef = useRef<Uint8Array>(new Uint8Array());
  const lastTimeDomainDataRef = useRef<Uint8Array>(new Uint8Array());

  useEffect(() => {
    if (analyzer && wavesurfer) {
      const initData = () => {
        const freqData = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(freqData);
        frequencyDataRef.current = freqData;
        lastFrequencyDataRef.current = new Uint8Array(freqData);

        const timeData = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteTimeDomainData(timeData);
        timeDomainDataRef.current = timeData;
        lastTimeDomainDataRef.current = new Uint8Array(timeData);
      };

      wavesurfer.on('ready', initData);
      initData(); // Also run on initial setup

      return () => {
        wavesurfer.un('ready', initData);
      };
    }
  }, [analyzer, wavesurfer]);

  const getAudioFrameData = useCallback(() => {
    if (!analyzer) {
      return {
        frequencyData: new Uint8Array(),
        timeDomainData: new Uint8Array(),
        sampleRate: 44100, // Default fallback
        fftSize: 2048, // Default fallback
      };
    }

    const isPlaying = !isFrozen || wavesurfer?.isPlaying?.();

    if (isPlaying) {
      const freqData = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(freqData);
      frequencyDataRef.current = freqData;
      lastFrequencyDataRef.current = new Uint8Array(freqData);

      const timeData = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteTimeDomainData(timeData);
      timeDomainDataRef.current = timeData;
      lastTimeDomainDataRef.current = new Uint8Array(timeData);
    }

    return {
      frequencyData: isPlaying
        ? frequencyDataRef.current
        : lastFrequencyDataRef.current,
      timeDomainData: isPlaying
        ? timeDomainDataRef.current
        : lastTimeDomainDataRef.current,
      sampleRate: analyzer.context.sampleRate,
      fftSize: analyzer.fftSize,
    };
  }, [analyzer, isFrozen, wavesurfer]);

  return getAudioFrameData;
};

export default useAudioFrameData;
