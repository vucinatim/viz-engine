// Zustand store for editor settings
import { create } from "zustand";

interface EditorStore {
  ambientMode: boolean;
  setAmbientMode: (ambientMode: boolean) => void;
}

const useEditorStore = create<EditorStore>((set) => ({
  ambientMode: false,
  setAmbientMode: (ambientMode) => set({ ambientMode }),
}));

export default useEditorStore;
