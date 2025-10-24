// Performance Recorder Zustand Store
// Subscribes to the profiler store and records performance snapshots

import { create } from 'zustand';
import {
  deleteRecordingSession as deleteRecordingSessionFromDB,
  loadAllRecordingSessions,
  saveRecordingSession,
  updateRecordingSession,
} from '../idb-performance-storage';
import type {
  ExportConfig,
  RecorderState,
  RecordingOptions,
  RecordingSession,
  SessionStatistics,
} from './performance-recorder-types';
import {
  computeSessionStatistics,
  createSessionMetadata,
  createSnapshotFromProfiler,
  downloadFile,
  generateSessionId,
  sessionToCSV,
  sessionToJSON,
} from './performance-recorder-utils';
import useProfilerStore from './profiler-store';

const useRecorderStore = create<RecorderState>((set, get) => {
  // Interval reference for taking snapshots
  let snapshotInterval: NodeJS.Timeout | null = null;
  let autoStopTimeout: NodeJS.Timeout | null = null;

  return {
    // Initial state
    isRecording: false,
    isPaused: false,
    currentSession: null,
    sessions: [],
    isLoading: false,
    sampleRate: 500, // 500ms default
    autoSaveEnabled: true,

    // ============================================
    // Recording Control Actions
    // ============================================

    startRecording: (name: string, options: RecordingOptions = {}) => {
      // Check if profiler is enabled
      const profilerEnabled = useProfilerStore.getState().enabled;
      if (!profilerEnabled) {
        console.warn(
          'Performance Profiler must be enabled to start recording. Enable it from View > Performance Profiler.',
        );
        return;
      }

      // Check if already recording
      if (get().isRecording) {
        console.warn('Already recording. Stop current recording first.');
        return;
      }

      // Get GPU info from profiler
      const gpuRenderer = useProfilerStore.getState().gpu.renderer;

      // Create new session
      const session: RecordingSession = {
        id: generateSessionId(),
        name,
        description: options.description || '',
        tags: options.tags || [],
        startTime: Date.now(),
        endTime: null,
        duration: 0,
        sampleRate: options.sampleRate || get().sampleRate,
        snapshots: [],
        metadata: createSessionMetadata(gpuRenderer),
      };

      // Take initial snapshot
      const profilerState = useProfilerStore.getState();
      const initialSnapshot = createSnapshotFromProfiler(profilerState);
      session.snapshots.push(initialSnapshot);

      // Start snapshot interval
      const rate = session.sampleRate;
      snapshotInterval = setInterval(() => {
        if (get().isPaused) return; // Skip if paused

        const profilerState = useProfilerStore.getState();
        const snapshot = createSnapshotFromProfiler(profilerState);

        set((state) => {
          if (!state.currentSession) return state;

          return {
            currentSession: {
              ...state.currentSession,
              snapshots: [...state.currentSession.snapshots, snapshot],
              duration: Date.now() - state.currentSession.startTime,
            },
          };
        });
      }, rate);

      set({ isRecording: true, isPaused: false, currentSession: session });

      // Set auto-stop timer if duration is specified
      if (options.duration && options.duration > 0) {
        autoStopTimeout = setTimeout(() => {
          get().stopRecording();
        }, options.duration);
        console.log(
          `Started recording: "${name}" (${rate}ms sample rate, auto-stop in ${options.duration / 1000}s)`,
        );
      } else {
        console.log(`Started recording: "${name}" (${rate}ms sample rate)`);
      }
    },

    stopRecording: async () => {
      // Clear intervals and timeouts
      if (snapshotInterval) {
        clearInterval(snapshotInterval);
        snapshotInterval = null;
      }
      if (autoStopTimeout) {
        clearTimeout(autoStopTimeout);
        autoStopTimeout = null;
      }

      const session = get().currentSession;
      if (!session) {
        console.warn('No active recording to stop');
        return;
      }

      // Take final snapshot
      const profilerState = useProfilerStore.getState();
      const finalSnapshot = createSnapshotFromProfiler(profilerState);

      // Finalize session
      const finalSession: RecordingSession = {
        ...session,
        snapshots: [...session.snapshots, finalSnapshot],
        endTime: Date.now(),
        duration: Date.now() - session.startTime,
      };

      // Save to IndexedDB if enabled
      if (get().autoSaveEnabled) {
        try {
          await saveRecordingSession(finalSession);
          console.log(`Saved recording: "${finalSession.name}" to IndexedDB`);
        } catch (error) {
          console.error('Failed to save recording session:', error);
        }
      }

      // Add to sessions list (at the beginning for newest first)
      set((state) => ({
        isRecording: false,
        isPaused: false,
        currentSession: null,
        sessions: [finalSession, ...state.sessions],
      }));

      console.log(
        `Stopped recording: "${finalSession.name}" (${finalSession.snapshots.length} snapshots, ${(finalSession.duration / 1000).toFixed(1)}s)`,
      );
    },

    pauseRecording: () => {
      if (!get().isRecording) {
        console.warn('No active recording to pause');
        return;
      }

      set({ isPaused: true });
      console.log('Recording paused');
    },

    resumeRecording: () => {
      if (!get().isRecording) {
        console.warn('No active recording to resume');
        return;
      }

      set({ isPaused: false });
      console.log('Recording resumed');
    },

    cancelRecording: () => {
      // Clear intervals and timeouts
      if (snapshotInterval) {
        clearInterval(snapshotInterval);
        snapshotInterval = null;
      }
      if (autoStopTimeout) {
        clearTimeout(autoStopTimeout);
        autoStopTimeout = null;
      }

      const session = get().currentSession;
      set({ isRecording: false, isPaused: false, currentSession: null });

      console.log(`Cancelled recording: "${session?.name || 'Unknown'}"`);
    },

    // ============================================
    // Session Management Actions
    // ============================================

    loadSessions: async () => {
      set({ isLoading: true });

      try {
        const sessions = await loadAllRecordingSessions();
        // Sort by start time (newest first)
        sessions.sort((a, b) => b.startTime - a.startTime);
        set({ sessions, isLoading: false });
        console.log(
          `Loaded ${sessions.length} recording session(s) from IndexedDB`,
        );
      } catch (error) {
        console.error('Failed to load recording sessions:', error);
        set({ isLoading: false });
      }
    },

    deleteSession: async (sessionId: string) => {
      try {
        await deleteRecordingSessionFromDB(sessionId);
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }));
        console.log(`Deleted recording session: ${sessionId}`);
      } catch (error) {
        console.error('Failed to delete recording session:', error);
      }
    },

    renameSession: async (sessionId: string, newName: string) => {
      try {
        await updateRecordingSession(sessionId, { name: newName });
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, name: newName } : s,
          ),
        }));
        console.log(`Renamed recording session: ${sessionId} to "${newName}"`);
      } catch (error) {
        console.error('Failed to rename recording session:', error);
      }
    },

    updateSessionTags: async (sessionId: string, tags: string[]) => {
      try {
        await updateRecordingSession(sessionId, { tags });
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, tags } : s,
          ),
        }));
        console.log(`Updated tags for recording session: ${sessionId}`);
      } catch (error) {
        console.error('Failed to update session tags:', error);
      }
    },

    // ============================================
    // Export Actions
    // ============================================

    exportSession: async (sessionId: string, config: ExportConfig) => {
      const session = get().sessions.find((s) => s.id === sessionId);
      if (!session) {
        console.error(`Session ${sessionId} not found`);
        return;
      }

      try {
        let content: string;
        let filename: string;
        let mimeType: string;

        if (config.format === 'csv') {
          content = sessionToCSV(session);
          filename = `${session.name.replace(/\s+/g, '_')}_${session.id}.csv`;
          mimeType = 'text/csv';
        } else {
          // JSON format
          let exportData: any = session;

          // Add statistics if requested
          if (config.includeStatistics) {
            const stats = computeSessionStatistics(session);
            exportData = {
              session,
              statistics: stats,
            };
          }

          content = sessionToJSON(exportData, config.prettyPrint ?? true);
          filename = `${session.name.replace(/\s+/g, '_')}_${session.id}.json`;
          mimeType = 'application/json';
        }

        downloadFile(filename, content, mimeType);
        console.log(
          `Exported session "${session.name}" as ${config.format.toUpperCase()}`,
        );
      } catch (error) {
        console.error('Failed to export session:', error);
      }
    },

    // ============================================
    // Settings Actions
    // ============================================

    setSampleRate: (rate: number) => {
      // Clamp between 100ms and 5000ms
      const clampedRate = Math.max(100, Math.min(5000, rate));
      set({ sampleRate: clampedRate });
      console.log(`Sample rate set to ${clampedRate}ms`);
    },

    setAutoSave: (enabled: boolean) => {
      set({ autoSaveEnabled: enabled });
      console.log(`Auto-save ${enabled ? 'enabled' : 'disabled'}`);
    },

    // ============================================
    // Statistics Actions
    // ============================================

    computeStatistics: (sessionId: string): SessionStatistics | null => {
      const session = get().sessions.find((s) => s.id === sessionId);
      if (!session) {
        console.error(`Session ${sessionId} not found`);
        return null;
      }

      return computeSessionStatistics(session);
    },
  };
});

export default useRecorderStore;
