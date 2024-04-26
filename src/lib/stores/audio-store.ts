// Zustand store for audio files and audio context
import { create } from "zustand";

interface AudioStore {
  audioFile: File | null;
  audioContext: AudioContext | null;
  audioAnalyzer: AnalyserNode | null;
  setAudioFile: (audioFile: File) => void;
  setAudioContext: (audioContext: AudioContext) => void;
  setAnalyzer: (analyzer: AnalyserNode) => void;
}

const useAudioStore = create<AudioStore>((set) => ({
  audioFile: null,
  audioContext: null,
  audioAnalyzer: null,
  setAudioFile: (audioFile) => set({ audioFile }),
  setAudioContext: (audioContext) => set({ audioContext }),
  setAnalyzer: (analyzer) => set({ audioAnalyzer: analyzer }),
}));

export default useAudioStore;
