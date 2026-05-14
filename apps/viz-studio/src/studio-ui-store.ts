import { create } from "zustand";

interface StudioUiState {
  ambientMode: boolean;
  resolutionMultiplier: number;
  setAmbientMode: (ambientMode: boolean) => void;
  setResolutionMultiplier: (resolutionMultiplier: number) => void;
}

export const useStudioUiStore = create<StudioUiState>((set) => ({
  ambientMode: false,
  resolutionMultiplier: 1,
  setAmbientMode: (ambientMode) => set({ ambientMode }),
  setResolutionMultiplier: (resolutionMultiplier) =>
    set({ resolutionMultiplier }),
}));
