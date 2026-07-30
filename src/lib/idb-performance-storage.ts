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

export async function updateRecordingSession(
  sessionId: string,
  updates: Partial<RecordingSession>,
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(sessionId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const session = request.result;
      if (!session) {
        reject(new Error(`Session ${sessionId} not found`));
        return;
      }

      const updateRequest = store.put({ ...session, ...updates });
      updateRequest.onerror = () => reject(updateRequest.error);
      updateRequest.onsuccess = () => resolve();
    };

    transaction.oncomplete = () => db.close();
  });
}
