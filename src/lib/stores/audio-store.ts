// Zustand store for audio files and audio context
import WaveSurfer from 'wavesurfer.js';
import { create } from 'zustand';

interface AudioStore {
  audioFile: File | null;
  audioSource: {
    current: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null;
  };
  audioContext: AudioContext | null;
  audioAnalyzer: AnalyserNode | null;
  gainNode: GainNode | null;
  wavesurfer: WaveSurfer | null;
  currentTrackUrl: string | null;
  audioElementRef: { current: HTMLAudioElement | null };
  waveformDisplayRef: { current: HTMLDivElement | null };
  tabCaptureStream: MediaStream | null;
  isCapturingTab: boolean;
  captureLabel: string | null;
  setAudioFile: (audioFile: File) => void;
  setAudioContext: (audioContext: AudioContext) => void;
  setAnalyzer: (analyzer: AnalyserNode) => void;
  setGainNode: (gainNode: GainNode) => void;
  setWavesurfer: (wavesurfer: WaveSurfer) => void;
  setCurrentTrackUrl: (url: string | null) => void;
  setAudioElementRef: (audioElementRef: {
    current: HTMLAudioElement | null;
  }) => void;
  setWaveformDisplayRef: (displayElementRef: {
    current: HTMLDivElement | null;
  }) => void;
  setAudioSource: (
    node: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null,
  ) => void;
  setTabCaptureStream: (stream: MediaStream | null) => void;
  setIsCapturingTab: (isCapturing: boolean) => void;
  setCaptureLabel: (label: string | null) => void;
}

const useAudioStore = create<AudioStore>((set, get) => ({
  audioFile: null,
  audioSource: { current: null },
  audioContext: null,
  audioAnalyzer: null,
  gainNode: null,
  wavesurfer: null,
  currentTrackUrl: null,
  audioElementRef: { current: null },
  waveformDisplayRef: { current: null },
  tabCaptureStream: null,
  isCapturingTab: false,
  captureLabel: null,
  setAudioFile: (audioFile) => set({ audioFile }),
  setAudioContext: (audioContext) => set({ audioContext }),
  setAnalyzer: (analyzer) => set({ audioAnalyzer: analyzer }),
  setGainNode: (gainNode) => set({ gainNode }),
  setWavesurfer: (wavesurfer) => set({ wavesurfer }),
  setCurrentTrackUrl: (currentTrackUrl) => set({ currentTrackUrl }),
  setAudioElementRef: (audioElementRef) => set({ audioElementRef }),
  setWaveformDisplayRef: (displayElementRef) =>
    set({ waveformDisplayRef: displayElementRef }),
  setAudioSource: (node) => set({ audioSource: { current: node } }),
  setTabCaptureStream: (stream) => set({ tabCaptureStream: stream }),
  setIsCapturingTab: (isCapturingTab) => set({ isCapturingTab }),
  setCaptureLabel: (captureLabel) => set({ captureLabel }),
}));

export default useAudioStore;
