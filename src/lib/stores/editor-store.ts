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
  setIsPlaying: (isPlaying: boolean) => void;
  setPlayerRef: (playerRef: { current: PlayerRef | null }) => void;
  setPlayerFPS: (fps: number) => void;
  setAmbientMode: (ambientMode: boolean) => void;
  setDominantColor: (color: string) => void;
  setResolutionMultiplier: (multiplier: number) => void;
  rehydrate: (state: Partial<EditorStore>) => void;
}

const useEditorStore = create<EditorStore>((set) => ({
  isPlaying: false,
  playerRef: { current: null },
  playerFPS: 60,
  ambientMode: false,
  dominantColor: '#fff',
  resolutionMultiplier: 1,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlayerRef: (playerRef) => set({ playerRef }),
  setPlayerFPS: (fps) => set({ playerFPS: fps }),
  setAmbientMode: (ambientMode) => set({ ambientMode }),
  setDominantColor: (color) => set({ dominantColor: color }),
  setResolutionMultiplier: (resolutionMultiplier) =>
    set({ resolutionMultiplier }),
  rehydrate: (state) => set(state),
}));

export default useEditorStore;
