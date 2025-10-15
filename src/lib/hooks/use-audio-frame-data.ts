import { useCallback, useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import useEditorStore from '../stores/editor-store';
import useExportStore from '../stores/export-store';

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
    // CRITICAL: Check if we're exporting and have offline audio data
    const exportStore = useExportStore.getState();
    const offlineAudioData = exportStore.currentOfflineAudioData;

    // If we're exporting and have offline data, use it instead of the analyzer
    if (exportStore.isExporting && offlineAudioData) {
      console.log('[AudioFrameData] Using offline audio data during export', {
        frequencyDataLength: offlineAudioData.frequencyData.length,
        timeDomainDataLength: offlineAudioData.timeDomainData.length,
        sampleRate: offlineAudioData.sampleRate,
        fftSize: offlineAudioData.fftSize,
        isExporting: exportStore.isExporting,
      });
      return {
        frequencyData: offlineAudioData.frequencyData,
        timeDomainData: offlineAudioData.timeDomainData,
        sampleRate: offlineAudioData.sampleRate,
        fftSize: offlineAudioData.fftSize,
      };
    }

    // Normal playback mode - use the analyzer
    if (!analyzer) {
      console.log(
        '[AudioFrameData] No analyzer available, returning empty data',
      );
      return {
        frequencyData: new Uint8Array(),
        timeDomainData: new Uint8Array(),
        sampleRate: 44100, // Default fallback
        fftSize: 2048, // Default fallback
      };
    }

    // Drive update gating from global play state to match Remotion controls
    // Read fresh state directly from store to avoid callback recreation on play/pause
    const isPlayingStore = useEditorStore.getState().isPlaying;
    const isPlaying = !isFrozen || isPlayingStore;

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

      // Debug log for live audio data
      console.log('[AudioFrameData] Live audio data updated', {
        frequencyDataLength: frequencyDataRef.current.length,
        timeDomainDataLength: timeDomainDataRef.current.length,
        sampleRate: analyzer.context.sampleRate,
        fftSize: analyzer.fftSize,
        isPlaying,
      });

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
    // wavesurfer is NOT in deps because it's only used in the initialization useEffect
    // isPlayingStore is read fresh from store.getState() to avoid callback recreation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzer, isFrozen]);

  return getAudioFrameData;
};

export default useAudioFrameData;
