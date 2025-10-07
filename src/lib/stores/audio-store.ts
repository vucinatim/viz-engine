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
  // Track list management
  trackList: string[];
  currentTrackIndex: number;
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
  // Track navigation
  setTrackList: (tracks: string[]) => void;
  setCurrentTrackIndex: (index: number) => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
  restartTrack: () => void;
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
  trackList: [],
  currentTrackIndex: -1,
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
  setTrackList: (trackList) => set({ trackList }),
  setCurrentTrackIndex: (currentTrackIndex) => set({ currentTrackIndex }),
  skipToNext: () => {
    const { trackList, currentTrackIndex, audioElementRef, wavesurfer } = get();
    if (trackList.length === 0) return;

    const nextIndex = (currentTrackIndex + 1) % trackList.length;
    const nextTrack = trackList[nextIndex];
    const url = `/music/${nextTrack}`;

    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null as any;
      audioElementRef.current.src = url;
      audioElementRef.current.muted = false;
      audioElementRef.current.load();
    }
    wavesurfer?.load(url);
    set({ currentTrackIndex: nextIndex, currentTrackUrl: url });
  },
  skipToPrevious: () => {
    const { trackList, currentTrackIndex, audioElementRef, wavesurfer } = get();
    if (trackList.length === 0) return;

    // If we're past 3 seconds, restart current track
    const currentTime = audioElementRef.current?.currentTime || 0;
    if (currentTime > 3) {
      if (audioElementRef.current) {
        audioElementRef.current.currentTime = 0;
      }
      wavesurfer?.seekTo(0);
      return;
    }

    // Otherwise go to previous track
    const prevIndex =
      currentTrackIndex <= 0 ? trackList.length - 1 : currentTrackIndex - 1;
    const prevTrack = trackList[prevIndex];
    const url = `/music/${prevTrack}`;

    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null as any;
      audioElementRef.current.src = url;
      audioElementRef.current.muted = false;
      audioElementRef.current.load();
    }
    wavesurfer?.load(url);
    set({ currentTrackIndex: prevIndex, currentTrackUrl: url });
  },
  restartTrack: () => {
    const { audioElementRef, wavesurfer } = get();
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = 0;
    }
    wavesurfer?.seekTo(0);
  },
}));

export default useAudioStore;
