import { useCallback, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

interface UseFrozenAudioDataProps {
  isFrozen: boolean;
  analyzer: AnalyserNode | null;
  wavesurfer: WaveSurfer | null;
}

const useFrozenAudioData = ({
  isFrozen,
  analyzer,
  wavesurfer,
}: UseFrozenAudioDataProps) => {
  // Store the last data array to prevent flickering when the audio is paused
  const dataArrayRef = useRef<Uint8Array>(new Uint8Array());
  const lastDataArrayRef = useRef<Uint8Array>(new Uint8Array());

  // Fetch the initial data when the wavesurfer is ready
  // NOTE: This is so that the first frame is not empty
  useEffect(() => {
    if (analyzer && wavesurfer) {
      const handleWaveSurferReady = () => {
        const initialDataArray = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(initialDataArray);
        dataArrayRef.current = initialDataArray;
        lastDataArrayRef.current = new Uint8Array(initialDataArray);
      };

      // Listen to the 'ready' event to fetch the initial data
      wavesurfer.on("ready", handleWaveSurferReady);

      // Trigger the event manually if the wavesurfer is already ready
      handleWaveSurferReady();

      return () => {
        wavesurfer.un("ready", handleWaveSurferReady);
      };
    }
  }, [analyzer, wavesurfer]);

  const getDataArray = useCallback(() => {
    if (!analyzer) return new Uint8Array();
    // If freeze is disabled treat the layer as playing
    const isPlaying = !isFrozen || wavesurfer?.isPlaying?.();

    // Fetch new data only if isPlaying is true
    if (isPlaying) {
      dataArrayRef.current = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(dataArrayRef.current);
      lastDataArrayRef.current = new Uint8Array(dataArrayRef.current);
    }

    return isPlaying ? dataArrayRef.current : lastDataArrayRef.current;
  }, [analyzer, isFrozen, wavesurfer]);

  return getDataArray;
};

export default useFrozenAudioData;
