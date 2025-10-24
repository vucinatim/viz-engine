// IndexedDB storage for performance recording sessions

import type { RecordingSession } from './stores/performance-recorder-types';

const DB_NAME = 'viz-engine-performance';
const DB_VERSION = 1;
const STORE_NAME = 'recording-sessions';

/**
 * Opens or creates the IndexedDB database for performance recordings
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

        // Create indexes for efficient querying
        store.createIndex('startTime', 'startTime', { unique: false });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      }
    };
  });
}

/**
 * Saves a recording session to IndexedDB
 */
export async function saveRecordingSession(
  session: RecordingSession,
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(session);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Loads all recording sessions from IndexedDB
 */
export async function loadAllRecordingSessions(): Promise<RecordingSession[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Loads a specific recording session by ID
 */
export async function loadRecordingSession(
  sessionId: string,
): Promise<RecordingSession | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(sessionId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Deletes a recording session from IndexedDB
 */
export async function deleteRecordingSession(sessionId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(sessionId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Deletes all recording sessions from IndexedDB
 */
export async function deleteAllRecordingSessions(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Updates a recording session (partial update)
 */
export async function updateRecordingSession(
  sessionId: string,
  updates: Partial<RecordingSession>,
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(sessionId);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const session = getRequest.result;
      if (!session) {
        reject(new Error(`Session ${sessionId} not found`));
        return;
      }

      // Merge updates
      const updatedSession = { ...session, ...updates };
      const putRequest = store.put(updatedSession);

      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve();
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Gets sessions filtered by tags
 */
export async function getSessionsByTags(
  tags: string[],
): Promise<RecordingSession[]> {
  const allSessions = await loadAllRecordingSessions();

  // Filter sessions that have at least one matching tag
  return allSessions.filter((session) =>
    session.tags.some((tag) => tags.includes(tag)),
  );
}

/**
 * Gets sessions within a time range
 */
export async function getSessionsByTimeRange(
  startTime: number,
  endTime: number,
): Promise<RecordingSession[]> {
  const allSessions = await loadAllRecordingSessions();

  return allSessions.filter(
    (session) => session.startTime >= startTime && session.startTime <= endTime,
  );
}

/**
 * Gets the total size of all recording sessions in bytes (approximate)
 */
export async function getStorageSize(): Promise<number> {
  const sessions = await loadAllRecordingSessions();
  const jsonString = JSON.stringify(sessions);
  return new Blob([jsonString]).size;
}

/**
 * Gets storage statistics
 */
export async function getStorageStats(): Promise<{
  sessionCount: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  oldestSession: RecordingSession | null;
  newestSession: RecordingSession | null;
}> {
  const sessions = await loadAllRecordingSessions();

  if (sessions.length === 0) {
    return {
      sessionCount: 0,
      totalSizeBytes: 0,
      totalSizeMB: 0,
      oldestSession: null,
      newestSession: null,
    };
  }

  const totalSizeBytes = await getStorageSize();
  const sorted = [...sessions].sort((a, b) => a.startTime - b.startTime);

  return {
    sessionCount: sessions.length,
    totalSizeBytes,
    totalSizeMB: totalSizeBytes / (1024 * 1024),
    oldestSession: sorted[0],
    newestSession: sorted[sorted.length - 1],
  };
}
