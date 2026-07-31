import { create } from 'zustand';

type AudioSourceNode =
  MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null;

interface AudioSourceLoadState {
  status: 'idle' | 'loading' | 'error';
  label: string | null;
  message: string | null;
}

interface AudioEngineStore {
  audioBuffer: AudioBuffer | null;
  audioSource: { current: AudioSourceNode };
  elementAudioSource: MediaElementAudioSourceNode | null;
  audioContext: AudioContext | null;
  audioAnalyzer: AnalyserNode | null;
  gainNode: GainNode | null;
  volume: number;
  audioElementRef: { current: HTMLAudioElement | null };
  elementUrl: string | null;
  ownedObjectUrl: string | null;
  sourceLoad: AudioSourceLoadState;
  tabCaptureStream: MediaStream | null;
  setAudioBuffer: (audioBuffer: AudioBuffer | null) => void;
  setAudioContext: (audioContext: AudioContext) => void;
  setAnalyzer: (analyzer: AnalyserNode) => void;
  setGainNode: (gainNode: GainNode) => void;
  setAudioElementRef: (audioElementRef: {
    current: HTMLAudioElement | null;
  }) => void;
  setAudioSource: (node: AudioSourceNode) => void;
  setElementAudioSource: (node: MediaElementAudioSourceNode) => void;
  setTabCaptureStream: (stream: MediaStream | null) => void;
  setLiveVolume: (volume: number) => void;
  commitVolume: (volume: number) => void;
  loadAudioUrl: (url: string, ownedObjectUrl?: string) => void;
  beginSourceLoad: (label: string) => void;
  finishSourceLoad: () => void;
  failSourceLoad: (label: string, message: string) => void;
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

const clampVolume = (volume: number) => Math.max(0, Math.min(1, volume));

const useAudioEngineStore = create<AudioEngineStore>((set, get) => ({
  audioBuffer: null,
  audioSource: { current: null },
  elementAudioSource: null,
  audioContext: null,
  audioAnalyzer: null,
  gainNode: null,
  volume: 1,
  audioElementRef: { current: null },
  elementUrl: null,
  ownedObjectUrl: null,
  sourceLoad: { status: 'idle', label: null, message: null },
  tabCaptureStream: null,
  setAudioBuffer: (audioBuffer) => set({ audioBuffer }),
  setAudioContext: (audioContext) => set({ audioContext }),
  setAnalyzer: (audioAnalyzer) => set({ audioAnalyzer }),
  setGainNode: (gainNode) => {
    gainNode.gain.value = get().volume;
    set({ gainNode });
  },
  setAudioElementRef: (audioElementRef) => {
    set({ audioElementRef });
    const audioElement = audioElementRef.current;
    const elementUrl = get().elementUrl;
    if (audioElement && elementUrl) {
      resetElementSource(audioElement, elementUrl);
    }
  },
  setAudioSource: (node) => set({ audioSource: { current: node } }),
  setElementAudioSource: (elementAudioSource) =>
    set({
      elementAudioSource,
      audioSource: { current: elementAudioSource },
    }),
  setTabCaptureStream: (tabCaptureStream) => set({ tabCaptureStream }),
  setLiveVolume: (volume) => {
    const nextVolume = clampVolume(volume);
    const { audioContext, gainNode } = get();
    if (!gainNode) return;
    gainNode.gain.setValueAtTime(
      nextVolume,
      audioContext?.currentTime ?? gainNode.context.currentTime,
    );
  },
  commitVolume: (volume) => {
    const nextVolume = clampVolume(volume);
    get().setLiveVolume(nextVolume);
    set({ volume: nextVolume });
  },
  beginSourceLoad: (label) =>
    set({ sourceLoad: { status: 'loading', label, message: null } }),
  finishSourceLoad: () =>
    set({ sourceLoad: { status: 'idle', label: null, message: null } }),
  failSourceLoad: (label, message) =>
    set({ sourceLoad: { status: 'error', label, message } }),
  loadAudioUrl: (url, ownedObjectUrl) => {
    const previousObjectUrl = get().ownedObjectUrl;
    if (previousObjectUrl && previousObjectUrl !== ownedObjectUrl) {
      URL.revokeObjectURL(previousObjectUrl);
    }
    set({ elementUrl: url, ownedObjectUrl: ownedObjectUrl ?? null });
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
    const ownedObjectUrl = get().ownedObjectUrl;
    if (ownedObjectUrl) URL.revokeObjectURL(ownedObjectUrl);
    set({ elementUrl: null, ownedObjectUrl: null });
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
    const ownedObjectUrl = get().ownedObjectUrl;
    if (ownedObjectUrl && typeof URL !== 'undefined') {
      URL.revokeObjectURL(ownedObjectUrl);
    }
    set({
      audioBuffer: null,
      audioSource: { current: null },
      elementAudioSource: null,
      audioContext: null,
      audioAnalyzer: null,
      gainNode: null,
      volume: 1,
      elementUrl: null,
      ownedObjectUrl: null,
      sourceLoad: { status: 'idle', label: null, message: null },
      tabCaptureStream: null,
    });
  },
}));

export default useAudioEngineStore;
