import { useEffect, useRef } from "react";
import useAudioStore from "@/lib/stores/audio-store";

const AudioPlayer = () => {
  const {
    audioFile,
    audioContext,
    audioAnalyzer,
    setAudioContext,
    setAnalyzer,
  } = useAudioStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const ac = new AudioContext();
    const an = ac.createAnalyser();
    setAudioContext(ac);
    setAnalyzer(an);

    return () => {
      ac.close();
    };
  }, [setAnalyzer, setAudioContext]);

  useEffect(() => {
    if (!audioFile) return;

    const objectUrl = URL.createObjectURL(audioFile);
    audioRef.current!.src = objectUrl;

    // Clean up URL when the component unmounts or file changes
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [audioFile]);

  const handlePlay = async () => {
    if (!audioContext || !audioAnalyzer) return;

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    if (audioRef.current && !sourceRef.current) {
      // Check if source has not been created
      sourceRef.current = audioContext.createMediaElementSource(
        audioRef.current
      );
      sourceRef.current.connect(audioAnalyzer);
      audioAnalyzer.connect(audioContext.destination);
    }
  };

  return <audio ref={audioRef} onPlay={handlePlay} controls />;
};

export default AudioPlayer;
