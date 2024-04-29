import { useWavesurfer } from "@wavesurfer/react";
import { useEffect, useMemo, useRef } from "react";
import useCanvasGradient from "./use-canvas-gradient";
import useAudioStore from "../stores/audio-store";

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
  const waveformDisplayRef = useRef<HTMLDivElement>(null);
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const gradient = useCanvasGradient();

  const { wavesurfer, isPlaying, currentTime } = useWavesurfer({
    container: waveformDisplayRef,
    height: 100,
    waveColor: gradient ? gradient : "rgb(100, 100, 100)",
    progressColor: "rgb(100, 0, 100)",
    media: audioElementRef.current || undefined,
    minPxPerSec: 100,
    hideScrollbar: true,
    autoCenter: true,
    autoScroll: true,

    plugins: useMemo(() => {
      // Check if we are on client because these plugins are not available on server
      if (typeof window === "undefined") return [];

      // Import the plugins
      const Timeline = require("wavesurfer.js/dist/plugins/timeline.esm.js");
      const Minimap = require("wavesurfer.js/dist/plugins/minimap.esm.js");
      const Hover = require("wavesurfer.js/dist/plugins/hover.esm.js");

      return [
        Timeline.create(),
        Minimap.create({
          height: 20,
          waveColor: "#ddd",
          progressColor: "#999",
          // the Minimap takes all the same options as the WaveSurfer itself
          plugins: [Timeline.create(), Hover.create()],
        }),
        Hover.create({
          lineColor: "#ff0000",
          lineWidth: 2,
          labelBackground: "#555",
          labelColor: "#fff",
          labelSize: "11px",
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
    wavesurfer.on("play", async () => {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      // Check if source has not been created yet and create it
      if (audioElementRef.current && !audioSource.current) {
        audioSource.current = audioContext.createMediaElementSource(
          audioElementRef.current
        );
        audioSource.current.connect(audioAnalyzer);
        audioAnalyzer.connect(audioContext.destination);
        audioSource.current.connect(gainNode);
        gainNode.connect(audioContext.destination);
      }
    });
  }, [audioContext, audioAnalyzer, audioSource, gainNode, wavesurfer]);

  return {
    waveformDisplayRef,
    audioElementRef,
    wavesurfer,
    isPlaying,
    currentTime,
  };
}

export default useWavesurferSetup;
