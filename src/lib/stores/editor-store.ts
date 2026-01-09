// Zustand store for editor settings
import { PlayerRef } from '@remotion/player';
import { create } from 'zustand';

interface EditorStore {
  isPlaying: boolean;
  playerRef: { current: PlayerRef | null };
  playerFPS: number;
  ambientMode: boolean;
  dominantColor: string;
  resolutionMultiplier: number;
  isRhythmLabOpen: boolean;
  rhythmSelection: { start: number; end: number };
  setIsPlaying: (isPlaying: boolean) => void;
  setPlayerRef: (playerRef: { current: PlayerRef | null }) => void;
  setPlayerFPS: (fps: number) => void;
  setAmbientMode: (ambientMode: boolean) => void;
  setDominantColor: (color: string) => void;
  setResolutionMultiplier: (multiplier: number) => void;
  setIsRhythmLabOpen: (isOpen: boolean) => void;
  setRhythmSelection: (selection: { start: number; end: number }) => void;
  rehydrate: (state: Partial<EditorStore>) => void;
}

const useEditorStore = create<EditorStore>((set) => ({
  isPlaying: false,
  playerRef: { current: null },
  playerFPS: 60,
  ambientMode: false,
  dominantColor: '#fff',
  resolutionMultiplier: 1,
  isRhythmLabOpen: false,
  rhythmSelection: { start: 0, end: 0.2 },
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlayerRef: (playerRef) => set({ playerRef }),
  setPlayerFPS: (fps) => set({ playerFPS: fps }),
  setAmbientMode: (ambientMode) => set({ ambientMode }),
  setDominantColor: (color) => set({ dominantColor: color }),
  setResolutionMultiplier: (resolutionMultiplier) =>
    set({ resolutionMultiplier }),
  setIsRhythmLabOpen: (isRhythmLabOpen) => set({ isRhythmLabOpen }),
  setRhythmSelection: (rhythmSelection) => set({ rhythmSelection }),
  rehydrate: (state) => set(state),
}));

export default useEditorStore;
