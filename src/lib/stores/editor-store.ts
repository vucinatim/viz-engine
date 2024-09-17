// Zustand store for editor settings
import { PlayerRef } from "@remotion/player";
import { create } from "zustand";

interface EditorStore {
  playerRef: { current: PlayerRef | null };
  playerFPS: number;
  ambientMode: boolean;
  dominantColor: string;
  setPlayerRef: (playerRef: { current: PlayerRef | null }) => void;
  setPlayerFPS: (fps: number) => void;
  setAmbientMode: (ambientMode: boolean) => void;
  setDominantColor: (color: string) => void;
}

const useEditorStore = create<EditorStore>((set) => ({
  playerRef: { current: null },
  playerFPS: 60,
  ambientMode: false,
  dominantColor: "#fff",
  setPlayerRef: (playerRef) => set({ playerRef }),
  setPlayerFPS: (fps) => set({ playerFPS: fps }),
  setAmbientMode: (ambientMode) => set({ ambientMode }),
  setDominantColor: (color) => set({ dominantColor: color }),
}));

export default useEditorStore;
