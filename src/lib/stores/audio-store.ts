// Zustand store for audio files and audio context
import WaveSurfer from "wavesurfer.js";
import { create } from "zustand";

interface AudioStore {
  audioFile: File | null;
  audioSource: { current: MediaElementAudioSourceNode | null };
  audioContext: AudioContext | null;
  audioAnalyzer: AnalyserNode | null;
  gainNode: GainNode | null;
  wavesurfer: WaveSurfer | null;
  setAudioFile: (audioFile: File) => void;
  setAudioContext: (audioContext: AudioContext) => void;
  setAnalyzer: (analyzer: AnalyserNode) => void;
  setGainNode: (gainNode: GainNode) => void;
  setWavesurfer: (wavesurfer: WaveSurfer) => void;
}

const useAudioStore = create<AudioStore>((set) => ({
  audioFile: null,
  audioSource: { current: null },
  audioContext: null,
  audioAnalyzer: null,
  gainNode: null,
  wavesurfer: null,
  setAudioFile: (audioFile) => set({ audioFile }),
  setAudioContext: (audioContext) => set({ audioContext }),
  setAnalyzer: (analyzer) => set({ audioAnalyzer: analyzer }),
  setGainNode: (gainNode) => set({ gainNode }),
  setWavesurfer: (wavesurfer) => set({ wavesurfer }),
}));

export default useAudioStore;
