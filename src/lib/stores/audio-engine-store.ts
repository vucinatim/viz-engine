import { create } from 'zustand';

type AudioSourceNode =
  MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null;

interface AudioEngineStore {
  audioBuffer: AudioBuffer | null;
  audioSource: { current: AudioSourceNode };
  audioContext: AudioContext | null;
  audioAnalyzer: AnalyserNode | null;
  gainNode: GainNode | null;
  audioElementRef: { current: HTMLAudioElement | null };
  elementUrl: string | null;
  tabCaptureStream: MediaStream | null;
  setAudioBuffer: (audioBuffer: AudioBuffer | null) => void;
  setAudioContext: (audioContext: AudioContext) => void;
  setAnalyzer: (analyzer: AnalyserNode) => void;
  setGainNode: (gainNode: GainNode) => void;
  setAudioElementRef: (audioElementRef: {
    current: HTMLAudioElement | null;
  }) => void;
  setAudioSource: (node: AudioSourceNode) => void;
  setTabCaptureStream: (stream: MediaStream | null) => void;
  loadAudioUrl: (url: string) => void;
  attachStreamToElement: (stream: MediaStream) => Promise<void>;
  clearElementSource: () => void;
  restoreElementUrl: (url: string | null) => void;
  seekElementToTime: (seconds: number) => void;
  getElementCurrentTime: () => number;
  reset: () => void;
}

const resetElementSource = (
  audioElement: HTMLAudioElement,
  nextUrl: string | null,
) => {
  audioElement.srcObject = null as never;

  if (nextUrl) {
    audioElement.src = nextUrl;
    audioElement.muted = false;
  } else {
    audioElement.removeAttribute('src');
  }

  audioElement.load();
};

const useAudioEngineStore = create<AudioEngineStore>((set, get) => ({
  audioBuffer: null,
  audioSource: { current: null },
  audioContext: null,
  audioAnalyzer: null,
  gainNode: null,
  audioElementRef: { current: null },
  elementUrl: null,
  tabCaptureStream: null,
  setAudioBuffer: (audioBuffer) => set({ audioBuffer }),
  setAudioContext: (audioContext) => set({ audioContext }),
  setAnalyzer: (audioAnalyzer) => set({ audioAnalyzer }),
  setGainNode: (gainNode) => set({ gainNode }),
  setAudioElementRef: (audioElementRef) => {
    set({ audioElementRef });
    const audioElement = audioElementRef.current;
    const elementUrl = get().elementUrl;
    if (audioElement && elementUrl) {
      resetElementSource(audioElement, elementUrl);
    }
  },
  setAudioSource: (node) => set({ audioSource: { current: node } }),
  setTabCaptureStream: (tabCaptureStream) => set({ tabCaptureStream }),
  loadAudioUrl: (url) => {
    set({ elementUrl: url });
    const audioElement = get().audioElementRef.current;

    if (!audioElement) {
      return;
    }

    resetElementSource(audioElement, url);
  },
  attachStreamToElement: async (stream) => {
    set({ elementUrl: null });
    const audioElement = get().audioElementRef.current;

    if (!audioElement) {
      return;
    }

    audioElement.pause();
    audioElement.removeAttribute('src');
    audioElement.srcObject = stream;
    audioElement.muted = true;
    audioElement.load();
    await audioElement.play().catch(() => {});
  },
  clearElementSource: () => {
    set({ elementUrl: null });
    const audioElement = get().audioElementRef.current;

    if (!audioElement) {
      return;
    }

    audioElement.pause();
    resetElementSource(audioElement, null);
  },
  restoreElementUrl: (url) => {
    set({ elementUrl: url });
    const audioElement = get().audioElementRef.current;

    if (!audioElement) {
      return;
    }

    audioElement.pause();
    resetElementSource(audioElement, url);
  },
  seekElementToTime: (seconds) => {
    const audioElement = get().audioElementRef.current;

    if (!audioElement) {
      return;
    }

    audioElement.currentTime = Math.max(0, seconds);
  },
  getElementCurrentTime: () => {
    return get().audioElementRef.current?.currentTime ?? 0;
  },
  reset: () => {
    set({
      audioBuffer: null,
      audioSource: { current: null },
      audioContext: null,
      audioAnalyzer: null,
      gainNode: null,
      elementUrl: null,
      tabCaptureStream: null,
    });
  },
}));

export default useAudioEngineStore;
