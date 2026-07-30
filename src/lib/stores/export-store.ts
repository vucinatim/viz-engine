import { create } from 'zustand';

export interface ExportSettings {
  fps: number;
  width: number;
  height: number;
  startTime: number;
  duration: number;
  format: 'mp4' | 'webm';
  quality: 'high' | 'medium' | 'low';
}

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  phase: 'idle' | 'preparing' | 'rendering' | 'encoding' | 'complete' | 'error';
  message: string;
  percentage: number;
  elapsedTime: number;
}

export interface ExportLog {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error' | 'perf';
  message: string;
  details?: string;
  duration?: number;
}

interface ExportStore {
  isExporting: boolean;
  progress: ExportProgress;
  settings: ExportSettings;
  error: string | null;
  logs: ExportLog[];
  setIsExporting: (isExporting: boolean) => void;
  setProgress: (progress: Partial<ExportProgress>) => void;
  setSettings: (settings: Partial<ExportSettings>) => void;
  setError: (error: string | null) => void;
  resetExport: () => void;
  addLog: (log: Omit<ExportLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

const defaultSettings: ExportSettings = {
  fps: 60,
  width: 1920,
  height: 1080,
  startTime: 0,
  duration: 30,
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
  error: null,
  logs: [],

  setIsExporting: (isExporting) => set({ isExporting }),

  setProgress: (progressUpdate) => {
    const currentProgress = get().progress;
    const newProgress = { ...currentProgress, ...progressUpdate };

    let percentage = 0;

    if (progressUpdate.percentage !== undefined) {
      percentage = progressUpdate.percentage;
    } else if (newProgress.totalFrames > 0) {
      switch (newProgress.phase) {
        case 'preparing':
          percentage = 5;
          break;
        case 'rendering':
          percentage =
            5 + (newProgress.currentFrame / newProgress.totalFrames) * 80;
          break;
        case 'encoding':
          percentage = 90;
          break;
        case 'complete':
          percentage = 100;
          break;
        default:
          percentage = 0;
      }
    }

    percentage = Math.min(100, Math.max(0, percentage));

    if (percentage < currentProgress.percentage) {
      percentage = currentProgress.percentage;
    }

    newProgress.percentage = percentage;
    set({ progress: newProgress });
  },

  setSettings: (settingsUpdate) => {
    const currentSettings = get().settings;
    set({ settings: { ...currentSettings, ...settingsUpdate } });
  },

  setError: (error) => set({ error }),

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
      error: null,
      logs: [],
    }),
}));

export default useExportStore;
