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
  const lastLogRef = useRef<number>(0);

  useEffect(() => {
    if (analyzer && wavesurfer) {
      const initData = () => {
        // Preallocate and reuse buffers to avoid per-frame allocations
        const size = analyzer.frequencyBinCount;
        if (frequencyDataRef.current.length !== size) {
          frequencyDataRef.current = new Uint8Array(size);
          lastFrequencyDataRef.current = new Uint8Array(size);
        }
        if (timeDomainDataRef.current.length !== size) {
          timeDomainDataRef.current = new Uint8Array(size);
          lastTimeDomainDataRef.current = new Uint8Array(size);
        }

        analyzer.getByteFrequencyData(frequencyDataRef.current as any);
        lastFrequencyDataRef.current.set(frequencyDataRef.current);

        analyzer.getByteTimeDomainData(timeDomainDataRef.current as any);
        lastTimeDomainDataRef.current.set(timeDomainDataRef.current);

        // eslint-disable-next-line no-console
        console.debug(`[AudioFrameData] Preallocated buffers size=${size}`);
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
      // Reuse preallocated buffers
      const size = analyzer.frequencyBinCount;
      if (frequencyDataRef.current.length !== size) {
        frequencyDataRef.current = new Uint8Array(size);
        lastFrequencyDataRef.current = new Uint8Array(size);
      }
      if (timeDomainDataRef.current.length !== size) {
        timeDomainDataRef.current = new Uint8Array(size);
        lastTimeDomainDataRef.current = new Uint8Array(size);
      }

      analyzer.getByteFrequencyData(frequencyDataRef.current as any);
      lastFrequencyDataRef.current.set(frequencyDataRef.current);

      analyzer.getByteTimeDomainData(timeDomainDataRef.current as any);
      lastTimeDomainDataRef.current.set(timeDomainDataRef.current);

      // Throttled debug log
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - lastLogRef.current > 2000) {
        // eslint-disable-next-line no-console
        console.debug(
          `[AudioFrameData] Updated frame buffers (sr=${analyzer.context.sampleRate}, fft=${analyzer.fftSize})`,
        );
        lastLogRef.current = now;
      }
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
