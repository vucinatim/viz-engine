// Zustand store for video export state
import { create } from 'zustand';

export interface ExportSettings {
  fps: number;
  width: number;
  height: number;
  startTime: number; // in seconds
  duration: number; // in seconds
  format: 'mp4' | 'webm';
  quality: 'high' | 'medium' | 'low';
}

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  phase: 'idle' | 'preparing' | 'rendering' | 'encoding' | 'complete' | 'error';
  message: string;
  percentage: number;
  elapsedTime: number; // in seconds
}

export interface ExportLog {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error' | 'perf';
  message: string;
  details?: string;
  duration?: number; // milliseconds for performance logs
}

// Audio frame data for offline rendering
export interface ExportAudioFrameData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  sampleRate: number;
  fftSize: number;
}

interface ExportStore {
  // Export state
  isExporting: boolean;
  progress: ExportProgress;
  settings: ExportSettings;

  // Captured frames storage
  capturedFrames: Blob[];

  // Error handling
  error: string | null;

  // Cancellation flag
  shouldCancel: boolean;

  // Logging
  logs: ExportLog[];

  // Offline audio data for current frame
  currentOfflineAudioData: ExportAudioFrameData | null;

  // Actions
  setIsExporting: (isExporting: boolean) => void;
  setProgress: (progress: Partial<ExportProgress>) => void;
  setSettings: (settings: Partial<ExportSettings>) => void;
  addCapturedFrame: (frame: Blob) => void;
  clearCapturedFrames: () => void;
  setError: (error: string | null) => void;
  setShouldCancel: (shouldCancel: boolean) => void;
  setCurrentOfflineAudioData: (data: ExportAudioFrameData | null) => void;
  resetExport: () => void;
  addLog: (log: Omit<ExportLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

const defaultSettings: ExportSettings = {
  fps: 60,
  width: 1920,
  height: 1080,
  startTime: 0, // Start from beginning
  duration: 30, // 30 seconds default
  format: 'mp4',
  quality: 'high',
};

const defaultProgress: ExportProgress = {
  currentFrame: 0,
  totalFrames: 0,
  phase: 'idle',
  message: '',
  percentage: 0,
  elapsedTime: 0,
};

const useExportStore = create<ExportStore>((set, get) => ({
  isExporting: false,
  progress: defaultProgress,
  settings: defaultSettings,
  capturedFrames: [],
  error: null,
  shouldCancel: false,
  logs: [],
  currentOfflineAudioData: null,

  setIsExporting: (isExporting) => set({ isExporting }),

  setProgress: (progressUpdate) => {
    const currentProgress = get().progress;
    const newProgress = { ...currentProgress, ...progressUpdate };

    // Calculate percentage based on phase and frame count
    let percentage = 0;
    if (newProgress.totalFrames > 0) {
      switch (newProgress.phase) {
        case 'preparing':
          percentage = 5;
          break;
        case 'rendering':
          percentage =
            5 + (newProgress.currentFrame / newProgress.totalFrames) * 80;
          break;
        case 'encoding':
          percentage = 85 + 10; // Encoding is typically quick with modern codecs
          break;
        case 'complete':
          percentage = 100;
          break;
        default:
          percentage = 0;
      }
    }

    newProgress.percentage = Math.min(100, Math.max(0, percentage));
    set({ progress: newProgress });
  },

  setSettings: (settingsUpdate) => {
    const currentSettings = get().settings;
    set({ settings: { ...currentSettings, ...settingsUpdate } });
  },

  addCapturedFrame: (frame) => {
    set((state) => ({
      capturedFrames: [...state.capturedFrames, frame],
    }));
  },

  clearCapturedFrames: () => set({ capturedFrames: [] }),

  setError: (error) => set({ error }),

  setShouldCancel: (shouldCancel) => set({ shouldCancel }),

  setCurrentOfflineAudioData: (currentOfflineAudioData) =>
    set({ currentOfflineAudioData }),

  addLog: (log) => {
    const newLog: ExportLog = {
      ...log,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };
    set((state) => ({
      logs: [...state.logs, newLog],
    }));
  },

  clearLogs: () => set({ logs: [] }),

  resetExport: () =>
    set({
      isExporting: false,
      progress: defaultProgress,
      capturedFrames: [],
      error: null,
      shouldCancel: false,
      logs: [],
      currentOfflineAudioData: null,
    }),
}));

export default useExportStore;
